# Juror demo kit (P-12) and time-to-answer (P-09)

How a juror's own phone becomes "the real son" of a demo family in about 20 seconds, so the juror can answer „Не съм аз“ live, and how we read the measured time-to-answer for the slides. Design and reasons: `HOW_IT_WORKS.md` 3.51, `WHY_WE_CHOSE.md` "Juror demo kit: an invite + a quick registration".

## What the kit makes

- **Иван Петров** (owner, account `ivan@demo-kit.scamly.invalid`; the reserved `.invalid` domain is the tag of everything the kit creates).
- **Мария Петрова** (protected, district София-град), with Иван in her contact list.
- **One invite for the juror** as „Георги“ at **place 1** (Иван moves to place 2), so Георги is the first tile on Мария's phone. Single use, valid **3 hours**.
- A **QR picture** of the invite link: `demo-kit/juror-invite.png` (git-ignored; it holds a live link).
- While no phone is paired yet: a **6-digit pairing code** for the demo phone (10 minutes).

It never prints a key or a password. Иван's password is random and not shown, unless Alex sets `SCAMLY_DEMO_PASSWORD` (12–72 characters) to log in as Иван on a second phone.

## What Alex needs

- `.env.local` with the keys of the database to use (the live one for the defense): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAIRING_PEPPER`, `HASH_PEPPER`. The peppers must be **the same as on Vercel**, or the invite and the pairing code will not work on the live site.
- `SCAMLY_DEMO_KIT=1` on the command line. Without it the script refuses and writes nothing; in CI it always refuses.
- Optional: `SCAMLY_DEMO_SITE_URL` (default `https://scamly-ag777.vercel.app`), `SCAMLY_DEMO_PASSWORD`.

## Step by step

**Before the defense (once, ~5 min):**

1. `SCAMLY_DEMO_KIT=1 npm run demo:kit`
2. It prints „No demo phone is paired yet … enter: 123456“. On the demo phone (Мария) open `/svarzhi` and enter the code. The phone stays paired for every later run.
3. Put `demo-kit/juror-invite.png` on the slide „Бъдете истинският Георги“.

**Right before the demo (~10 s):** run `SCAMLY_DEMO_KIT=1 npm run demo:kit` again. It removes the last juror, makes a **new** link and QR (the old one stops working) and keeps the paired phone. Update the QR on the slide (or show the file full-screen).

**Live (≈ 20–40 s for the juror):**

1. The juror scans the QR → „Поканени сте…“ → **„Регистрация“** → name, any e-mail, a password (10+ characters) → „Създай профил“. They come back to the invite at once: „Вече сте близък на Мария Петрова на място 1.“
2. The juror opens **„Сигнали“** (`/family/alerts`) and keeps it open (or allows notifications).
3. A second juror plays the scammer: „Мамо, Георги е, катастрофирах, трябват ми пари!“
4. On Мария's phone: the big button → **„Да“** → the first tile **„Георги“**. The 45 s ring starts; the check goes on below.
5. The juror's page shows „Отговорете сега“ → **„Не съм аз — обаждам ти се сега!“**
6. Мария's phone turns red: „Това НЕ е Георги. Затворете телефона.“ The juror can call the demo phone at once.
7. Optional: on the red screen „Изпратете анонимно на картата“ (P-11) puts a pending report into the moderation queue.

**After the demo:** `SCAMLY_DEMO_KIT=1 npm run demo:reset` removes the juror from Мария's list and deletes the juror's account **only if it exists only for the demo** (it joined through the demo invite, owns nobody and is in nobody else's list; otherwise only the link is removed and the script says „kept“). It also clears the demo checks, questions and open invites, and puts Иван back to place 1. `SCAMLY_DEMO_KIT=1 npm run demo:reset -- --all` deletes the whole demo family (Иван, Мария, her paired phone).

The append-only audit log keeps its lines about the demo (invite created/redeemed, pairing), like every other action.

## How we know it works

- `scripts/demo-kit.test.ts` (9 tests): refuses without `SCAMLY_DEMO_KIT=1` and in CI, before reading any key or printing anything; only `kit`, `reset`, `reset --all`; site URL must be a plain origin; password length; only its own error messages are printed; the reset deletes only a demo-only juror account; the kit's own e-mail domain.
- `tests/roundtrip/demo-kit.spec.ts` (two browsers on a real local Supabase, `npm run e2e:roundtrip`): the kit prints a pairing code and a link and no key; the demo phone pairs; the juror registers through the invite and lands on place 1; Мария chooses „Георги“, the juror answers „Не съм аз“, the phone shows „Това НЕ е Георги.“; `demo:reset` removes 1 link and deletes 1 account; a second kit run keeps the paired phone. Passed 27 Nov 2026 (7 s).
- **To do (Alex, Roberta):** rehearse twice on two real phones against the live site (BUILD_PLAN P-12 "done when").

## Time-to-answer (P-09)

`supabase/ops/time_to_answer.sql` is one read-only `SELECT` (it changes nothing). Paste it into the Supabase SQL Editor after rehearsals and family tests; change the date in `since` to count only from the first rehearsal on. It shows the number of answered questions (`not_me` + `its_me`), the **median** and **p90** seconds between `created_at` and `answered_at` (both set by the database, not by a phone), and the fastest and slowest. Write the numbers and the date here before the slides:

| Date | Answered | Median (s) | p90 (s) | Notes |
|---|---|---|---|---|
| — | — | — | — | after the rehearsals |
