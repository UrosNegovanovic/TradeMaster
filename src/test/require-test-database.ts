import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function readDotEnvValue(key: string): string | null {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) {
    return null
  }

  const match = readFileSync(envPath, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))
  if (!match) {
    return null
  }

  return match[1].trim().replace(/^["']|["']$/g, '')
}

function hostOf(url: string): string | null {
  try {
    return new URL(url.replace(/^postgresql:/, 'http:')).host
  } catch {
    return null
  }
}

export function ensureTestDatabaseUrl(): string {
  const testUrl = process.env.TEST_DATABASE_URL?.trim()
  if (!testUrl) {
    throw new Error(
      'TEST_DATABASE_URL must be set to a dedicated test database. Refusing to run DB tests.'
    )
  }

  const processAppUrl = process.env.DATABASE_URL?.trim()
  const fileAppUrl = readDotEnvValue('DATABASE_URL')
  const appUrls = [processAppUrl, fileAppUrl].filter((value): value is string => Boolean(value))

  if (appUrls.some((appUrl) => appUrl === testUrl)) {
    throw new Error(
      'TEST_DATABASE_URL matches the application DATABASE_URL. Refusing to run DB tests.'
    )
  }

  const testHost = hostOf(testUrl)
  if (testHost && appUrls.some((appUrl) => hostOf(appUrl) === testHost)) {
    throw new Error(
      'TEST_DATABASE_URL points at the same database host as DATABASE_URL. Refusing to run DB tests.'
    )
  }

  process.env.DATABASE_URL = testUrl
  process.env.DIRECT_URL = testUrl
  return testUrl
}
