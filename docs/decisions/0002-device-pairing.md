<!-- Records D4 and D14; describes the pairing backend as implemented on 3 Nov (pairingService.ts). -->
# ADR 0002: pair the older person's phone with a single-use 6-digit code

Date: 4 November 2026

Status: accepted (D4, D14); backend and `/svarzhi` page implemented on 3 November (W1-07). The family pairing screen with QR and the device list are Week 2 work (W2-07).

## Context

The protected person is often an older person on a cheap Android phone. They must be able to start a call check in seconds, during a stressful call, without a login screen. They should never have to remember a password or open an e-mail. At the same time, a paired phone can start checks and read that person's data, so the way a phone becomes "logged in" is a security boundary that the jury will question.

The brief ([D4, section 6.1](../PROJECT_BRIEF.md#61-protected-person-login-by-device-pairing-d4-working-decision)) asks for a family member to pair the phone once with a short code, after which the phone stays signed in and can be revoked. It suggested Supabase anonymous sign-in with a server-created user as the fallback. [D14](../PROJECT_BRIEF.md#0-decision-log-decided-on-2-november-2026) made the fallback the main design.

## Options

| Option | Benefit | Limitation for this project |
|---|---|---|
| **Server-created device user after a correct code** | Nothing is created until the code is right; revoking = deleting one auth user; RLS sees only normal users with a role | More code to write and defend; we must handle the half-created-account case |
| Supabase anonymous sign-in, then bind the user with the code | Built into Supabase; less custom code | Every visit to the page creates an auth user before any code is checked, so bots can fill the user table; needs CAPTCHA and clean-up jobs; RLS must handle "anonymous but maybe bound" users |
| E-mail + password for the older person | Standard login, nothing new to build | The older person must remember and type a password; forgotten passwords lock them out exactly when they need help |
| Magic link or SMS code | No password to remember | A magic link needs an inbox the older person can open; SMS costs money (D11) and adds a provider |

## Decision

Use **a single-use 6-digit code that the owner of the protected person creates, and a device login that the server creates only after the code is redeemed** (`src/server/services/pairingService.ts`).

- **Create** (`POST /api/persons/:id/pairing-codes`, owner only): the code comes from `crypto.randomInt` (000000–999999). The database stores only `HMAC-SHA256(code, PAIRING_PEPPER)`, with `expires_at = now + 10 min`; the pepper lives only in environment variables. Older unused codes of that person are deleted first. The plain code is returned once to the owner's screen and never stored. A stranger and a non-owner trusted contact both get 404.
- **Redeem** (`POST /api/pairing/redeem`, guest): rate limits are counted first: **5 tries per IP** (IP stored as an HMAC) and **100 tries for everybody together per 15 minutes**. Then one atomic `UPDATE … SET used_at = now WHERE code_hash = … AND used_at IS NULL AND expires_at > now RETURNING …` finds and consumes the code, so two phones can never use the same code. Wrong, expired and used codes all get the same 400 „Кодът е грешен или е изтекъл.“
- The server then creates a confirmed auth user `device-<uuid>@devices.scamly.invalid` (`.invalid` is reserved and can never receive mail) with a random 32-byte password, sets its role to `protected`, inserts the `devices` row and signs it in once on the server. The password is forgotten: never stored, logged or returned. If any step fails, the half-made account is deleted.
- The session lives in **HttpOnly, Secure (in production), SameSite=Lax cookies**; the refresh token keeps the phone logged in. Audit lines record code creation, pairing and revocation.
- **Revoke** (`DELETE /api/devices/:id`, owner only): the server deletes the device's auth user. Its refresh token dies and the `devices` row and profile go with it (`on delete cascade`); the phone's next request gets 401.

**Why a 6-digit code is enough.** There are 1,000,000 codes. A code lives 10 minutes, and the global limit lets at most 100 guesses per 15-minute window reach the database, whoever sends them; the per-IP limit means an attacker needs at least 20 IP addresses to use even that. The chance of hitting one specific active code during its life is about 100 / 1,000,000 = **0.01 %**. Honest worst case: the windows are fixed, so a window edge inside the 10 minutes can allow up to 200 guesses (0.02 %), and if *k* codes are active at the same moment the chance of hitting any of them is about *k* times higher. The attacker also has to guess when a code is active at all, and a successful guess only reaches the protected person's own data, never the family's account.

## Consequences

Good: the older person never sees a login screen. There is nothing for bots to create, the code is useless after one use or 10 minutes, and a stolen database without the pepper reveals no codes. Revocation is one operation the owner controls. The service gets everything from outside through one `PairingDeps` object, so it is unit-tested against an in-memory fake.

Bad: whoever holds the unlocked phone can use the session, as with any app that stays logged in. iOS Safari may clear storage on sites not opened for a long time and log the phone out (risk R9); re-pairing takes under a minute. The global limit means an attacker can use up the 100 tries and block real pairing for up to 15 minutes; the family then has to wait and try again. If an attacker had both the database and the pepper, active codes would be readable (they expire within 10 minutes). Device accounts appear in the Supabase Auth user list next to real ones, and pairing would break if Supabase ever rejected `.invalid` addresses (checked on 3 November that it does not).

## Current implementation and completion evidence

Implemented: `pairingService.ts` and its repositories, the three API routes and the designed `/svarzhi` page, which also prefills a valid `?kod=` link. `pairingService.test.ts` has 18 tests: create, the HMAC-only storage, owner-only access, cancelled older codes, the same 400 for wrong/expired/used codes with nothing created, the 6th try per IP and the 101st global try → 429, clean-up after a failed step, and revocation leading to 401. pgTAP tests show that even the owner and an admin cannot read `pairing_codes` and a guest cannot insert one. A one-off live smoke test against the real Supabase project passed 33/33 checks on 3 November.

**Not done yet:** the family-side pairing screen with the QR image and the device list with a revoke button (W2-07), and the live demo-role browser check after the demo database is seeded.

Sources within the repository: [brief D4, D14 and 6.1](../PROJECT_BRIEF.md), [pairing flow](../BUILD_PLAN.md#5-device-pairing-flow), [security choices](../WHY_WE_CHOSE.md#3-security-design), [implementation details, section 3.16 and 5.13](../HOW_IT_WORKS.md).
