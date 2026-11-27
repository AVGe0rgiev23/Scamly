# Scamly — Project brief and starter prompt for Claude Code

> **How to use this file:** Paste this whole file into Claude Code (Opus 5.5) at the start of the project, inside the project repo. Save it in the repo as `docs/PROJECT_BRIEF.md`. Update section 0 (Decision log) whenever a decision changes. Section 13 is for improving the idea later.
>
> **Your first job is in section 15:** write the implementation and build plan, *then* start building Week 1.

---

## 0. Decision log (decided on 2 November 2026)

These are settled. Don't re-open them unless something blocks you; if it does, explain why and propose an alternative.

| # | Topic | Decision |
|---|---|---|
| D1 | Product name | **Scamly**. Repo slug `scamly`. The name is in Latin script, but **all UI text is in correct literary Bulgarian**. Bulgarian tagline in the UI: „Обаждат ли ви се за пари? Проверете за 30 секунди.“ (replaced by D34: „Гласът може да е фалшив. Близкият ти — не.“) (can be refined). |
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
| D26 | Frontend redesign v2 „Signal“ (added 12 Nov) · **заменено от D28** (replaced by D28, 19 Nov) | Decided by Alex. The second restyle still looked like a generic template, so the whole visual layer was deleted and rebuilt on a new design system: dark-first near-black canvas, one accent colour (Signal Cyan) for actions, red/amber/green/slate only for verdict meanings, Bulgarian-made Sofia Sans with JetBrains Mono for data, and the signal line (jagged = scam, calm = no typical signs) as the product's motif. Logic, API, engine, database and texts are unchanged. Work happens on the branch `redesign/scamly-v2` and is merged into `main` only after both of us have looked at it (an exception to "main only" in D13 for this one large change). Details: `docs/redesign/`. |
| D27 | CSP without a nonce (added 12 Nov) | Decided by Alex in W4-01. The plan said "CSP with a nonce". The Next.js 16 docs say a nonce needs every page rendered on each request and does not work with Partial Prerendering, which Scamly uses; a hash-only policy, tested on a production build, stopped every page. So the CSP allows inline scripts (`'unsafe-inline'`) and keeps every other rule strict (scripts only from our domain, no `eval()`, connections only to us and Supabase, no plugins, no frames, forms only to us), plus HSTS, nosniff, X-Frame-Options, Referrer-Policy and Permissions-Policy. React escaping stays the main XSS defence. Revisit only if we turn Partial Prerendering off. Details: `docs/security.md`. |
| D28 | Redesign v3 „Ореол“ (added 19 Nov) | Decided by Alex. Replaces D26. The „Signal“ look still did not feel original enough, so the full visual layer was deleted again and rebuilt around one motif, the **halo** („Ореол“): soft rings around a person that close into one red ring when a call looks dangerous. New: glass materials lit from one light source (top highlight, lighter top, long soft shadow), the live WebGL **HaloField** background (with a still SVG fallback), the `motion` library for a few springs, and new brand assets (interim halo icons now, logo and OG image in Phase 2). Mood: „Night aurora“ is the base (dark, default), „Porcelain“ the light theme, „Instrument glass“ for the moderator and admin areas. Work happens on the short-lived branch `redesign/scamly-v3` (the same exception to D13 as D26) and is merged into `main` before 29 Nov. Logic, API, engine, database and texts are unchanged. Details: `docs/redesign-v3/`. |
| D29 | District scam-wave warning (idea #25, 25 Nov) | Roberta approved an in-app warning as the first stage. A paired phone can show the strongest wave in its configured district from recent approved reports. Push delivery follows physical-phone verification. |
| D30 | Practice call (idea #1, 25 Nov) | Roberta approved one text-based drill on the paired phone. It reuses the call-check questions and gives feedback on a fictional scenario. Practice answers stay on the current screen. |
| D31 | Words to end a call (idea #4, 25 Nov) | Roberta approved a short phrase on the red verdict while the call is still active. The practice lesson uses the same wording. |
| D32 | Relative-in-trouble drill (25 Nov) | Roberta approved a second practice scenario that teaches users to verify a relative's story by calling a number they already know. |
| D33 | Practice choosing the next action (25 Nov) | Roberta approved a final choice in each drill. The result explains what to do after the warning signs are recognized. |
| D34 | Main story: „Провери истинския“ (added 21 Nov) | Decided by Alex; Roberta to be told before the code changes (D17). Scammers pretend to be **someone close: any relationship** (son or daughter, grandchild, parent, sibling, spouse), not only "a grandchild calling grandma". Caller ID can be spoofed and a voice can be cloned, so **the voice is no longer proof; the relationship is**. The main feature becomes „Провери истинския“: one tap on the protected phone sends a request to the real loved one's signed-in phone, who answers „Не съм аз — затвори!“ or „Аз съм“. The 30-second check, the hard rules (D10) and the family alert stay as the **safety net**. Home-page hook: „Гласът може да е фалшив. Близкият ти — не.“ The tagline in D1 is replaced. Texts talk about „близък“, „родител“, „дете“, not only „баба“. `IDEAS.md` #36. |
| D35 | Product focus after the review (added 21 Nov) | Decided by Alex after an end-to-end review: **few features, each one essential to the main story.** (1) Landing page cut from 10 sections to 5 (hero with the hook and a two-phone scene, 3 steps, safety net = hard rules + engine demo, „Ти си истинският“ for the family, FAQ ≤ 5 + final call to action). (2) Navigation: header = „Как работи“, „Вход“, button „Провери“; phone dock = Начало / Провери / Вход; map, report form, education and fridge card live in the footer. (3) Voice input hidden (`FEATURE_VOICE` off: never tested on a real phone). (4) The server-side escalation job (W3-09, `pg_cron` + `/api/cron/escalate`) is replaced by the on-screen fallback inside „Провери истинския“ (next family member + a reminder to ask something only the real person knows, after 45 s; changed 26 Nov). (5) `/dev/*` blocked in production; unused `CommandPalette` and the never-built `FEATURE_AI` removed; the AI layer (W3-07, D6) is dropped. (6) E-mail alerts: set up the free Brevo sender or remove every "по имейл" claim. (7) The report form becomes "send anonymously to the map" after a check. (8) Moderator and admin stay (roles, security, audit points) with no new features; redesign Phase 6 is a light restyle. (9) Every idea in `IDEAS.md` has a verdict; dropped ideas are listed there with the reason. Roberta's work of 24–25 Nov (D29–D33: practice call, district warning, words to end the call, export and deletion) stays; it is listed as built. **New cut order (replaces D12):** redesign Phase 6 → family dashboard tidy-up → time-to-answer → send-to-map → accessibility checks (family question and shortcut removed 26 Nov); **never cut:** „Провери истинския“, the call check, the family alert, the map, security and tests. |

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

- Phone scams are one of the most widespread crimes in Bulgaria. The script that hurts most is **„Роднина в беда“: the scammer pretends to be someone close.** „Мамо, катастрофирах, трябват ми пари“; „Дядо, аз съм, арестуваха ме“; „Мама е в болница, прати пари на този номер“; „Здравей, това е новият ми номер“. Often a second voice joins as a fake lawyer, police officer or doctor.
- Other scripts use the same pressure: **„Полицай“** ("help us catch scammers with your money"), **„Фалшив служител“** (bank, electricity company, НЗОК), **„Колет/куриер“**. Victims throw money from the balcony or hand it to a courier.
- **Anyone can be the target, any relationship can be faked.** Older people are hit most, but parents in their 50s and teenagers get the same calls.
- **It is getting worse:** the caller's number can be spoofed, and an AI voice clone needs only seconds of a voice from a public video. Hearing the familiar voice is no longer proof.
- Few perpetrators are caught (reports cite roughly 1 in 10 suspects identified). Prepaid SIM cards make tracing hard.
- Families live apart (children in other cities or abroad). **The real loved one is not there in the critical minutes of the call.**
- Existing solutions are awareness campaigns (talks, leaflets) and police warnings. These do not help *during* the call.

Sources to cite (**verify the current figures before using them**; never invent statistics):
- AFP / Gulf News: *Brazen phone scammers terrorise Bulgaria's elderly*
- BNT, Novinite, Sofia Globe police reports on telephone fraud (2024–2026)
- Plovdiv24 / NOVA: losses of over 3.5 million (Jan 2023 – Sep 2024) to telephone fraud
- A source on AI voice cloning used in "relative in trouble" scams (find a reliable one before using it)
- Eurostat / NSI data on population ageing in Bulgaria

**Our insight (D34):** the scam borrows the identity of someone you love, and works because you are **isolated and rushed**. A number can be faked and a voice can be faked, but **the real person's signed-in phone cannot**. Scamly asks the real person in seconds and breaks the isolation: „Гласът може да е фалшив. Близкият ти — не.“

---

## 5. The product

**Name:** Scamly.
**One-liner (D34):** When "someone close" calls asking for money, one tap asks the **real** person on their own phone: „Не съм аз“ or „Аз съм“. If they do not answer, a 30-second check backed by hard rules gives a clear verdict, and the whole family is alerted. A public map shows scam waves by region.

### 5.1 Roles (each needs a demo account)

1. **Защитен (protected person)**: the person who gets the scam call (often, but not only, an older person). An extremely simple interface. Signs in by device pairing (D4), not a password.
2. **Близък (family member / trusted person)**: creates and pairs protected people, **answers „Провери истинския“ requests** („Не съм аз“ / „Аз съм“), receives alerts, sees their history, can call back.
3. **Модератор (moderator)**: reviews public reports before they appear on the map, and manages the scam-script library.
4. **Администратор (admin)**: users, roles, statistics, system settings, audit log.
5. **Гост (guest, no login)**: can see the public map and the educational „Как работи измамата“ pages, and can submit an anonymous report.

### 5.2 Core features (must work flawlessly; D34, D35)

**A. „Провери истинския“ (the main feature, one-button flow, D34, improved 26 Nov)**
- The protected phone keeps **one big button**. Its first question: **„Казват ли, че са някой близък?“** Yes → large family tiles („Казва, че е Иван“); the request covers both a call and a „това е новият ми номер“ message. No → the normal 30-second check (B).
- The request goes at once to the real loved one: **push + live alert** „Ти ли си? Някой се представя за теб пред Мама и иска пари.“ (as built: `/family/proveri`). **While she waits** (45 s), the protected person answers the rest of the check.
- **„Не съм аз — обаждам ти се сега!“** → the protected phone turns red: „Това НЕ е Иван. Затворете. Иван ви звъни сега.“; Ivan's screen tells him to call her now on the number he knows (her number is not stored in Scamly), so his call arrives as a waiting call during the scam call; the call-back button always uses **the number saved in the family, never the calling number**; the words to end the call; „Някой идва ли към вас за парите?“ → `tel:112`; **everyone else in the family is warned**; one tap sends an anonymous report to the map.
- **„Аз съм“** → calm screen, **but the hard rules still apply** (no cash to a courier, no money by a link, no money thrown from the balcony).
- **No answer in 45 s** → the next family member is asked **about the same claimed person** („Наистина ли е Иван?“; a „Не е Иван“ still turns her screen into „Това НЕ е Иван.“), the screen reminds her „Попитайте нещо, което знае само Иван.“ (nothing is stored), and if nobody answers she gets the verdict of the check she has been answering.
- The time from the tap to the answer is measured with a read-only SQL query (P-09, evidence for the slides; no admin screen).
- **Before the call (future, not in the browser):** a web app cannot see incoming calls. The Android companion „Scamly Пазител“ (F-01) will show „Непознат номер — ако каже, че е близък, натиснете тук“ while the phone rings. It shortens the first step; it cannot remove it, because who the caller claims to be is only known once they speak.

**B. „Проверка на обаждане“ (the 30-second check, the safety net)**
- Huge yes/no questions with icons: who do they say they are, do they want money or valuables, are they rushing you or telling you not to tell anyone.
- Result in **under 5 seconds**: a big red / yellow / green verdict in plain words, e.g. **„ТОВА Е ИЗМАМА. Затворете телефона.“** Green follows D9. Then **„Обади се на [име]“** (`tel:` to the first contact). Works offline (the engine also runs on the phone).
- Accessibility: very large fonts, high contrast, minimal text, works on cheap Android phones at 360 px.

**C. Family alert („Семеен щит“)**
- Every request and every check notifies the linked family at once: **live page via Supabase Realtime** + **web push** (PWA, VAPID; iPhone after "Add to Home Screen"). E-mail via Brevo only once the free sender is set up (D35).
- The family member taps **„Обаждам ѝ се сега“**; the protected screen shows „Иван ще ви се обади веднага“.

**D. Detection engine („Разпознаване“)**
- **Rule-based, explainable, heavily unit-tested:** weighted scoring of the answers, **hard rules** (D10) that force red, a Bulgarian keyword/phrase matcher (stems, шльокавица, typos), `redactPersonalData()`. Pure TypeScript, our "algorithm" for the defense. The AI layer is dropped (D35).

**E. Public scam map („Карта на измамите“)** (secondary, linked from the verdict and the footer)
- Anonymous reports by district only, moderation before publishing, scam-wave texts, spam protection (rate limit + honeypot). The report is sent from the verdict screen ("send anonymously to the map"); the stand-alone form stays for guests.

**F. Education („Как работи измамата“)** (footer)
- Short cards per script, **"fake relative" first**.

**G. Dashboards**
- Family: people, **contact order („кой е истинският“)**, pairing, invite; devices and history in a settings tab.
- Moderator: report queue, script library editor. Admin: users and roles, statistics, audit log. No new features (D35); not restyled after Redesign Phase 5.

### 5.3 After the tournament

See `IDEAS.md` sections 4 and 5 (scam drill, faces, scam-wave push, message check with AI, Viber bot, „Семеен кръг“, partners and business model, native companion apps).

### 5.4 Explicitly out of scope
- **No recording or intercepting of phone calls.** Legally problematic and technically impossible from a browser. The user reports what was said.
- **No voice or deepfake analysis.** Our answer to voice cloning is to ask the real person (D34).
- No storing of caller phone numbers in public. Any number entered is stored privately and **hashed** for duplicate detection.
- No AI classification of calls or messages before the tournament (D35).
- No real-time integration with the police or telecoms (future work, `IDEAS.md` #27, #41).

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

1. **Hook (30 s):** a real anonymised news story about a "relative in trouble" call (verify and use a real one), then the line „Гласът може да е фалшив. Близкият ти — не.“
2. **Problem + insight (1 min):** the scammer borrows the identity of someone you love; numbers and voices can be faked; the real person is not there.
3. **Live demo (5–6 min):** a juror's phone becomes "the real son" through the demo-kit QR (`IDEAS.md` #39). One of us calls the "mother" (the other teammate, protected role) and says „Мамо, катастрофирах…“. She taps „Провери истинския“ → the juror's phone lights up → „Не съм аз — затвори!“ → her screen turns red, the family is warned, a dot appears on the map. Second run: the "son" does not answer → the family question and the 30-second check give a red verdict. Then briefly the moderator queue and the admin stats (time-to-answer).
4. **Under the hood (1.5 min):** architecture diagram (devices confirming each other in real time), the detection engine and hard rules, security slide, test evidence.
5. **Where it goes next (30 s):** the ringing prompt „Непознат номер — ако каже, че е близък, натиснете тук“ (mock-up), „Семеен кръг“, the scam immune system, partners (banks, operators) as the business model (`IDEAS.md` sections 4 and 5).
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
- How do you detect a new scam script? (Moderator script library and community reports; the moderator's keywords feed the engine.)
- What if the voice sounds exactly like my son? (That is the point: a voice can be cloned. Scamly asks the real son on his own signed-in phone.)
- What if the loved one does not answer? (After 45 s: the next family member, a reminder to ask something only the real person knows, and the 30-second check with hard rules.)
- Why not just ask a secret question? (A question alone fails exactly when it is needed: in panic people forget it, answers like a pet's name are on social media, and scammers dodge it („не мога да мисля, полицаят ще ви обясни“). It also leaves the victim alone. Scamly asks the real person on a device the scammer cannot control, warns the whole family, and still reminds her to ask that question.)
- What if my son really calls from another number because his phone broke? (Then he cannot answer on his own phone either; Scamly asks the next family member within 45 s. A real emergency never needs cash to a courier within minutes, so the hard rules stay: verify first, pay never.)
- Could the scammer answer the request? (Only a signed-in, paired family account receives it; the protected device and the family accounts are protected by RLS and server checks.)
- Why not just block numbers? (Spoofing and prepaid SIM cards. We target the *behaviour*, not the number.)
- How do you protect the data of vulnerable users? (Section 7.)
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
