# Clinical Training Platform

A multi-tenant clinical workflow simulation platform for universities, nursing programmes, and independent trainers. Each institution gets a private workspace for student accounts, classroom sessions, patient scenarios, reports, and visual identity.

This product is for **simulated teaching scenarios only**. Do not enter real patient information.

## Product areas

- `/` — product landing page and institution lookup
- `/register` — create an institution and its first owner account
- `/<institution-address>` — branded institution workspace for students and teachers
- `/<institution-address>/reports` — teacher reports and data exports
- `/<institution-address>/settings` — owner branding and teacher account management
- `/platform` — platform-owner institution console

## Local development

Requirements: Node.js 20 or newer and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure a **new, dedicated** Turso/libSQL database for this product. Never point this application at the original Trinity platform database.

Set the following values in `.env.local` for local work and in the separate Vercel project for deployment:

| Variable | Purpose |
|---|---|
| `TURSO_DATABASE_URL` | libSQL/Turso database URL |
| `TURSO_AUTH_TOKEN` | database access token (blank only for local unauthenticated libSQL) |
| `AUTH_SECRET` | random secret of at least 16 characters for signed sessions |
| `PLATFORM_ADMIN_PASSWORD` | long, unique password for `/platform` |

Generate a session secret with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Keep all secrets out of Git.

## Architecture

- Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS
- Turso/libSQL with separate prefixed tables per institution
- Server-verified signed, HTTP-only sessions
- Institution-specific primary/accent colours, hospital name, record prefix, and stored image assets
- Clinical workflow data is simulated and should not be used as a patient record system

The server tenancy and API layer is in `src/lib/tenants.ts`, `src/lib/db.ts`, `src/lib/tenant-guard.ts`, and `src/app/api`. Tenant-scoped screens live under `src/app/[tenant]`.

## Verification and deployment

Run `npx tsc --noEmit` and `npm run build` before deploying. The API isolation suite is in `tests/tenant_api_test.py`; it needs a running app and a dedicated test database. Never point tests at production data.

Deploy this fork as a separate GitHub repository, Vercel project, and database. Set the four environment variables above in the new Vercel project before the first usable deployment. See [ENTERPRISE_HANDOFF_GUIDE.md](./ENTERPRISE_HANDOFF_GUIDE.md) for the implementation status, tenancy model, security plan, and staged launch checklist.
