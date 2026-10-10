/**
 * E2E target and safety rules, read once by playwright.config.ts and by the tests.
 *
 * Hard rules (docs/STATUS.md, CLAUDE.md):
 * - Tests never sign in with a live Clerk key (sk_live_): real customers live there.
 * - Tests that create or change data (@writes) run only against hosts explicitly allowed for writes:
 *   localhost by default, plus E2E_WRITE_HOSTS. Production is read-only smoke.
 * - On localhost, writes need the app to run on the test database (E2E_DATABASE_URL, ROADMAP A10.2);
 *   E2E_ALLOW_LIVE_DB_WRITES=1 is the owner's explicit opt-in for the app's own database.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

export type E2eEnv = {
  baseURL: string
  host: string
  isLocal: boolean
  signedInEnabled: boolean
  writesAllowed: boolean
  writesBlockedReason: string | null
  userEmail: string | null
  vercelBypassSecret: string | null
  webkit: boolean
  /** Test database the local app runs on (scripts/test-db.mjs), or null. */
  databaseUrl: string | null
}

function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

export function e2eEnv(source: NodeJS.ProcessEnv = process.env): E2eEnv {
  const baseURL = (source.E2E_BASE_URL?.trim() || 'http://localhost:3000').replace(/\/+$/, '')
  const host = new URL(baseURL).hostname.toLowerCase()
  const isLocal = LOCAL_HOSTS.has(host)
  const secret = source.CLERK_SECRET_KEY?.trim() ?? ''
  const userEmail = source.E2E_USER_EMAIL?.trim() || null
  const liveClerk = secret.startsWith('sk_live_')
  const signedInEnabled = Boolean(userEmail && secret.startsWith('sk_test_'))

  let writesBlockedReason: string | null = null
  if (!signedInEnabled) writesBlockedReason = 'no signed-in E2E user (E2E_USER_EMAIL + sk_test_ CLERK_SECRET_KEY)'
  else if (source.E2E_ALLOW_WRITES !== '1') writesBlockedReason = 'E2E_ALLOW_WRITES is not 1'
  else if (!isLocal && !list(source.E2E_WRITE_HOSTS).includes(host)) {
    writesBlockedReason = `host ${host} is not in E2E_WRITE_HOSTS`
  } else if (isLocal && !source.E2E_DATABASE_URL?.trim() && source.E2E_ALLOW_LIVE_DB_WRITES !== '1') {
    writesBlockedReason = 'local app is not on the test database (set E2E_DATABASE_URL, see e2e/README.md)'
  }

  return {
    baseURL,
    host,
    isLocal,
    signedInEnabled: signedInEnabled && !liveClerk,
    writesAllowed: writesBlockedReason === null && !liveClerk,
    writesBlockedReason: liveClerk ? 'live Clerk key' : writesBlockedReason,
    userEmail,
    vercelBypassSecret: source.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || null,
    webkit: source.E2E_WEBKIT === '1',
    databaseUrl: source.E2E_DATABASE_URL?.trim() || null,
  }
}
