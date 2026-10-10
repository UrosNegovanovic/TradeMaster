# E2E tests (Playwright)

Browser and API tests against a running TradeMaster. Unit tests stay in Vitest (`npm run test:run`).

## Suites

| Project | Signed in | Writes | Runs where |
|---|---|---|---|
| `public-desktop`, `public-mobile` (`e2e/public`) | no | no | Locally, on every Vercel deployment (CI), production smoke |
| `setup` → `app-desktop`, `app-mobile` (`e2e/app`) | yes, E2E test user | only tests tagged `@writes` | Locally and in CI against the test database |

`public-iphone` (WebKit) is added with `E2E_WEBKIT=1`.

What they check:
- **public**: landing, legal and `/za/*` pages render with an `h1` and no sideways scroll on a phone; Clerk sign-in loads; protected APIs answer 401 JSON and app pages send signed-out visitors away; unknown catalog/invoice links return 404 and show "Katalog nije pronađen"; robots, sitemap, manifest, OG image and security headers.
- **app**: every main screen opens on desktop and phone, the "Više" menu works; `@writes`: product → issued invoice takes stock out → deleting the invoice puts it back (cleans up after itself).
- Every test fails on an uncaught page error (`support/test.ts`).

## Run

```bash
npm run e2e:public                                          # starts `npm run dev` on :3000
E2E_SERVER=start npm run e2e:public                         # production build, no first-compile delays
E2E_BASE_URL=https://trade-master-seven.vercel.app npm run e2e:public   # read-only smoke on production
npm run e2e:app                                             # signed in, needs .env.e2e (below)
npx playwright show-report                                  # HTML report with traces of failures
```

First time: `npx playwright install chromium`.

## Signed-in setup (test database, ROADMAP A10.2)

Everything that writes data runs on a throwaway Postgres in Docker, signed in as a dedicated Clerk Development test user, never on the real database or a real account.

```bash
npm run test:db:up      # Postgres 17 container "trademaster-test-db" on :54329, schema from prisma/schema.prisma
npm run e2e:user        # once: creates e2e+clerk_test@example.com in Clerk Development (no password, no mail)
cp .env.e2e.example .env.e2e   # E2E_USER_EMAIL, E2E_DATABASE_URL, E2E_ALLOW_WRITES=1
E2E_SERVER=start npm run e2e:app
TEST_DATABASE_URL=$(node scripts/test-db.mjs url) npm run test:db   # DB integration tests on the same database
npm run test:db:reset   # empty it again; npm run test:db:down removes the container
```

- With `E2E_DATABASE_URL` set, Playwright starts the app with `DATABASE_URL`/`DIRECT_URL` pointing at it and never reuses a server that is already running (it could be on the real database).
- `auth.setup.ts` signs in with a Clerk sign-in ticket (`@clerk/testing`), creates the profile (`GET /api/profile`) and saves `playwright/.auth/user.json` (gitignored). `CLERK_SECRET_KEY` (sk_test_) and the publishable key come from `.env`.
- **Writes** (`@writes`) run only with `E2E_ALLOW_WRITES=1`; on localhost only when the app is on the test database (`E2E_DATABASE_URL`), elsewhere only for hosts in `E2E_WRITE_HOSTS`; never with a live Clerk key (`support/env.ts`). `E2E_ALLOW_LIVE_DB_WRITES=1` is the owner's explicit opt-in for the app's own database (used once in trial, 2026-10-10).
- Tests never overwrite company data (`ensureCompanyProfile` fills the fake company only when something is missing), use unique "E2E …" buyers and delete what they create.
- **Service worker**: the PWA worker is blocked in tests (`serviceWorkers: 'block'`), otherwise `page.route()` cannot fake API failures.
- Known first-run flake: on a brand-new test account a parallel test may fill the company while Podešavanja hydrate (React #418/#422, recovered). Not reproducible in 52 repeated runs.

## CI

`.github/workflows/playwright.yml` runs the public suite on every successful Vercel `deployment_status` (preview and production) and on demand (`workflow_dispatch` with a URL). Previews are behind Vercel Deployment Protection: until the repo secret `VERCEL_AUTOMATION_BYPASS_SECRET` is set (Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation), preview runs are skipped with a warning; production deployments are tested. Signed-in suites and DB tests run in `.github/workflows/test-database.yml` on a Postgres service container: `db-tests` always; `e2e-app` once the repo secrets `E2E_CLERK_SECRET_KEY` (sk_test_) and `E2E_CLERK_PUBLISHABLE_KEY` exist (skipped with a warning before that).

## Writing tests

- Locators by role, label and Serbian visible text (`getByRole`, `getByLabel`); no CSS classes. If a locator is fragile, add an accessible name in the app rather than a `data-testid`.
- Set up data through the API (`page.request` carries the session), test the user path in the UI, verify through the API, clean up in `finally`.
- Unique data per test (`uniqueSku`), fake company data from `support/test-data.ts` (valid control digits, never a real company).
- Times are `Europe/Belgrade`, locale `sr-RS` in every project.
