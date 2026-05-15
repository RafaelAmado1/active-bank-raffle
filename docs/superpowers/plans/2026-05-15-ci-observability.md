# CI/CD and Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise CI/CD and Observability to 8+ by wiring tsc+coverage+audit into CI, adding Sentry error monitoring, and adding a health endpoint for uptime monitoring.

**Architecture:** Three independent changes: (1) extend existing GitHub Actions workflow with 3 new steps, (2) install @sentry/nextjs and create the 3 config files + wrap next.config.ts, (3) add GET /api/health route handler with unit tests.

**Tech Stack:** GitHub Actions, @sentry/nextjs, Next.js 16 App Router, Vitest 4, TypeScript strict

---

## Files

- Modify: `.github/workflows/ci.yml` — add tsc, test:coverage, ci:audit steps
- Create: `sentry.client.config.ts` — browser Sentry init
- Create: `sentry.server.config.ts` — server Sentry init
- Create: `sentry.edge.config.ts` — edge/middleware Sentry init
- Modify: `next.config.ts` — wrap with withSentryConfig
- Modify: `.env.local.example` — add Sentry env vars
- Create: `app/api/health/route.ts` — GET handler
- Create: `app/api/health/route.test.ts` — 4 unit tests

---

### Task 1: Extend CI Workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace the workflow with the updated version**

Write this exact content to `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    name: Test & Build
    runs-on: ubuntu-latest

    env:
      NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
      SUPABASE_SERVICE_ROLE_KEY: placeholder-service-role-key
      ADMIN_PIN: 000000
      TOKEN_SECRET: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
      NEXT_PUBLIC_EVENT_LABEL: Mundial 2026

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type-check
        run: npx tsc --noEmit

      - name: Test with coverage
        run: npm run test:coverage

      - name: Build
        run: npm run build

      - name: Security audit
        run: npm run ci:audit
```

- [ ] **Step 2: Verify the file looks correct**

```bash
cat .github/workflows/ci.yml
```

Expected: 5 steps after "Install dependencies" — Lint, Type-check, Test with coverage, Build, Security audit.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add type-check, coverage enforcement, and security audit steps"
```

---

### Task 2: Add Sentry

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `next.config.ts`
- Modify: `.env.local.example`

- [ ] **Step 1: Install @sentry/nextjs**

```bash
npm install @sentry/nextjs
```

Expected: package added to dependencies in package.json.

- [ ] **Step 2: Create sentry.client.config.ts**

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
```

- [ ] **Step 3: Create sentry.server.config.ts**

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
```

- [ ] **Step 4: Create sentry.edge.config.ts**

```ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
```

- [ ] **Step 5: Update next.config.ts**

Replace the entire file with:

```ts
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

// CSP is set dynamically per-request in middleware.ts (nonce-based).
// These static headers apply to all routes and don't require a nonce.
const staticSecurityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  async headers() {
    return [{ source: '/(.*)', headers: staticSecurityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  sourcemaps: { disable: true },
})
```

- [ ] **Step 6: Add Sentry vars to .env.local.example**

Append these lines to `.env.local.example`:

```
# Sentry error monitoring (optional — errors only captured when DSN is set)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

- [ ] **Step 7: Verify build still works**

```bash
npm run build
```

Expected: build completes without errors.

- [ ] **Step 8: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts next.config.ts .env.local.example package.json package-lock.json
git commit -m "feat: add Sentry error monitoring (client, server, edge)"
```

---

### Task 3: Health Endpoint (TDD)

**Files:**
- Create: `app/api/health/route.test.ts`
- Create: `app/api/health/route.ts`

- [ ] **Step 1: Create the test file**

```ts
// app/api/health/route.test.ts
import { GET } from './route'

describe('GET /api/health', () => {
  it('returns 200', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('returns status ok', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body.status).toBe('ok')
  })

  it('returns a ts ISO string', async () => {
    const res = await GET()
    const body = await res.json()
    expect(new Date(body.ts).toISOString()).toBe(body.ts)
  })

  it('sets Cache-Control: no-store', async () => {
    const res = await GET()
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run app/api/health/route.test.ts
```

Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Create the route handler**

```ts
// app/api/health/route.ts
import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json(
    { status: 'ok', ts: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run app/api/health/route.test.ts
```

Expected:
```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/health/route.ts app/api/health/route.test.ts
git commit -m "feat: add GET /api/health endpoint for uptime monitoring"
```

---

## After Deploy: UptimeRobot Setup (manual)

1. Create free account at uptimerobot.com
2. Add monitor: HTTP(S), URL `https://<your-domain>/api/health`, interval 5 minutes
3. Add alert contact: email
4. Save
