# E2E tests (Playwright)

Browser and API tests against a running TradeMaster. Unit tests stay in Vitest (`npm run test:run`).

## Suites

| Project | Signed in | Writes | Runs where |
|---|---|---|---|
| `public-desktop`, `public-mobile` (`e2e/public`) | no | no | Locally, on every Vercel deployment (CI), production smoke |
| `setup` → `app-desktop`, `app-mobile` (`e2e/app`) | yes, E2E user | only tests tagged `@writes` | Locally against a test database |

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

## Signed-in setup

1. In the **Clerk Development** instance create a user for tests (for example `e2e+clerk_test@<your domain>`); no password is needed.
2. `cp .env.e2e.example .env.e2e` and set `E2E_USER_EMAIL`. `CLERK_SECRET_KEY` (sk_test_) and the publishable key come from `.env`.
3. `auth.setup.ts` signs in once with a Clerk sign-in ticket (`@clerk/testing`) and saves `playwright/.auth/user.json` (gitignored).

**Real accounts**: while the app is in trial the owner allowed running the suite as their own account (2026-10-10). Tests never overwrite company data: `ensureCompanyProfile` writes the fake company only when PIB, MB, address or žiro-račun is missing. Every document a test makes has a unique "E2E …" buyer and is deleted afterwards (also after a failure); test products are deleted too. Issued test invoices still use numbers from the company's series.

**Service worker**: the PWA worker is blocked in tests (`serviceWorkers: 'block'`), otherwise `page.route()` cannot fake API failures.

**Writes**: `@writes` tests run only with `E2E_ALLOW_WRITES=1` and only against localhost or a host listed in `E2E_WRITE_HOSTS`, and never with a live Clerk key (`support/env.ts`). Point the local app's `DATABASE_URL` at a test database first: the local `.env` normally points at production. The planned test database is the Supabase project used for the backup-restore drill (ROADMAP A1.9).

## CI

`.github/workflows/playwright.yml` runs the public suite on every successful Vercel `deployment_status` (preview and production) and on demand (`workflow_dispatch` with a URL). Previews are behind Vercel Deployment Protection: until the repo secret `VERCEL_AUTOMATION_BYPASS_SECRET` is set (Vercel → Project → Settings → Deployment Protection → Protection Bypass for Automation), preview runs are skipped with a warning; production deployments are tested. Signed-in suites are not run in CI: previews share the production database.

## Writing tests

- Locators by role, label and Serbian visible text (`getByRole`, `getByLabel`); no CSS classes. If a locator is fragile, add an accessible name in the app rather than a `data-testid`.
- Set up data through the API (`page.request` carries the session), test the user path in the UI, verify through the API, clean up in `finally`.
- Unique data per test (`uniqueSku`), fake company data from `support/test-data.ts` (valid control digits, never a real company).
- Times are `Europe/Belgrade`, locale `sr-RS` in every project.
