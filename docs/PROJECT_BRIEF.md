# Scamly — Project brief and starter prompt for Claude Code

> **How to use this file:** Paste this whole file into Claude Code (Opus 5.5) at the start of the project, inside the project repo. Save it in the repo as `docs/PROJECT_BRIEF.md`. Update section 0 (Decision log) whenever a decision changes. Section 13 is for improving the idea later.
>
> **Your first job is in section 15:** write the implementation and build plan, *then* start building Week 1.

---

## 0. Decision log (decided on 2 November 2026)

These are settled. Don't re-open them unless something blocks you; if it does, explain why and propose an alternative.

| # | Topic | Decision |
|---|---|---|
| D1 | Product name | **Scamly**. Repo slug `scamly`. The name is in Latin script, but **all UI text is in correct literary Bulgarian**. Bulgarian tagline in the UI: „Обаждат ли ви се за пари? Проверете за 30 секунди.“ (can be refined). |
| D2 | Team | **Alex Georgiev** (GitHub `AVGe0rgiev23`) and **Roberta Hristova** (GitHub `RFHirstova23`). Both are 11th grade. Both know **Python** well. Roberta is **not yet comfortable with TypeScript** and will learn it during the project. Both are fine with SQL, React concepts and the rest of the stack. |
| D3 | Where we work | Directly **inside the GitHub repo**, using Claude Code in the cloud. Feature branches + pull requests, reviewed by the other teammate. Meaningful commits from **both** authors. |
| D4 | Login for the older person | See section 6.1. The family member creates the protected person's profile; the older person's phone is **paired once** with a 6-digit code or QR code and then **stays signed in**. The older person never types a password or email. *Working decision; may be revised later.* |
| D5 | Email provider | **Brevo free tier** with single-sender verification (no domain needed). Code it behind an `EmailProvider` interface so **Resend** (needs our own domain) or **no email at all** can be swapped in by changing config only. |
| D6 | AI provider (Layer 2) | Free tiers only. Start with **Google Gemini free tier**; add **Groq** free tier as a second provider. Everything sits behind a `ScamClassifier` interface. Later Alex may add an open-source **router that tries several free-tier LLMs in turn**. Design for that now: a `ClassifierChain` that tries providers in order with a timeout each and **always ends with the rule-based engine**. Built in Week 3. |
| D7 | Live demo alert path | Primary: a **live alert status page** for the family member using **Supabase Realtime** (works on every phone, nothing to install). Secondary: **web push** (on iPhone it only works after "Add to Home Screen", iOS 16.4+) and **email**. In the demo we also bring **our own phone already logged in as the family member**, in case the jury's phone fails. |
| D8 | Escalation chain | The data model supports an **ordered list of trusted contacts** per protected person from day one (priority 1, 2, 3...). The escalation *logic* (nobody answered in N minutes → notify the next contact → suggest calling 112) is a **Week 3 stretch goal**. |
| D9 | Green verdict wording | A green result **never says "it's safe"**. It says: „Няма типични признаци на измама. Ако се съмнявате, затворете и се обадете сами на близкия си на номера, който знаете.“ A false "safe" is the worst possible bug in this app. |
| D10 | Hard rules in the detection engine | Some combinations **force a red verdict regardless of score**, e.g. caller claims to be police + asks for money or valuables; anyone asks you to throw or hand over money/valuables to a stranger or courier; "don't tell anyone" + money. Each hard rule has a name, a Bulgarian explanation and its own tests. |
| D11 | Budget | ~€0. Free tiers only. **Ask before adding any paid service.** (Buying a cheap domain later is a possible exception, decided by us.) |
| D12 | Cut order if we run late | AI layer → voice input → escalation logic → Telegram/Viber. The **call check, family alert, map, security and tests must not be cut.** |
| D13 | Git workflow (added 2 Nov) | **One branch only: `main`.** No feature branches or pull requests. Commits are authored only by Alex or Roberta (no co-author lines). Claude pushes only after the author says "push". |
| D14 | Device pairing detail (added 2 Nov) | The server creates the device's login only after a correct pairing code (the brief's fallback option in 6.1), not Supabase anonymous sign-in. See `BUILD_PLAN.md` section 5. |
| D15 | Name check (added 2 Nov) | "Scamly" is also used by an existing scam-protection app (Scamly Pty Ltd). **We keep the name for now**; it lives in one constant so a rename stays cheap. |
| D16 | Plan is living (added 2 Nov) | The team may change any idea or feature at any time. Process: `IMPLEMENTATION_PLAN.md` section 2. Ideas menu: `IDEAS.md`. Change history: `CHANGES.md`. |
| D17 | Work split (added 3 Nov) | **Alex leads the backend, Roberta leads the frontend, but the split is mixed.** Both may work on both sides. If one of us doesn't like something on the other's side, or has a better idea, we tell the other person first and then make the change ourselves (in our own session, under our own name); the area owner reads the commit afterwards. "Owner" = the person who mainly builds it and must explain it in the defense. It does **not** mean the other person may not touch it. Details: `BUILD_PLAN.md` section 6, `IMPLEMENTATION_PLAN.md` sections 1 and 5. |
| D18 | Detection engine split (added 3 Nov) | **Alex** builds the engine logic: types, normalise, transliterate, fuzzy, signals, scoring, hard rules, verdict, `redactPersonalData()`, and plugging it into the API. **Roberta** writes the Bulgarian keyword/phrase dictionary (`src/engine/dictionary.ts`), the шльокавица and typo examples, and the test *cases* (real scam phrases, legitimate calls that must not be red, edge cases): the scenario tables the tests run on. **Both** must be able to explain the whole engine. |
| D19 | Two living explanation files (added 3 Nov) | `docs/HOW_IT_WORKS.md` (what works, how it works and why it works like that, for every part of the project) and `docs/WHY_WE_CHOSE.md` (for every technology, library, service, tool or design choice: why this one instead of the alternatives). **Rule: every time anything is used, added, changed or removed, both files are updated in the same commit.** By the end they explain the whole system for the documentation and the defense. Written in English. |
| D20 | Week 1 rebalance (added 3 Nov) | Alex had ≈ 31.5 h of Week 1 work left, Roberta ≈ 15.5 h. **Option A:** the seed script (W1-12, 3 h) moves to **Roberta**; it starts after Alex's pairing (W1-07), because the seed creates an already-paired demo device. The deploy (W1-13, 2 h) **stays Alex's but moves to Monday 9 Nov**. New Week 1 totals: Alex ≈ 45.5 h (28.5 h left), Roberta ≈ 18.5 h. Details: `BUILD_PLAN.md` section 6, `IMPLEMENTATION_PLAN.md` sections 5 and 6. |
| D21 | Two AI tools, one set of rules (added 3 Nov) | **Alex** works with **Claude Code in the cloud**; **Roberta** works with **OpenAI Codex on her own computer**. Codex reads `AGENTS.md`, not `CLAUDE.md`, so **all project rules live in `AGENTS.md`**, shared by both tools; `CLAUDE.md` only imports it. Rules are tool-neutral ("the AI agent"). **No AI attribution of any tool in commit messages** (no `Co-Authored-By`, no session links, no "generated by"). On Roberta's computer, commits use her own local git config; the agent only checks the name is "Roberta Hristova". Pull before starting, push after finishing. |
| D22 | Site layout task (added 4 Nov) | The deployed app looked unfinished: the theme selector was a full-width form field on every page, there was no header, menu or footer, and the home page was still the day-1 placeholder. New task **W2-13 (Roberta, 4 h): site layout + home page**, done before W2-01 so every new page gets the frame. Details: `BUILD_PLAN.md` section 6. |
| D23 | Mixed split for the rest of the project (added 4 Nov) | Decided by Alex, agreed with Roberta. **Both work on backend and frontend.** For all **remaining** tasks (Weeks 2–5; done tasks keep their owners): **Alex ≈ 63 % of the remaining backend and ≈ 39 % of the remaining frontend; Roberta ≈ 37 % of the backend and ≈ 61 % of the frontend; shared tasks split half/half.** Remaining hours: **Alex ≈ 71 h, Roberta ≈ 76 h** (Roberta slightly more because Alex did more in Weeks 1–2). New task **W2-14** (Roberta, 1 h): the `/pokana` invite page. **Commit style (honest, equal history):** Roberta makes one commit per step, Alex one commit per task; every commit is real work by its author. Expected end: about 65–70 commits each. Each of us must explain our own backend and frontend parts in the defense. Owners per task: `BUILD_PLAN.md` section 6, `IMPLEMENTATION_PLAN.md` sections 1 and 5. |
| D24 | Commit signing (added 6 Nov) | Commits are **not** cryptographically signed (no "Verified" badge). Signing is optional in git; GitHub shows no badge on unsigned commits by default; authorship is shown by our GitHub accounts and every change passes CI. Revisit only if we want the badge: then each person adds an SSH signing key for future commits; old commits are never rewritten. |
| D25 | Map data and moderation details (added 10 Nov) | Decided by Roberta for W3-03/W3-04. The district shapes come from **Natural Earth** 1:10m Admin 1 v5.1.2 (**public domain**), not OpenStreetMap: they have exactly our ISO codes BG-01…BG-28, could be downloaded reproducibly, and need no ODbL terms (we still credit „Natural Earth“ on the map). The map uses Leaflet **without base-map tiles** and is fixed (no drag/zoom): no third-party tile server sees visitors, no tile usage policy, faster on 4G. Moderation is compare-and-set (only a pending report can be approved or rejected, else 409) and shows moderators only a repeat-caller count, never the number's hash. |
| D26 | Frontend redesign v2 „Signal“ (added 12 Nov) | Decided by Alex. The second restyle still looked like a generic template, so the whole visual layer was deleted and rebuilt on a new design system: dark-first near-black canvas, one accent colour (Signal Cyan) for actions, red/amber/green/slate only for verdict meanings, Bulgarian-made Sofia Sans with JetBrains Mono for data, and the signal line (jagged = scam, calm = no typical signs) as the product's motif. Logic, API, engine, database and texts are unchanged. Work happens on the branch `redesign/scamly-v2` and is merged into `main` only after both of us have looked at it (an exception to "main only" in D13 for this one large change). Details: `docs/redesign/`. |
| D27 | CSP without a nonce (added 12 Nov) | Decided by Alex in W4-01. The plan said "CSP with a nonce". The Next.js 16 docs say a nonce needs every page rendered on each request and does not work with Partial Prerendering, which Scamly uses; a hash-only policy, tested on a production build, stopped every page. So the CSP allows inline scripts (`'unsafe-inline'`) and keeps every other rule strict (scripts only from our domain, no `eval()`, connections only to us and Supabase, no plugins, no frames, forms only to us), plus HSTS, nosniff, X-Frame-Options, Referrer-Policy and Permissions-Policy. React escaping stays the main XSS defence. Revisit only if we turn Partial Prerendering off. Details: `docs/security.md`. |

**Open items (we will decide as we go; propose a default and keep it easy to change):**
- ~~Final work split between Alex and Roberta (see section 11).~~ Decided 3 Nov: D17, D18.
- Whether to buy a domain (would enable Resend and a nicer URL).
- Our teacher/mentor (ръководител) details for the documentation.
- Whether "Scamly" is already used by an existing company or product. If it clearly is, flag it to us; the regulation forbids company advertising, and we don't want to look like we're promoting one.

---

## 1. Your role

You are our senior engineer, technical mentor and competition coach. We are a team of **two 11th-grade students** from Bulgaria building a project for the **National Autumn IT Tournament „Джон Атанасов“ 2026/2027** (Sofia, **4–6 December 2026**). We compete in the **„Разпределени приложения“ (Distributed Applications)** category for grades XI–XII. Our goal is to **win**.

How we want you to work:
- Work **phase by phase** (section 12). At the start of each phase, give a short plan, then build.
- Prefer **simple, robust, well-tested** solutions over clever ones. Everything must work live in front of a jury.
- **We must defend every part of the code ourselves** in a 15-minute oral defense. If we can't explain it, don't build it that way.
- **Because we both know Python and Roberta is still learning TypeScript:** keep TypeScript plain and readable (no advanced generics or type gymnastics). When a TypeScript idea is new, add a one-line comment comparing it to the Python equivalent where that helps (e.g. `// like a Python dataclass`). After each phase, write a short "what you need to understand" note in `docs/learning/` covering the key concepts used in that phase.
- Tell us honestly when something is too risky for our timeline.
- Code, comments and docs in English are fine. **The entire user interface must be in correct, literary Bulgarian.** Spelling and grammar are scored. Keep all UI strings in one place (`src/i18n/bg.ts`) so they can be proofread in one file.
- Ask us before adding paid services.

---

## 2. Hard constraints from the official regulation (must not break)

| Rule | What it means for us |
|---|---|
| Registration on the host school's website **in Bulgarian**, deadline **29.11.2026**. No late entries | A working, deployed version must exist before 29.11 |
| Project must be **published online and accessible** from registration until the end of the tournament | Stable hosting; nothing may sleep or pause during judging |
| **Test accounts for every role** and every access level must be given to the jury | Seed script that creates demo accounts for all roles |
| **Source code is mandatory**, uploaded online with docs and presentation | Public GitHub repo + Google Drive folder |
| Max **2 authors**; **both** must take part in the defense | Clear split of work so both of us can explain our part |
| Defense = **15 minutes including questions** | Demo script ≤ 8 minutes |
| **No company advertising** (except registered student companies), no political propaganda | No branding of any private business. Neutral, civic tone |
| Must solve a **concrete problem in the scientific or social sphere** | Phone scams against older people in Bulgaria |
| Documentation: **max 5 A4 pages**, Times New Roman 12, line spacing 1.5, fixed structure (section 10) + **1 printed promo leaflet** | Plan the docs from day one |
| Final version on a **labelled flash drive**; bring own laptop | Offline-capable demo backup (video + local build) |
| Declaration that we used **licensed or free software** and the product is given under **GNU GPL** to the education system | License the repo as **GPL-3.0**; track all third-party assets in `THIRD_PARTY_LICENSES.md` |

---

## 3. Scoring criteria (100 points): design everything around these

**General characteristics: 20 pts.** Originality of topic/solution, clarity and significance of goals, completeness of functionality, degree of completion, credibility, relevance, applicability, new or innovative use of technology.

**Design: 25 pts.**
- Appropriate technologies, used for their purpose and efficiently.
- Architecture: well-structured layers and modules, **separation of UI from business logic**, stability and security.
- UI/UX: clear navigation, aesthetics, user interaction.

**Implementation: 35 pts.**
- Code quality: naming, readability, **comments**, standards, data protection, valid code, efficient use of resources.
- System quality: speed, easy installation and operation, **stability and security, protection from common attacks**, error handling, **use of version control (git)**, **automated testing**.
- UI/UX: layout, **original components and design**, readability, **correct Bulgarian**, compatibility (screen sizes, **colour modes** such as light/dark).

**Presentation and defense: 20 pts.** **Validation and verification (evidence from testing)**, user documentation, well-structured system description, promo materials, presentation (behaviour, timing, focus on what matters), defense (answering questions, arguments).

→ Teams usually lose points on **tests, security, documentation and Bulgarian language**. We will not.

---

## 4. The problem (use in docs and presentation)

- Phone scams against older people are one of the most widespread crimes in Bulgaria. Typical scripts:
  - **„Полицай“**: "we are catching scammers, help us by handing over your money".
  - **„Роднина в беда“**: "your son caused an accident" or "your daughter needs urgent surgery".
  - **„Фалшив служител“**: bank, electricity company or NHIF (НЗОК) employee.
  - **„Колет/куриер“**: fake courier.
  - Victims often throw money from the balcony or hand it to a courier.
- Few perpetrators are caught (reports cite roughly 1 in 10 suspects identified). Prepaid SIM cards make tracing hard.
- Bulgaria's population is ageing, and many older people live alone in villages while their children live in other cities or abroad. **The family isn't there in the critical 10 minutes of the call.**
- Existing solutions are awareness campaigns (talks, leaflets) and police warnings. These don't help *during* the call.

Sources to cite (**verify the current figures before using them**; never invent statistics):
- AFP / Gulf News: *Brazen phone scammers terrorise Bulgaria's elderly*
- BNT, Novinite, Sofia Globe police reports on telephone fraud (2024–2026)
- Plovdiv24 / NOVA: losses of over 3.5 million (Jan 2023 – Sep 2024) to telephone fraud
- Eurostat / NSI data on population ageing in Bulgaria

**Our insight:** The scam works because the older person is **isolated and rushed**. Scammers keep them on the line and forbid them to tell anyone. **We break the isolation in under 30 seconds.** One button connects the person to their family and gives them a clear "this is a scam" signal.

---

## 5. The product

**Name:** Scamly.
**One-liner:** One big button that lets an older person check a suspicious call and instantly alerts their family. It's backed by detection of the scam scripts actually used in Bulgaria and a public map of scam waves by region.

### 5.1 Roles (each needs a demo account)

1. **Защитен (protected person)**: the older person. An extremely simple interface. Signs in by device pairing (D4), not a password.
2. **Близък (family member / trusted person)**: creates and pairs protected people, receives alerts, sees their history, can call back.
3. **Модератор (moderator)**: reviews public reports before they appear on the map, and manages the scam-script library.
4. **Администратор (admin)**: users, roles, statistics, system settings, audit log.
5. **Гост (guest, no login)**: can see the public map and the educational „Как работи измамата“ pages, and can submit an anonymous report.

### 5.2 Core features (MVP, must work flawlessly)

**A. „Проверка на обаждане“ (call check), the protected person's view**
- Giant button: **„Обаждат ми се за пари!“**
- Then 3–4 huge yes/no questions with icons:
  - "Who do they say they are?" (police / relative / bank / courier / other)
  - "Do they want money or valuables?"
  - "Are they rushing you or telling you not to tell anyone?"
- Optional: speak or type what the caller said (browser speech-to-text; text fallback). Voice works best in Chrome on Android; always offer typing.
- Result screen in **under 5 seconds**: a big red / yellow / green verdict in plain words, e.g. **„ТОВА Е ИЗМАМА. Затворете телефона. Полицията никога не иска пари.“** Green follows D9. Then a one-tap button **„Обади се на [име]“** (a `tel:` link to the first trusted contact).
- A check can also be started **after** the call has ended.
- Accessibility: very large fonts (min 18px base, much larger on this screen), high contrast, minimal text, works on cheap Android phones, no complex navigation.

**B. Family alert („Семеен щит“)**
- When a check is started, **every linked family member is notified immediately**: who, when, what the caller claims, and the risk level.
- Channels (D7): **live status page via Supabase Realtime** (primary) + **web push** (PWA, VAPID) + **email via Brevo** (D5). Telegram or Viber bot as a stretch goal.
- The family member sees a live status page and an **„Обаждам ѝ се сега“** button. The protected person's screen then shows „Иван ще ви се обади веднага“.
- Linking accounts: see section 6.1.

**C. Detection engine („Разпознаване“)**
- **Layer 1, rule-based (always works, explainable):** a weighted scoring of the yes/no answers, **hard rules** (D10), and a Bulgarian keyword/phrase matcher for known scripts. Handle word stems, **Latin-script Bulgarian („шльокавица“)**, and typos. Output: a score from 0–100, the risk level, the matched script type, the triggered hard rules, and a list of reasons in Bulgarian.
- **Layer 2, AI (optional enhancement, Week 3, D6):** an LLM classifies free text into a script type and explains why. Every provider call has a **timeout** and the chain **falls back to Layer 1**. **Never send personal data** (names, phone numbers, addresses, IBANs) to the AI. Strip them first with a tested `redactPersonalData()` function.
- The final verdict combines both layers. **The rules are the safety net: AI may raise the risk level but may never lower a red verdict from Layer 1.** The **explanation of *why* it's a scam** is shown to the user and is educational.
- This engine is our "algorithm" for the defense. It must be **pure TypeScript with no framework dependencies**, clean, documented and **heavily unit-tested** (a test case for every known script, Cyrillic and Latin-script variants, typos, and legitimate calls that must NOT be flagged red, e.g. a real grandchild calling to say hi, a real bank appointment reminder that asks for nothing).

**D. Public scam map („Карта на измамите“)**
- Anonymous reports, aggregated by **district (област)**, never by exact address (privacy).
- Shows "scam waves": e.g. „Тази седмица в област Бургас: 14 сигнала за схемата „Полицай““.
- Moderation queue before publishing. Spam protection (rate limiting + honeypot field; CAPTCHA only if needed and free, e.g. Cloudflare Turnstile).
- District GeoJSON from OpenStreetMap-derived data: **show the ODbL attribution on the map** and record it in `THIRD_PARTY_LICENSES.md`.

**E. Education („Как работи измамата“)**
- Short cards for each script: how it starts, what they say, what to do. Usable by grandchildren to explain to grandparents.

**F. Dashboards**
- Family: protected people, trusted-contact order, history of checks, alerts, paired devices (with "revoke").
- Moderator: queue, script library editor.
- Admin: users and roles, statistics charts (checks per day, script types, regions), audit log.

### 5.3 Stretch goals (only after MVP is solid)
- Escalation chain logic (D8).
- Telegram / Viber bot notifications.
- Family secret word: a question only the real relative knows, set in advance.
- Weekly "scam wave" email digest for family members by region.
- Large-text printable "fridge card" with what to do and the pairing QR code (also useful as promo material).
- PWA offline display of the "what to do" card.
- Multi-provider free-LLM router (D6).

### 5.4 Explicitly out of scope
- **No recording or intercepting of phone calls.** This is legally problematic and technically impossible from a browser. The user reports what was said.
- No storing of caller phone numbers in public. Any number entered is stored privately and **hashed** for duplicate detection.
- No real-time integration with the police or telecoms (mention it as future work).

---

## 6. Architecture and stack (challenge it if you see a better fit, but explain why)

- **Frontend + backend:** Next.js (App Router) + TypeScript (strict), with route handlers as a **REST API layer** (the category expects client–server and REST). Use the current stable Next.js version.
- **Database / auth / realtime:** Supabase (PostgreSQL, Auth, **Row Level Security**, Realtime for live alert status).
- **Styling:** Tailwind CSS with our **own design system and components**, plus **light/dark mode**. Accessibility: WCAG AA contrast.
- **Map:** Leaflet + OpenStreetMap with GeoJSON of Bulgarian districts (choropleth).
- **Notifications:** Supabase Realtime (primary), Web Push (VAPID), email via `EmailProvider` → Brevo (D5).
- **AI layer:** `ScamClassifier` interface + `ClassifierChain` (Gemini → Groq → rule engine), D6.
- **Validation:** Zod on every input, both client and server.
- **Testing:** Vitest (unit, especially the detection engine), Playwright (end-to-end for the main flows of every role), coverage report.
- **CI/CD:** GitHub Actions running lint + type-check + tests on every push and PR; deploy to Vercel.
- **Hosting:** Vercel + Supabase free tiers. **Supabase free projects pause after about a week without activity**: add a scheduled keep-alive (e.g. a GitHub Actions cron hitting a health endpoint that touches the DB) plus an external uptime ping.

Layers (keep them strictly separated; we'll show this diagram in the defense):
```
UI (pages, components)  →  API layer (route handlers, auth checks, Zod validation)
                         →  Services / business logic (detection engine, alerts, pairing, reports)
                         →  Data access (repositories)  →  PostgreSQL (RLS)
```

### 6.1 Protected-person login by device pairing (D4, working decision)

1. The family member (normal email + password account) creates a **protected person profile** (name, district, trusted contacts in order). No email or password for the older person.
2. The family member taps „Свържи телефон“ → the server creates a **pairing code**: 6 digits + a QR code containing it, **single use, expires in 10 minutes**, stored **hashed**, rate-limited.
3. On the older person's phone, the family member opens Scamly and enters the code or scans the QR. The device gets its own Supabase session (suggested: **Supabase anonymous sign-in**, then the server redeems the code and binds that `auth.uid()` to the protected profile with role `protected`). If anonymous sign-in proves awkward, fallback: the server creates an auth user with a generated internal identifier and random secret and signs the device in.
4. The session is **long-lived** (refresh token), so the older person never sees a login screen. The app installs to the home screen as a PWA.
5. The family member sees all **paired devices** and can **revoke** one (deletes the binding and signs the device out).
6. All of this is enforced by RLS: a protected device can only read/write its own profile and checks.

Document the security reasoning in `docs/decisions/` (ADR format) so we can defend it.

---

## 7. Security and privacy (scored, and the jury will ask)

- Authentication with roles; **authorisation checked on the server *and* enforced by RLS**.
- Protection against: SQL injection (parameterised queries / Supabase client), XSS (no `dangerouslySetInnerHTML`, CSP headers), CSRF, brute-force logins and pairing-code guessing (rate limiting, short expiry), IDOR (every resource access checks ownership), and spam on public forms.
- Secrets only in environment variables, never in the repo. Add a `.env.example`. The Supabase service-role key is used **only** on the server.
- GDPR thinking: data minimisation, district-level location only, deletion of account and data on request, a clear privacy notice in Bulgarian, and an audit log for admin actions.
- Older people are vulnerable users. **No dark patterns, no ads, no tracking.**
- Prepare a short "security" slide listing each attack and our protection, **plus a test proving each one**.

---

## 8. Quality bar

- Git from day one: meaningful commits from **both** authors, feature branches, pull requests reviewed by the other teammate.
- Lint (ESLint) + format (Prettier) + strict TypeScript.
- Every module has a short header comment explaining its purpose. Comment non-obvious logic.
- Error handling: friendly Bulgarian error messages for users, structured logs for us, no white screens (error boundaries).
- Performance: main pages load fast on a slow 4G phone. Check with Lighthouse and save the screenshots as evidence in `docs/evidence/`.
- **Testing evidence** for the jury: test report, coverage %, Playwright run, Lighthouse score, and a short usability test with 3–5 real older people (relatives) with notes. Even an informal test is strong evidence.
- Seed script: `npm run seed` creates demo data and **test accounts for all roles** (including a protected person already paired to a demo device flow). Keep a demo-accounts table in the README.
- README with setup in under 5 commands.

---

## 9. Detection engine: minimum test cases

At least 25 unit tests in Week 1, including:
- Each script („Полицай“, „Роднина в беда“, „Фалшив служител“ (bank / ЕВН/енергото / НЗОК), „Колет/куриер“) from answers only, from text only, and from both.
- Each hard rule (D10) forces red.
- Latin-script variants (e.g. "politsiya", "sinat vi katastrofira", "hvarlete parite ot terasata") and common typos.
- Legitimate calls that must **not** be red: a grandchild calling to chat; a real bank reminder asking for nothing; a doctor's appointment reminder; a courier confirming a delivery with no payment request.
- Edge cases: empty text, very long text, mixed Cyrillic/Latin, only "other" selected.
- Output shape: score within 0–100, reasons always non-empty for red/yellow, green wording matches D9.
- `redactPersonalData()` removes phone numbers, emails and IBANs.

---

## 10. Deliverables we must produce (help us with all of them)

1. **Deployed app** + public GitHub repo (GPL-3.0) + demo accounts table.
2. **Documentation, max 5 A4 pages** (Times New Roman 12, 1.5 spacing), with **exactly** this structure from the regulation:
   1. ТЕМА
   2. АВТОРИ (full names, phone, email, school, grade)
   3. РЪКОВОДИТЕЛ (full names, phone, email, position)
   4. РЕЗЮМЕ
      - 4.1 Цели (purpose, short analysis of needs and existing solutions)
      - 4.2 Основни етапи (main stages, roles of the authors)
      - 4.3 Ниво на сложност (main problems during implementation)
      - 4.4 Логическо и функционално описание (architecture, modules, functions, interactions)
      - 4.5 Реализация (justification of technologies, algorithms, literature)
      - 4.6 Описание на приложението (how to start, install, use and maintain it)
      - 4.7 Заключение (results, current use, future development)
   - The file name must match the project name (Scamly). Include UI screenshots.
3. **User documentation** (short, illustrated, per role): it can live inside the app as „Помощ“.
4. **Promo leaflet** (1 page, printed).
5. **Presentation slides** for the defense.
6. **Demo backup:** a screen-recorded video of all flows + a local build on the flash drive.
7. Declarations (licences / GPL) and the consent forms. We handle these with our teacher.

---

## 11. Work split (open item — propose a default)

> **Updated 4 Nov:** the split for all remaining work is now D23 (both of us on backend and frontend).
>
> **Updated 3 Nov:** see D17/D18; the current split is in `BUILD_PLAN.md` section 6 and `IMPLEMENTATION_PLAN.md` section 5. The original proposal is kept below for history.

Both of us must be able to explain the whole architecture. A starting proposal for you to refine:
- **Alex:** repo + CI, Supabase schema + RLS, auth and device pairing, API layer, alerts (Realtime, push, email), deployment, security hardening.
- **Roberta:** detection engine + its tests (pure logic, closest to our Python experience — a good way to learn TypeScript), design system and accessibility, call-check UI, map, education pages, docs and leaflet.
- **Shared:** dashboards, e2e tests, the demo and the defense.

Plan each phase so that **each of us has our own PRs** and the git history clearly shows who built what.

---

## 12. Timeline (today is 2 November 2026)

| Week | Dates | Goal |
|---|---|---|
| 1 | 2–8 Nov | Repo, CI, stack set up, DB schema + RLS, auth with roles + device pairing, seed script, design system basics, **detection engine v1 with tests** |
| 2 | 9–15 Nov | Call-check flow (protected person), family linking, alerts (Realtime + push + email), family dashboard |
| 3 | 16–22 Nov | Public reports + moderation + district map, education pages, admin dashboard and stats, AI layer with fallback, escalation if time allows |
| 4 | 23–29 Nov | Security hardening, e2e tests, Lighthouse, usability test with relatives, Bulgarian proofreading, deploy final. **Register by 29.11** |
| 5 | 30 Nov – 3 Dec | Documentation (5 pages), leaflet, slides, demo video, flash drive, rehearse the defense ×5 |
| — | 4–6 Dec | Tournament in Sofia |

We are still in school during all of this. If something slips, follow the cut order in D12.

---

## 13. Defense plan (15 minutes total)

1. **Hook (30 s):** a real anonymised news story: "a 78-year-old woman threw 15,000 leva from her balcony" (verify and use a real one).
2. **Problem + insight (1 min):** isolation and pressure. The family isn't there.
3. **Live demo (5–6 min):** one of us plays the scammer and phones the "grandmother" (the other teammate, using the protected role on a phone). She presses the button and answers 3 questions → a red verdict. **The family alert appears in real time** on a jury member's phone (logged in as the family member before we start) and on our backup phone (D7). Then show the map, the moderator view and the admin stats.
4. **Under the hood (1.5 min):** architecture diagram, the detection engine, security slide, test evidence.
5. **Impact and future (30 s):** police/municipality partnership, telecom integration, more languages.
6. **Questions (≥ 5 min).** Prepare answers (section 14).

---

## 13b. Improving the idea (use this section later)

When we ask you to improve the idea, act as a **critical tournament jury member** first, then as a product designer:
1. Score our current version against the 100-point criteria (section 3), category by category, with concrete point losses.
2. List the 5 weakest points and how to fix each within our remaining time.
3. Suggest features that **increase originality** without adding risk (e.g. family secret word, "scam wave" alerts, voice-first mode for people who can't read well, a Turkish/Romani language option for minority communities, a printable fridge card).
4. Challenge assumptions: is the protected-person UI really simple enough for an 80-year-old? Would a family actually set this up? What happens if nobody answers the alert?
5. Check the detection engine for false positives (a real relative calling, a real bank) and false negatives (new scripts).
6. Suggest how to collect **real validation** quickly (5 relatives, a local pensioners' club, a teacher's parents).

---

## 14. Likely jury questions (prepare answers with us)

- Why will an older person use an app at all? (The family installs and pairs it, it's one button, and it's a home-screen PWA. No password.)
- What if the scammer tells them not to touch the phone? (The education cards and fridge card prepare them in advance, and a check can be started *after* the call too.)
- How do you detect a new scam script? (Moderator script library, community reports and the AI layer.)
- Why not just block numbers? (Spoofing and prepaid SIM cards. We target the *behaviour*, not the number.)
- How do you protect the data of vulnerable users? (Section 7.)
- What happens if the AI is down? (The rule engine; show the test. AI can never lower a red verdict.)
- Why does green not say "safe"? (D9: a false "safe" is the most dangerous mistake.)
- How is the older person logged in without a password? Isn't that insecure? (Section 6.1: single-use expiring hashed code, rate limiting, revocable devices, RLS.)
- How did you test it? (Unit and e2e tests, coverage, Lighthouse, usability test notes.)
- What exactly did each of you build? (Section 11, shown in the git history.)

---

## 15. Your first task

**Step 1 — Implementation and build plan (no code yet).** Write `docs/BUILD_PLAN.md` containing:
1. Final **folder structure** with a one-line purpose for each folder.
2. **Database schema**: tables, columns, relations, indexes, and **RLS policies** for every role (as a Mermaid ER diagram plus a table of policies).
3. **API route list** (method, path, role allowed, input schema, purpose).
4. **Detection engine design**: inputs, outputs, scoring weights, hard rules, normalisation (stemming, Latin→Cyrillic transliteration, typos), and how Layer 2 plugs in.
5. **Device pairing flow** (section 6.1) as a sequence diagram.
6. **Week-by-week task breakdown** (Weeks 1–5) as GitHub-issue-sized tasks, each with an owner (Alex / Roberta, per section 11), an estimate in hours, dependencies, and a "done when" line.
7. **Risk register**: each risk, likelihood, impact, mitigation (include at least: Supabase pausing, iOS push limits, voice input browser support, Brevo limits, free-tier LLM rate limits, timeline slip).
8. Anything still unclear, as a short list of questions with your recommended default.

Show us the plan and **wait for our approval** before Step 2.

**Step 2 — Week 1 build (after approval):**
1. Set up the repo: Next.js + TypeScript (strict) + Tailwind + ESLint/Prettier + Vitest + Playwright + GitHub Actions, GPL-3.0 `LICENSE`, `README.md`, `.env.example`, `THIRD_PARTY_LICENSES.md`, `docs/decisions/` with ADRs for D4–D7.
2. Supabase migrations: schema + RLS policies + RLS tests.
3. Auth with roles + device pairing (section 6.1).
4. **Detection engine v1** (pure TS) with **at least 25 unit tests** (section 9).
5. Seed script with demo accounts for all 4 logged-in roles.
6. Design-system basics (colour tokens for light/dark, typography scale, Button/Card/Verdict components).
7. `docs/learning/week-1.md`: the TypeScript and Supabase concepts used this week, explained for Python programmers.

Work on feature branches and open one PR per logical piece so we can review them.
