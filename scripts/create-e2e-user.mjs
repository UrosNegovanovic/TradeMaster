#!/usr/bin/env node
/**
 * Creates (or finds) the E2E test user in the Clerk *Development* instance (ROADMAP A10.2).
 * "+clerk_test" addresses are Clerk test addresses: no mail is sent and no password is needed,
 * the E2E setup signs in with a sign-in ticket. Refuses live keys.
 *
 *   node scripts/create-e2e-user.mjs [email]
 */
import { existsSync } from 'node:fs'
import { createClerkClient } from '@clerk/backend'

if (existsSync('.env')) process.loadEnvFile('.env')
const secretKey = process.env.CLERK_SECRET_KEY ?? ''
if (!secretKey.startsWith('sk_test_')) {
  console.error('CLERK_SECRET_KEY must be a Development key (sk_test_). Refusing.')
  process.exit(1)
}

const email = process.argv[2] ?? 'e2e+clerk_test@example.com'
if (!email.includes('+clerk_test@')) {
  console.error('Use a "+clerk_test" address so Clerk treats it as a test user.')
  process.exit(1)
}

const clerk = createClerkClient({ secretKey })
const existing = await clerk.users.getUserList({ emailAddress: [email] })
const list = Array.isArray(existing) ? existing : existing.data
if (list.length > 0) {
  console.log(`E2E user exists: ${email} (${list[0].id})`)
} else {
  const user = await clerk.users.createUser({
    emailAddress: [email],
    firstName: 'E2E',
    lastName: 'Test',
    skipPasswordRequirement: true,
  })
  console.log(`E2E user created: ${email} (${user.id})`)
}
