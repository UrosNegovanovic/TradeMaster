#!/usr/bin/env node
/**
 * Local test database for E2E (@writes) and DB tests (ROADMAP A10.2): Postgres 17 in Docker, schema from
 * prisma/schema.prisma. Never touches the app's DATABASE_URL.
 *
 *   node scripts/test-db.mjs up      start (or reuse) the container and push the schema
 *   node scripts/test-db.mjs reset   drop all data and push the schema again
 *   node scripts/test-db.mjs down    remove the container
 *   node scripts/test-db.mjs url     print the connection string
 */
import { execSync, spawnSync } from 'node:child_process'

const NAME = 'trademaster-test-db'
const PORT = process.env.TEST_DB_PORT ?? '54329'
const DB = 'trademaster_test'
export const TEST_DB_URL = `postgresql://postgres:postgres@localhost:${PORT}/${DB}`

const run = (command, options = {}) => execSync(command, { stdio: 'pipe', encoding: 'utf8', ...options }).trim()
const exists = () => run(`docker ps -a --filter name=^/${NAME}$ --format "{{.Names}}"`) === NAME
const running = () => run(`docker ps --filter name=^/${NAME}$ --format "{{.Names}}"`) === NAME

function waitReady() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const probe = spawnSync('docker', ['exec', NAME, 'pg_isready', '-U', 'postgres', '-d', DB], { encoding: 'utf8' })
    if (probe.status === 0) return
    execSync(process.platform === 'win32' ? 'ping -n 2 127.0.0.1 > NUL' : 'sleep 1')
  }
  throw new Error('Test database did not become ready')
}

function pushSchema() {
  // The same URL for both datasource fields; --accept-data-loss is fine: this database is disposable.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DB_URL, DIRECT_URL: TEST_DB_URL },
  })
}

const command = process.argv[2] ?? 'up'
if (command === 'url') {
  console.log(TEST_DB_URL)
} else if (command === 'up') {
  if (!exists()) {
    run(`docker run -d --name ${NAME} -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=${DB} -p ${PORT}:5432 postgres:17-alpine`)
  } else if (!running()) {
    run(`docker start ${NAME}`)
  }
  waitReady()
  pushSchema()
  console.log(`Test database ready: ${TEST_DB_URL}`)
} else if (command === 'reset') {
  waitReady()
  run(`docker exec ${NAME} psql -U postgres -d ${DB} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`)
  pushSchema()
  console.log('Test database reset')
} else if (command === 'down') {
  if (exists()) run(`docker rm -f ${NAME}`)
  console.log('Test database removed')
} else {
  console.error(`Unknown command: ${command}`)
  process.exit(1)
}
