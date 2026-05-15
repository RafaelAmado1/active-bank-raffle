# CI/CD and Observability Design

**Goal:** Raise CI/CD from 6/10 to 8+ and Observability from 4/10 to 8+ for a production raffle system used live during World Cup matches.

**Architecture:** Extend the existing GitHub Actions workflow with tsc + coverage enforcement + audit. Add Sentry for runtime error capture. Add GET /api/health for uptime monitoring.

**Tech Stack:** GitHub Actions, @sentry/nextjs, Next.js 16 App Router, Vitest 4 coverage (already configured with thresholds)

---

## CI/CD Changes

File: `.github/workflows/ci.yml`

Add 3 steps to the existing job, in this order after "Install dependencies":

1. **Type-check:** `npx tsc --noEmit` — catches TypeScript errors before build
2. **Test with coverage:** replace `npm test` with `npm run test:coverage` — enforces the thresholds already defined in vitest.config.ts (lines:70, functions:70, branches:60, statements:70)
3. **Security audit:** `npm run ci:audit` — the script already exists (`npm audit --audit-level=high`), just not wired to CI

Order: Lint → Type-check → Test with coverage → Build → Security audit

No new env vars needed (placeholder env vars already in the workflow cover the test suite).

## Observability: Sentry

Files:
- `sentry.client.config.ts` — browser error capture
- `sentry.server.config.ts` — server-side error capture
- `sentry.edge.config.ts` — middleware/edge error capture
- `next.config.ts` — wrap with `withSentryConfig`
- `.env.local.example` — add `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`

Sentry init config (all three):
- `dsn: process.env.NEXT_PUBLIC_SENTRY_DSN`
- `environment: process.env.NODE_ENV`
- `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN` — off when DSN not set (dev/CI)
- `tracesSampleRate: 0.1` in production, `1.0` otherwise

`withSentryConfig` options: `silent: true`, `sourcemaps: { disable: true }` (no source map upload needed without Sentry CLI).

## Observability: Health Endpoint

File: `app/api/health/route.ts`
Test: `app/api/health/route.test.ts`

- `GET /api/health` returns HTTP 200 with `{"status":"ok","ts":"<ISO>"}`
- `Cache-Control: no-store`
- No auth, no external dependency checks
- 4 unit tests: status 200, body.status === "ok", ts round-trip ISO check, Cache-Control header

## Out of Scope

- Structured logging (pino, etc.)
- Sentry performance monitoring / replays
- UptimeRobot setup (manual, after deploy)
- Coverage threshold increases (already at 70/70/60/70 — sufficient)
