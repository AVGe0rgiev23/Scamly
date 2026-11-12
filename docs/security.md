# Scamly: security

Task W4-01 (Alex). One row per attack: how Scamly defends against it and which test proves it. W4-02 (Roberta) adds the missing per-attack tests; every row should link to a passing test before the release (W4-08).

## 1. Attacks and defences

| # | Attack | Defence | Where | Test |
| --- | --- | --- | --- | --- |
| 1 | **XSS**: a script hidden in a report, a script card or a name | React escapes all text; no `dangerouslySetInnerHTML` except our two fixed scripts in `<head>`; the CSP allows scripts only from our site, no `eval()` in production, no plugins | `src/config/securityHeaders.ts`, `src/config/inlineScripts.ts` | `src/config/securityHeaders.test.ts` · W4-02: payload rendered as text |
| 2 | **Clickjacking**: Scamly shown inside a hidden frame on another site | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | `securityHeaders.ts` | `securityHeaders.test.ts` |
| 3 | **CSRF**: another site makes the browser send a request with our cookie | Every writing API route checks `Origin` (same site only, else 403); the one exception, the scheduled escalation job, needs its own secret instead; `SameSite=Lax` HttpOnly cookies; `form-action 'self'` | `src/server/security/origin.ts`, `src/server/supabase/cookieOptions.ts` | `origin.test.ts` · W4-02: foreign origin → 403 |
| 4 | **SQL injection** | No SQL strings: Supabase builds parameterised queries; database functions take typed arguments; Zod checks every input first | `src/schemas/`, `src/server/repositories/` | `schemas.test.ts` · W4-02: SQL string as a name |
| 5 | **Guessing pairing codes** | 6 digits valid 10 minutes, one use, stored only as an HMAC; 5 tries per IP per 15 min and 100 in total | `src/server/services/pairingService.ts`, `rateLimit.ts` | `pairingService.test.ts`, `rateLimit.test.ts` · W4-02: brute force → 429 |
| 6 | **Password guessing / mass sign-ups** | 10 logins per IP per 15 min, 5 registrations per IP per hour; same message for a wrong e-mail and a wrong password | `rateLimit.ts`, `authService.ts` | `authService.test.ts` |
| 7 | **IDOR**: opening another family's person or check by changing the id | RLS on every table **and** role/ownership checks in each service; unknown and forbidden ids both answer 404 | `supabase/migrations/*rls*`, `src/server/services/` | pgTAP `supabase/tests/02–08`, `personService.test.ts` · W4-02: other family's id → 404 |
| 8 | **Spam reports / alert spam** | Honeypot field, 3 reports per IP per hour and 100 in total; 10 checks per paired phone per hour | `reportService.ts`, `checkService.ts` | `reportService.test.ts`, `report.spec.ts` |
| 9 | **Leaked personal data** | Phone numbers, card numbers and names are removed from free text before storing; caller numbers kept only as an HMAC; no call details in e-mails or push | `src/engine/redact.ts`, `src/server/security/hash.ts` | `redact.test.ts`, `hash.test.ts`, `alertEmail.test.ts` |
| 10 | **Stolen secrets** | Keys only in environment variables (`.env.local`, Vercel settings); `server-only` makes the build fail if browser code imports server code; secret scan below | `src/lib/env.ts`, `src/server/supabase/adminClient.ts` | `env.test.ts` |
| 11 | **Open redirect** after login (`?next=https://evil…`) | Only paths on our own site are accepted | `src/config/routes.ts` (`safeNextPath`) | `routes.test.ts` |
| 12 | **Downgrade to http / sniffing** | HSTS two years, `upgrade-insecure-requests`, `X-Content-Type-Options: nosniff` | `securityHeaders.ts` | `securityHeaders.test.ts` |
| 13 | **Privilege escalation** (a family member makes themselves admin) | Role changes only through the admin API: compare-and-set, never your own role, never a phone; written to the append-only audit log | `adminService.ts` | `adminService.test.ts`, pgTAP `07_admin_audit` |

## 2. Security headers (every page and API answer)

Set in `next.config.ts` from `src/config/securityHeaders.ts`:

| Header | Value (production) |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' <Supabase https> <Supabase wss>; worker-src 'self'; manifest-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` (`no-referrer` on `/pokana` and on login/registration with `next`) |
| `Permissions-Policy` | `camera=(), microphone=(self), geolocation=(), payment=(), usb=(), bluetooth=(), browsing-topics=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |

The service worker `/sw.js` keeps its own stricter CSP (`default-src 'self'; script-src 'self'`).

### Why `'unsafe-inline'` for scripts (decision D27)

The plan said "CSP with a nonce". A nonce is a random value per request that marks the page's own inline scripts. Next.js writes small inline scripts into every page (the data React needs to start), and their text differs per page, so they can't be allowed by a fixed hash either. The Next.js 16 docs (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) say a nonce needs every page to be rendered on every request and **does not work with Partial Prerendering**, which Scamly uses (Cache Components). We tested a hash-only policy on a production build: every page stopped working.

So we keep pre-rendered, fast pages and allow inline scripts, while every other rule stays strict (scripts only from our own domain, no `eval()`, connections only to us and Supabase, no plugins, no frames, forms only to us). React escaping all text remains the main protection against injected scripts (row 1). Checked on a production build: 12 pages, 0 CSP violations, every page starts.

We would switch to a nonce if we ever turned off Partial Prerendering.

## 3. Checks done on 12 Nov 2026

| Check | Result |
| --- | --- |
| `npm audit --omit=dev` (what runs in production) | **0 vulnerabilities** |
| `npm audit` (with development tools) | 8 moderate, all in `minimatch` inside the TypeScript ESLint parser (lint only, never shipped); the only fix is a breaking force-upgrade, so we wait for the upstream release |
| Secret scan of every commit in the checkout (Supabase secret/service keys, JWTs, Brevo, Resend, Google, Groq and GitHub tokens, private keys, `*_PEPPER=` / `*_KEY=` values) | **0 findings**; only `.env.example` (names, no values) is committed |
| Lighthouse (12 Nov, live) | First run found one CSP violation: Zod's `eval()` test on the call check. Fixed with Zod `jitless` (`src/lib/zod.ts`); see `docs/evidence/lighthouse-2026-11-12.md` |
| CSP on a production build (`/`, `/vhod`, `/svarzhi`, `/kak-raboti`, `/karta`, `/signal`, `/karta-za-hladilnik`, 404 and the preview pages of every role) | **0 violations** |
| securityheaders.com on the live site (12 Nov, 20:05 UTC) | **Grade A**: all six checked headers present; capped at A (not A+) only by the expected `'unsafe-inline'` warning (D27). Screenshot: `docs/evidence/securityheaders.png` |

GitHub's own secret scanning (repository Settings → Code security) should stay switched on for new pushes.
