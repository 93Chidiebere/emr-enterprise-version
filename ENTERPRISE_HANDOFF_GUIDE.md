# Enterprise Clinical Training Platform: Handoff Guide

Audience: an AI assistant or engineer who has never seen this project and must continue it.
Written at the moment work was stopped. Read sections 0 to 8 first; the rest is reference.

---

## 0. Status in one minute

| Area | State |
|---|---|
| Product idea | Turn a working single-university hospital-workflow training simulator (the "Trinity platform") into a multi-tenant SaaS where any university or trainer registers, brands, and runs their own instance. |
| Original platform | Live, working, in a separate GitHub repo and Vercel project. **Do not modify it.** This folder is a copy that becomes its own repo, its own Vercel project and its own database. |
| Server side (database, auth, tenants, API routes) | Written. `npx tsc --noEmit` passes and `npm run build` passed at the last check. Tenant table creation was verified manually (registering an institution returns 201 and creates 14 prefixed tables). |
| Server isolation test suite (`tests/tenant_api_test.py`) | Written, **not yet re-run** after its SQL scoping bug was fixed. Run it against a disposable dedicated database before pilot use. |
| Browser side (pages, theming, sign-in screens, branding) | Initial multi-tenant flow is implemented locally: marketing and registration pages, slug-based tenant workspaces, tenant-aware student/teacher authentication, theme variables, owner settings for identity/assets/staff, reports routing, and a platform-owner console. Full browser and API isolation verification is still outstanding. |
| Everything else (billing, email, compliance documents, hardening) | Not started. Plans are in sections 8 to 14. |

Current continuation: finish replacing any remaining legacy copy, run the tenant isolation and browser flows against a dedicated database, then create and connect the separate GitHub/Vercel resources. The current local `origin` still points to the foundation repository; do not push to it.

---

## 1. What we are building

**Product:** a web platform in which students role-play the stations of a hospital (Front Desk, Triage, Doctor, Laboratory, Radiology, Pharmacy) on simulated patients so they learn how clinical data, orders and records flow. Teachers run class sessions and get reports and data downloads (including ICD-10 diagnosis coding practice).

**Business goal:** let other universities and trainers sign up themselves, customise (name, logo, colours, hospital name), invite teachers, enrol students, and use it, with strict separation of data between customers. The founder (the "platform owner") oversees all customers.

**Users and roles**

| Role | Who | Main capabilities |
|---|---|---|
| Platform owner | The founder | Platform console: list institutions, usage counts, suspend or reactivate |
| Institution owner | First teacher who registers an institution | Branding, record prefix, add, remove and reset teachers, plus everything a teacher can do |
| Teacher | Staff of one institution | Master view of all patients, start new class session, reports, CSV downloads, manage student accounts (reset password, rename, edit email, unlock station) |
| Student | Registers under one institution | Picks one station per class session (locked until the teacher starts a new session), works on patients at that station, reads patients they treated, Front Desk can edit patient details |
| Visitor | Anyone | Demo preview with sample patients (never touches the database) |

**Important domain rule:** all patients are simulated. Real patient data must never be entered (see compliance, section 12).

---

## 2. Features inherited from the Trinity platform (already in this code)

* Stations and workflow: Reception, Triage (vitals, BMI, urgency), Doctor (history, exam, diagnoses with ICD-10 picker using the full WHO ICD-10 list in `public/icd10.json`, lab/imaging/medication orders, routing), Laboratory, Radiology (doctors request imaging; lab can route on to radiology), Pharmacy, Master Directory (teacher).
* Live shared data across devices; the screens poll a cheap change counter (`/api/rev`) every 10 s and reload only when it changed.
* Class sessions: teacher starts a new session, which archives the old one (data kept for reports), resets numbering to 00001, and makes students choose a station again.
* Per-session station lock for students; stations see only patients currently at that station; every station can read the patients it personally treated (table `patient_actors`); Front Desk can correct personal details safely (`updatePatientDetails` changes only personal fields inside the database).
* Accounts: student register and sign-in (scrypt password hashes, lockout after 5 wrong tries for 5 minutes, same message for wrong name or password), rename (records rewritten, old names reserved via `user_aliases`), emails collected at registration (teachers can view and edit).
* Reports: totals, time at each station, top ICD-10 diagnoses, demographics, activity per student, patient list, CSV exports of every table, JSON backup.
* Responsive UI tested on 320 to 1366 px; accessibility work (skip link, dialogs with focus trap, labelled forms, keyboard menus).
* Server-side authorisation: students receive only the patients they may see; writes are checked against the student's station.

---

## 3. Architecture and the key decisions

**Stack:** Next.js 14 (App Router, TypeScript), React 18, Tailwind 3, Turso (libSQL) via `@libsql/client/web` over HTTPS, deployed on Vercel. No ORM.

### 3.1 Tenancy model (decision and reasoning)

Options considered:

1. Shared tables with a `tenant_id` column on every table. Standard, scales to very many tenants, but a forgotten `WHERE tenant_id = ?` silently leaks another customer's data.
2. Database per tenant (Turso's design). Strongest isolation; needs Turso's Platform API to create databases programmatically and paid plan limits for many databases.
3. **Chosen: one database, one private set of tables per institution** (`t_<tenantid>_patients`, etc.) plus one shared `cf_tenants` table.

Why 3: the existing, heavily tested single-institution SQL could be reused unchanged. `db(tenantId)` returns a handle whose `execute` and `batch` rewrite table names to that institution's prefix (`scopeSql` in `src/lib/db.ts`). Because the rewriting is centralised, a request can only reach its own tables and a mistake fails with "no such table" instead of leaking data. Per-institution backup, export and deletion are simple (drop the tables).

Trade-offs to know:
* Thousands of tenants means tens of thousands of tables. SQLite handles this but schema loading slows. Plan the migration to database-per-tenant (option 2) when approaching a few hundred active institutions, or when a customer demands physical isolation.
* Schema migrations must be applied per institution. `ensureTenantSchema(tenantId)` runs `CREATE TABLE IF NOT EXISTS` once per server instance per institution, plus small `ALTER TABLE` steps (see the email column migration). Any new column needs a guarded ALTER there.
* Cross-institution analytics (platform console) loops over institutions.

### 3.2 Tenant identification in the app

* **Planned (not built in UI):** path-based tenants, `/<slug>` is an institution's app, `/<slug>/reports`, `/<slug>/settings`; `/` is the marketing page; `/register` registers an institution; `/platform` is the owner console. Static routes beat the dynamic `[tenant]` segment in Next.js. Reserved slugs are listed in `RESERVED_SLUGS` in `src/lib/tenants.ts`.
* Later: subdomains (`slug.yourdomain.com`) need a custom domain with wildcard DNS and the Vercel wildcard domain feature (paid plan).
* After sign-in, the signed cookie carries the institution id (`tid`). All API routes after login take the institution from the cookie, never from the request body. Only sign-in and registration endpoints take a `tenant` slug in the body.

### 3.3 Sessions

Cookie `cf_session` (HttpOnly, SameSite=Lax, Secure in production, 12 h), HMAC-SHA256 signed with `AUTH_SECRET`. Payload: `{kind: student|teacher|platform, tid, id, name, role, exp}`. Guards in `src/lib/session.ts`: `requireUser`, `requireTeacher`, `requireOwner`, `requirePlatform`. They re-check in the database that the account still exists and that the institution is active, so removed accounts and suspended institutions lose access immediately (institution status is cached 15 s per server instance).

### 3.4 Theming (designed, partly built)

`src/lib/colors.ts` turns two chosen colours (primary and accent) into every shade the UI needs as CSS variables (`--c-navy*`, `--c-brand*`, `--c-accent-50..900`) and auto-corrects unreadable choices (primary must reach 7:1 contrast with white; accent must be bright enough to carry dark text). The UI must switch from fixed hex colours to Tailwind tokens that read these variables (section 8, Phase C).

### 3.5 Hosting facts that shaped the design

* Vercel serverless functions have no durable memory, so all state is in Turso.
* Turso free plan (checked Oct 2026): 100 databases, 5 GB storage, 500 M rows read and 10 M rows written per month, no card needed. Re-check before relying on it.
* Vercel **Hobby is for personal, non-commercial use**; a paid business needs a paid Vercel plan. Verify current terms before launch.

---

## 4. Repository map

```
ENTERPRISE_HANDOFF_GUIDE.md   this file
tests/                         tenant_api_test.py (isolation suite), register_one_tenant_smoke.py, README.md
public/icd10.json              WHO ICD-10 list (lazy-loaded by the ICD picker)
public/*                       Trinity logo/hero images: REPLACE with neutral defaults
src/lib/
  db.ts            tenant-scoped database layer; schemas; scopeSql; ensureTenantSchema; rawDb; db(tid)
  tenants.ts       institutions: create, slug rules, branding, logo/hero storage, platform listing, suspend
  staff.ts         teacher accounts per institution: create, login with lockout, reset, remove (owner protected)
  session.ts       signed cookie, guards (user, teacher, owner, platform)
  tenant-guard.ts  resolves {tenant: slug} in sign-in requests (404 unknown, 403 suspended)
  colors.ts        brand colour validation and CSS-variable theme generation (shared server/browser)
  store.ts         sessions, patients, orders, exports; all functions take tid first
  users.ts         student accounts (register/login/email/rename/alias/list/export)
  access.ts        station rules: session roles, who may read or write which patient
  actors.ts        names on records; rewriting names after a rename
  reports.ts       report calculations (pure functions)
  passwords.ts     scrypt hashing
  api-errors.ts    safe error responses; classifies database problems
  csv.ts, demo-data.ts, other helpers
src/app/api/
  tenants/ (POST register institution), tenants/check (slug available?), tenants/[slug]/asset/[kind] (public logo/hero)
  tenant/settings (GET, PATCH branding + logo), tenant/staff (+ [id]), tenant/password
  platform/login, platform/logout, platform/tenants (+ [id] suspend/reactivate)
  auth/student/login|register|name|email, auth/teacher (email+password), auth/me, auth/logout
  patients (+ [id], [id]/details), rev, sessions, session-role, students (+ [id], [id]/name|email|session-role)
  reports/summary, reports/export, health, patients/reset (retired stub)
src/app/             page.tsx (the old single-tenant app: must move under [tenant]), reports/page.tsx, layout.tsx
src/components/      workstations, dossier, intake, auth dialogs, layout/Navbar, pipeline bar, home/HeroLanding
src/context/         AuthContext (still old API), EMRContext (data loading, polling)
```

---

## 5. Data model

**Shared:** `cf_tenants(id, slug UNIQUE, name, hospital_name, department, location, tagline, primary_color, accent_color, record_prefix, logo_data, hero_data, brand_version, status active|suspended, plan, owner_email, created_at)`.

**Per institution (prefix `t_<tenantid>_`):** `meta(rev counter)`, `sessions`, `patients` (JSON document + indexed columns), `vitals`, `consultations` (with ICD-10 fields), `lab_orders`, `radiology_orders`, `medications`, `routing_events` (these six are queryable copies rebuilt on every patient save, for reports and analysis), `users` (students, includes `email`), `session_roles`, `patient_actors`, `user_aliases`, `staff` (teachers).

Hospital numbers: `<record_prefix>-<year>-<5 digit sequence>`, sequence restarts at 1 in every class session.

---

## 6. Security model (what is implemented)

* Passwords: scrypt, per-password salt, constant-time compare; students need 6+ characters, staff 8+. Lockout after 5 failures for 5 minutes. Identical error for unknown user vs wrong password.
* Isolation: table-name rewriting (3.1); institution id only from the signed cookie; forged cookie rejected (signature).
* Authorisation: guards per route; students read only their station's patients plus ones they worked on; students write only while the patient is at their station; only Front Desk enrols patients and edits details; only owner changes branding or teachers; teacher-only reports and exports.
* Uploads: logo or hero accepted only as PNG/JPEG/WebP data URLs (no SVG, which can carry scripts), size capped (logo about 350 KB, hero about 900 KB of base64), served with their stored MIME type.
* Caching bug class already fixed: Next.js caches identical `fetch` calls, which made database reads stale; the libSQL client is created with a custom `fetch` using `cache: "no-store"` and routes export `fetchCache = "force-no-store"`. **Keep this.**
* Database errors are logged server-side and returned to the browser as a safe classified message (`classifyDbError`).

---

## 7. WHERE I STOPPED (build, test, correction)

### 7.1 Build

Done:
1. Tenant-scoped database layer (`db.ts`), tenants, staff, session guards, colours, tenant guard.
2. Mechanically threaded `tid` through `store.ts`, `users.ts`, `access.ts` and all routes (regex transformation, then `tsc` clean).
3. New API routes (register institution, slug check, public assets, settings, staff, own password, platform console, tenant-aware auth).
4. Hospital number prefix per institution (`createPatient` reads the institution's `recordPrefix`).

**Implemented locally since the initial handoff:** root marketing and institution lookup; registration and first-owner sign-in; tenant route/layout/context; slug-aware student and teacher sign-in; institution-scoped theme variables, names, logo and hero assets; owner identity/branding and teacher management settings; platform console; reports and settings routing; neutral README and product package name. `npx tsc --noEmit` and `npm run build` pass. No tenant isolation or end-to-end browser suite has been run in this work session.

### 7.2 Test

* `tests/register_one_tenant_smoke.py`: passes (201; 14 prefixed tables + `cf_tenants`).
* `tests/tenant_api_test.py`: first run failed at institution registration with `no such table t_..._users`. Root cause: `scopeSql` was not rewriting table names (see 7.3), so schema creation made unprefixed tables. After the fix, the suite was **not re-run**. Coverage it contains (about 40 checks): two institutions register; address checks (taken, reserved, invalid); same student name allowed in two institutions but not twice in one; sign-in at the wrong institution; per-institution hospital-number prefixes and independent numbering; teacher A sees only A's patients; B cannot read or write A's patient ids; reports and exports are per institution; new session in A does not touch B; forged cookie naming another institution rejected; each institution has its own physical table; branding update with colour correction; logo served publicly (and 404 for none); non-image and oversize uploads refused; owner adds, resets and removes teachers; teacher cannot change branding or staff; teacher changes own password; removed teacher locked out at once; platform console login, listing with counts, institution owners cannot use it; suspension blocks teacher, student and sign-in of that institution only; reactivation (needs a 16 s wait because of the 15 s cache).

### 7.3 Correction in progress (and a warning about escaping)

The bug: the regex in `db.ts` that rewrites table names did not match, so scoping was a silent no-op. I chased a backslash-escaping illusion (tool output showed doubled backslashes) and finally rewrote the pattern with `String.raw` so it contains single backslashes: `new RegExp(String.raw\`\b(FROM|JOIN|INTO|UPDATE|TABLE IF NOT EXISTS|ON)\s+(...)\b\`, "gi")`, and the `idx_` replacement as a regex literal `/\bidx_/g`. **Do not "simplify" these.** After this change the smoke test passed. Lesson: **add a unit test for `scopeSql`** (input SQL -> expected prefixed SQL) so this can never regress silently, and a startup assertion that `scopeSql("SELECT 1 FROM patients","abc123")` contains the prefix.

### 7.4 Known unverified areas after the mechanical refactor

Because `tid` was threaded by regex, check these by reading and by tests: `rewriteActorNames`, `exportStudentsCsv`, `loadNameResolver`, `EXPORT_TABLES` joins (aliases after rewritten table names), `updatePatientDetails` (uses `json_set`), `renameStudent`, `studentAccess`, the `details` route's direct SQL, `/api/auth/me`.

### 7.5 Other known gaps and leftovers

* Client still imports `DEFAULT_ADMIN_TEACHER_ACCOUNTS` and uses `TEACHER_PASSWORD`-era flows; `AuthContext` calls `/api/auth/student/login` without a `tenant` field and `/api/auth/teacher` with a name and shared password. These now fail by design.
* Hard-coded Trinity text in `HeroLanding`, `Navbar`, `page.tsx` footer, `NewPatientModal`, `layout.tsx` metadata, `README`, and demo data (`TPH-` numbers); hard-coded colours `bg-[#0B2545]` and similar (about seven distinct hex values plus Tailwind `amber-*` as the accent); Trinity images in `public/`.
* Dead files kept for diffability: `src/lib/server-store.ts`, `src/components/auth/AuthModal.tsx` (stubs), `src/app/api/patients/reset/route.ts` (410 stub). Delete when convenient.
* `package.json` name is still `trinity-point-emr`; rename.
* Institution status is cached 15 s per instance, so suspension takes up to 15 s to bite.
* `requireUser` adds one extra database read per request (existence check). Acceptable now; watch row-read quotas.
* Platform console uses one shared password from an environment variable (no individual accounts or 2FA).
* No email sending exists (needed for verification, password reset, messages to students).
* No rate limiting on institution registration or sign-in endpoints beyond per-account lockout.

---

## 8. How to continue: ordered plan with acceptance criteria

### Phase A: Prove the server (1 day)
1. Create `.env.local` from `.env.example` or use the local libSQL server (section 14). `npm ci && npm run build`.
2. Add a unit test for `scopeSql` (a tiny script with `tsx` or a Jest/Vitest setup).
3. Run `python tests/tenant_api_test.py`. Fix failures. Note the suite's `PASS/FAIL` print format. Target: all checks pass.
4. Extend the suite to cover section 7.4 functions under two institutions (renames, exports, details edits, session roles, station rules) by porting the old single-tenant scripts' ideas: station locking per session, my-patients visibility, Front Desk details edit not overwriting clinical data, rename rewriting records and keeping aliases, lockout after 5 failures, email rules.
Acceptance: green suite; running it twice on a fresh database gives identical results.

### Phase B: Make the browser multi-tenant (in progress)
1. `src/app/layout.tsx`: keep only fonts and global CSS (remove `AuthProvider`, `EMRProvider`, `FormA11yEnhancer`).
2. Create `src/app/[tenant]/layout.tsx` (server component): load the institution with `getTenantBySlug` (call `notFound()` if missing; show a "suspended" page if suspended), render `<TenantProvider tenant={...}>` + `AuthProvider` + `EMRProvider` + `FormA11yEnhancer`, set the theme style from `buildThemeVars` on a wrapper div, and `generateMetadata` (title = hospital name, favicon = logo URL).
3. Move `src/app/page.tsx` to `src/app/[tenant]/page.tsx` and `src/app/reports/page.tsx` to `src/app/[tenant]/reports/page.tsx`. Links to the app become `/${slug}`.
4. `TenantContext` exposes `{slug, name, hospitalName, department, location, tagline, logoUrl (or null), heroUrl (or null), recordPrefix, colours}`.
5. `AuthContext`: include `tenant: slug` in student login, register and teacher login calls; `/api/auth/me?tenant=slug`; teacher login takes `{email, password}`; remove `DEFAULT_ADMIN_TEACHER_ACCOUNTS` and the "select your name" teacher list (a public list of staff names across customers is not acceptable). `isOwner` comes from `/api/auth/me` (`owner: true`).
6. `HeroLanding`: Teachers tab becomes email and password; student tabs unchanged apart from the tenant; all text and images from the tenant.
7. New `src/app/page.tsx`: marketing landing (what it is, who it is for, "Register your institution", "Find your institution" by slug). New `src/app/register/page.tsx`.
Acceptance: Playwright flow: register institution, land in its app as owner, register a student in another browser context, student picks a station, enrols and works a patient, teacher sees reports. A second institution never sees the first.

### Phase C: Branding and theming (1 to 2 days)
1. `tailwind.config.ts`: replace fixed colours with variable-driven tokens, e.g. `navy: {DEFAULT: "rgb(var(--c-navy) / <alpha-value>)", dark: ..., deep: ..., surface: ..., "surface-hover": ..., border: ..., light: ...}`, `brand: {DEFAULT, hover, dark, light, border}`, and override the full `amber` scale with `--c-accent-50..900`. Provide default values in `globals.css` (`:root`) so pages without a tenant still render.
2. Replace hard-coded hex classes by tokens (mapping: `#0B2545` navy, `#1E4E79` navy-border, `#071B33` navy-dark, `#0F325E` navy-surface, `#15437C` navy-surface-hover, `#051426` navy-deep). Use a scripted replace (`bg-[#0B2545]` to `bg-navy`, keeping variant prefixes and `/opacity` suffixes) and review visually.
3. Replace remaining Trinity strings and images with tenant values; default logo = initials badge coloured by the accent; default hero = gradient. Remove Trinity files from `public/`.
4. Logo: serve from `/api/tenants/<slug>/asset/logo?v=<brandVersion>`; hero likewise.
5. Check contrast in the 6 primary x 6 accent presets and a few extreme custom colours (the normalisation in `colors.ts` is the safety net). Target WCAG AA for text.
Acceptance: two institutions with different colours and logos render with no Trinity text or colour anywhere; screenshot comparison at 360 px and 1366 px.

### Phase D: Onboarding, settings, platform console (2 to 3 days)
* `/register`: multi-step form (institution name and address with live availability check against `/api/tenants/check`, hospital name, faculty or department, location, colours with presets and live preview, logo upload with client-side resize to at most 256 px and under the size cap, owner details). On success redirect to `/<slug>`.
* `/<slug>/settings` (owner): branding editor with live preview, record prefix, teacher management (add, reset password, remove), own password change. Teachers see read-only branding.
* `/platform`: sign in with the platform password; table of institutions (name, address, owner email, students, teachers, patients, created, status) with suspend or reactivate; later: plan, usage, notes.
* Student and teacher messaging, email verification and password reset need an email provider (Phase F).

### Phase E: Quality (2 days)
Re-create the browser test suites (section 10), run the responsive audit at 320, 360, 375, 390, 412, 768, 1024, landscape 667x375 and 1366, then fix findings.

### Phase F: Hardening before real customers (1 to 2 weeks)
Everything in sections 11 and 12, especially: email verification for institution owners, rate limiting and bot protection on registration and sign-in, security headers and CSP, audit log, backups and tested restore, per-institution data export and deletion, privacy policy and terms, monitoring and alerts, load test.

### Phase G: Pilot
Two or three friendly institutions, one class session each; collect feedback; fix; then open registration.

---

## 9. UI/UX specification

**Principles:** mobile-first (many students use small Android phones and iPhones), plain language, one clear action per screen, forgiving forms, never show another institution's name or data.

**Information architecture**
* `/` marketing: headline, three benefits (realistic workflows, live class sessions, reports and data), "Register your institution", "Open your institution" (enter address), pricing teaser, footer with Privacy, Terms, Contact.
* `/register` wizard (4 short steps with progress): Institution, Branding (live preview card), Owner account, Review. Inline validation, no lost input on error.
* `/<slug>`: landing for that institution (their name, logo, hero) with tabs Student Sign In, Student Register, Teachers. After sign-in the app shell.
* App shell: compact header (logo, hospital name, session badge, profile, actions), station area, "Patients I worked on" panel, dialogs for chart, route, enrol, edit details, profile, station choice, add email.
* `/<slug>/reports` and `/<slug>/settings` for teachers/owners. `/platform` for the owner.

**Mobile rules already validated (keep them):** header compact under 300 px tall on phones; 40 px minimum tap targets on touch devices; 16 px inputs (prevents iOS zoom); stacked-card tables on phones (`responsive-table`, master table up to 1100 px); dialogs use `dvh` heights with pinned primary buttons; no horizontal scrolling at 320 px.

**Accessibility (target WCAG 2.2 AA):** keyboard operation, visible focus, labelled controls, dialog focus trap and Escape, `aria-live` for status, colour contrast guaranteed by `colors.ts`, no information by colour alone, respects reduced motion.

**Content and tone:** short, encouraging, explain errors with what to do next. Every error from the server already has a human message; surface it.

**Empty and error states to design:** institution not found, institution suspended, session expired (return to that institution's sign-in), database not connected (owner sees setup hint, others a neutral message).

---

## 10. Testing and QA strategy

**Test pyramid to rebuild**
1. Unit: `scopeSql`, colour functions (contrast guarantees), slug rules, ICD search, report calculations, name rewriting.
2. API integration (Python `requests` against a local libSQL server): the isolation suite, plus ports of the single-institution suites: authentication and lockout, station rules and visibility, details edit safety, rename and aliases, emails, exports, sessions and numbering, reports.
3. Browser end to end (Playwright with Chromium): registration of an institution; student register, sign-in, station choice, enrol, triage, doctor with ICD-10, lab to radiology routing, pharmacy, my-patients read-only, Front Desk edit; teacher reports, new session, unlock station, rename; branding changes appear; two institutions side by side in separate browser contexts.
4. Responsive audit: automated script measuring horizontal overflow, small tap targets and tiny text on every screen at 320, 360, 375, 390, 412, 768, 1024, 667x375 landscape and 1366; plus screenshot review. (An earlier audit harness was lost; re-create it: seed realistic patients at every station, sign in as each role, open each dialog, evaluate `document.documentElement.scrollWidth` versus viewport and bounding boxes of buttons.)
5. Accessibility: axe-core in Playwright on each screen; manual screen-reader pass (NVDA/VoiceOver/TalkBack) on sign-in, station picker and a patient workflow.
6. Security tests: section 11 checklist; automated authorisation matrix test (every route x every role x own/other institution expects 200/401/403/404).
7. Performance: load test sign-in, patient save and polling for 3 institutions x 40 concurrent users; watch Turso rows read and written; verify cold start schema creation time.
8. Cross-device manual: real iPhone Safari, Android Chrome (low-end device), iPad, Windows Chrome/Edge, Firefox. Cookies, dialogs, keyboard overlay, back button.
9. Data integrity: after a rename, every record shows the new name; after a new session, old data remains in reports; export totals equal on-screen totals.
10. Backup and restore drill.

**Environment tips (learned the hard way):** build before `next start`; Python `requests` will not send `Secure` cookies over plain http, so pass the cookie header by hand; Chromium under Playwright treats localhost as secure; full-page screenshots reset touch emulation (measure before screenshotting); never trust output that shows doubled backslashes, inspect the bytes in Python.

**Definition of done for a release:** all suites green, responsive audit clean, axe clean, security checklist reviewed, restore drill passed, release notes written.

---

## 11. Cybersecurity: threats, controls, checklist

**Threat model (STRIDE) and mitigations**

| Threat | Example | Mitigation (status) |
|---|---|---|
| Spoofing | Guessing passwords; stolen cookie | scrypt, lockout, same error messages, signed HttpOnly cookie (done). To add: email verification, optional 2FA for owners and platform console, session revocation on password change |
| Tampering | Forged cookie naming another institution; editing others' patients | HMAC cookie, tid from cookie only, station write rules (done) |
| Repudiation | "I never changed that record" | Names written on every entry (done). To add: append-only audit log of admin actions (branding, staff changes, session starts, suspensions, exports) |
| Information disclosure | Cross-tenant leak; student sees all patients; logo SVG scripts | Per-tenant tables, server-side filtering, no SVG (done). To add: pen test, secrets scanning |
| Denial of service | Spam registrations, huge uploads, polling storms | Size caps, cheap `/api/rev` poll (done). To add: rate limiting, CAPTCHA on `/register`, per-institution quotas, Vercel firewall rules |
| Elevation of privilege | Student calls teacher endpoint; teacher becomes owner | Guards on every route (done). Test with the authorisation matrix |

**Controls still to implement**
* Rate limiting on `/api/tenants`, sign-in endpoints, `/api/tenants/check` (per IP and per account). Use an edge provider (Vercel Firewall, Cloudflare) or a small table with sliding window.
* Bot protection on `/register` (Cloudflare Turnstile or hCaptcha) and email verification of the owner's address before activation.
* Security headers via `next.config.mjs`: `Content-Security-Policy` (no inline script except Next's nonce setup; `img-src 'self' data:` if inline images are used), `X-Frame-Options: DENY` or `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, HSTS.
* CSRF: cookies are SameSite=Lax and every state change is a JSON request (not a simple form), which blocks classic CSRF. Add an explicit `Origin` header check on all non-GET API routes for defence in depth.
* Secrets: `AUTH_SECRET`, `TURSO_AUTH_TOKEN`, `PLATFORM_ADMIN_PASSWORD` only in Vercel environment variables, rotated on staff changes; a rotation of `AUTH_SECRET` signs everyone out (document it). Never commit `.env*`. Enable GitHub secret scanning and push protection.
* Dependencies: `npm audit` in CI, Dependabot or Renovate, lockfile committed, pin major versions; review new packages (supply-chain risk).
* Logging and monitoring: structured logs with request id, institution id and user id (no passwords, no full emails), alerts for error spikes and sign-in failure spikes (Vercel Log Drains to a log service or a simple Slack webhook).
* Backups: Turso point-in-time recovery depends on plan; add a scheduled export of every institution to private storage and **test restores**.
* Data minimisation: only name, email, role and simulated records; never real patient data; auto-delete or anonymise inactive institutions after a stated period.
* Password reset and recovery flows must not reveal whether an email exists; tokens single-use, short-lived, stored hashed.
* Pre-launch: external penetration test or at minimum an OWASP ASVS Level 1 self-assessment and the OWASP Top 10 review; test especially broken access control, injection (SQL is parameterised; verify the table-prefix regex cannot be influenced by user input: tenant ids are validated by `TENANT_ID_RE`), unrestricted resource consumption, SSRF (none now), unsafe file upload.

---

## 12. Compliance, legal and governance

**Data protection**
* Nigeria Data Protection Act 2023 and the NDPC's regulations: the platform processes personal data of students and teachers (name, email, activity). Determine roles: institutions are generally **data controllers** for their students; the platform is a **data processor**; the platform owner is a controller for institution owners' data. Provide a **Data Processing Agreement** template for institutions, a privacy notice, lawful basis (contract and legitimate interests; consent for marketing messages), data subject rights (access, correction, deletion), retention schedule, breach notification (NDPC within 72 hours of becoming aware, plus affected people when high risk), register with the NDPC where required, appoint a data protection contact, and consider an annual compliance audit.
* GDPR/UK GDPR if any institution is in the EU or UK; US customers may ask about FERPA (education records): provide a processor statement. Cross-border transfers: state where data is hosted (Vercel and Turso regions) and use standard contractual clauses where needed.
* Cookies: only one strictly necessary session cookie, no analytics or ad cookies by default; if analytics are added, add consent.
* Email: lawful basis, an unsubscribe for non-transactional mail, authenticated sending domain (SPF, DKIM, DMARC).

**Medical-domain boundaries:** the product is an education simulator, not a medical record system or medical device. Show a clear notice at sign-in and in Terms: **do not enter real patient information**; consider a technical safeguard (warn when text looks like real identifiers) and a takedown process. This keeps it out of HIPAA/health-record regimes; if a customer wants to use real records, that is a different product with a different compliance load.

**Accessibility:** WCAG 2.2 AA conformance statement and issue process.

**Commercial and legal documents needed:** Terms of Service, Privacy Policy, Acceptable Use Policy, DPA, SLA (uptime target, support hours), refund policy, subprocessor list (Vercel, Turso, email provider, payment provider), cookie notice, trademark check for the product name (it is currently a working title; "ClinicFlow" or similar must be cleared), licence review of dependencies and the WHO ICD-10 data (confirm redistribution terms for ICD-10 and include attribution).

**Governance**
* Roles: product owner, tech lead, security and privacy lead (can be one person at first), support lead.
* Change management: protected `main`, pull requests with review, CI (typecheck, build, test suites), preview deployments, staging environment with its own Turso database, versioned releases and changelog, feature flags for risky features, database changes only through guarded `ensureTenantSchema` steps and tested on a copy.
* Incident response: severity levels, on-call contact, runbook (isolate, preserve logs, rotate secrets, notify), post-incident review.
* Vendor risk: Vercel and Turso outages, plan limits, terms (commercial use). Keep an export-everything script so migration is possible.
* Support: ticket inbox, response targets, onboarding guide for teachers, FAQ.
* Cost control: monitor Turso rows read and written and Vercel usage per institution; quotas per plan; kill-switch (suspend) in the platform console.

---

## 13. Business model notes (not built)

* Plans: Free (small class size, limited sessions), Institution (per seat or per term), Enterprise (custom domain, SSO). Store `plan` in `cf_tenants` (column exists) and enforce quotas in guards.
* Billing: Paystack or Flutterwave for NGN, Stripe for USD; webhooks update `plan` and `status`; invoices; grace period before suspension.
* Growth: public demo, case library, instructor templates (preloaded patient scenarios), certificates, LMS integration (LTI) and SSO (Google/Microsoft) later.
* Analytics for the owner: signups, activation (first session run), retention, usage per plan.

---

## 14. Operations and infrastructure

**Create the new, separate stack (the original platform stays untouched)**
1. Unzip this project into `C:\Users\Chidiebere\Documents\emr-enterprise-version`.
2. `git init`, create a NEW empty GitHub repository (suggest private), `git add -A`, commit, `git remote add origin ...`, `git push -u origin main`.
3. Turso: create a NEW database (the free plan allows 100). Create a read/write token. Never point this app at the Trinity database.
4. Vercel: Add New Project, import the NEW repo, name it differently from the Trinity project. Set environment variables from `.env.example`. Deploy. Open `/api/health` to check configuration.
5. Local development: `npm ci`, copy `.env.example` to `.env.local`, then either use the Turso URL and token or run a local libSQL server: download `libsql-server-x86_64-unknown-linux-gnu.tar.xz` (or the platform build) from https://github.com/tursodatabase/libsql/releases (tag `libsql-server-v0.24.32` was used), run `sqld --db-path ./local.db --http-listen-addr 127.0.0.1:8080`, then set `TURSO_DATABASE_URL=http://127.0.0.1:8080`. Playwright: `pip install playwright requests && python -m playwright install chromium`.

**Environment variables:** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET` (16+ characters), `PLATFORM_ADMIN_PASSWORD` (8+). `/api/health` reports which are missing without revealing values.

**Environments:** local (libSQL), staging (separate Turso database, preview URL), production. Never share databases between environments.

**Domains:** start with `<project>.vercel.app/<slug>`; later a custom domain, then wildcard subdomains.

---

## 15. Go-live checklist

- [ ] Isolation suite and all other suites green on staging; responsive and accessibility audits clean.
- [ ] Browser side multi-tenant complete; zero "Trinity" strings or colours left (grep for `Trinity`, `TPH`, `Yaba`, hex colours).
- [ ] Security headers, CSP, rate limiting, CAPTCHA and email verification in place; secrets rotated and only in Vercel.
- [ ] Logging, alerts, uptime check, backup and a tested restore.
- [ ] Legal pages (Terms, Privacy, AUP, DPA, cookie notice) published and linked; NDPC registration status confirmed; breach runbook written.
- [ ] Product name and domain secured; trademark checked; sender domain authenticated (SPF/DKIM/DMARC).
- [ ] Vercel plan suitable for commercial use; Turso plan sized for expected load; cost alerts set.
- [ ] Pilot with 2 to 3 institutions completed; feedback addressed.
- [ ] Support inbox, onboarding guide, status page, rollback procedure ready.
- [ ] Platform console password long and unique; consider IP restriction or 2FA.

---

## 16. Appendix

**Gotchas learned**
* Next.js caches `fetch` by default, including POST requests with identical bodies. The libSQL HTTP client uses fetch, so reads came back stale. Fixed with a custom no-store `fetch` and `fetchCache = "force-no-store"` on routes. Keep.
* `maxDuration = 30` on routes that rewrite many records (rename).
* Vercel serverless instances start cold; schema creation and per-institution `ensureTenantSchema` run once per instance.
* The email column migration uses `PRAGMA table_info` then `ALTER TABLE ... ADD COLUMN`.
* SQLite `ON CONFLICT ... DO UPDATE` is used for patient upserts; update lists must include every column that can change (a past bug: `registered_by`).
* Cookies set with `Secure` are not sent by Python `requests` over http; send the header manually in tests.
* Playwright: `pointer: coarse` is true for mobile contexts, but a full-page screenshot resets emulation; take measurements first.
* In this project's earlier tooling, regexes written through several layers of quoting got their backslashes doubled. Verify with Python `repr()`, and prefer `String.raw`.

**Useful commands:** `npx tsc --noEmit`, `npm run build`, `npm run dev`, `python tests/tenant_api_test.py`.

**Glossary:** institution = tenant = customer; station = a hospital department role a student plays; class session = one teaching period with its own numbering and role choices; owner = first teacher of an institution; platform owner = the founder.

**Reminder:** the original single-institution platform is the foundation and the reference for behaviour. When fixing a bug in either, port the fix to the other deliberately (diff the two repos periodically); do not merge them.
