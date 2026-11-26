# Scamly: ideas and recommendations

> A menu, not a to-do list. Rewritten on 21 Nov after the product review (D35) and checked again idea by idea on 26 Nov: every idea has a verdict; ideas that are generic or do not serve the main story were removed (one line each in section 6, so nobody proposes them again).
> To accept an idea, tell the agent "accept idea 3" (or "accept 3, but change…"). The agent adds it to the status board in `IMPLEMENTATION_PLAN.md` and logs it in `CHANGES.md`.
> To add your own idea, just describe it. The agent adds it here with an honest estimate and a verdict.

Effort = your hours including review. Numbers (#) never change, so old references stay valid; merged ideas point to the idea they joined.

---

## 1. The test every idea must pass

**The product (D34):** scammers pretend to be someone close: a son, a daughter, a grandchild, a parent, any relationship („Мамо, катастрофирах, трябват ми пари“). The caller's number can be faked and a voice can be cloned, so **the voice is no longer proof. The relationship is.** Scamly asks the real person: one tap on the protected phone sends a request to the real loved one's signed-in phone, who answers „Не съм аз — затвори!“ or „Аз съм“. The 30-second check and the hard rules are the safety net when the loved one does not answer.

**Hook (home page):** „Гласът може да е фалшив. Близкият ти — не.“

An idea is worth building only if it makes this one promise **faster, more reliable or easier to understand**. Everything else is a slide or nothing (D35: few features, each one essential).

**Honest jury view after the review:**

| Criterion | Where we would lose points | What fixes it |
|---|---|---|
| **Originality** | "A questionnaire with a traffic light" looks like many other projects | „Провери истинския“: we verify the relationship, not the call (#36) |
| **Credibility** | No proof real people can use it, and no measured numbers | Time-to-answer measured (#7) + usability test with 3–5 real people (W4-05) |
| **Design** | A long landing page reads like a feature catalogue | Landing cut from 10 to 5 sections with one hook (P-03) |
| **Defense** | The jury has to trust that it works | Live demo across three phones (#39) + "try to fool the engine" (#6) |
| **Completeness** | Half-built or untested features (voice, escalation cron, e-mail) look worse than fewer finished ones | Hide, replace or finish them (P-02) |

---

## 2. Build now (before the 4 Dec defense)

These form **one feature package**. Task IDs and owners are in `IMPLEMENTATION_PLAN.md` section 5 (tasks P-01 … P-12).

| # | Idea | Why it is in | Effort |
|---|---|---|---|
| **36** (+ 28, 17) | **„Провери истинския“: the main feature, one-button flow (design improved 26 Nov).** The protected phone keeps **one big button**. Its first question is **„Казват ли, че са някой близък?“**. **Yes** → large tiles of the family („Казва, че е Иван“) → the request goes to the real Ivan at once (push + live alert: „Някой се представя за теб пред мама и иска пари. Ти ли си?“; the same request covers a call and a „това е новият ми номер“ message, #37), and **while she waits** mum answers the rest of the 30-second check, so the waiting time is used. **No** → the normal 30-second check. Ivan answers: **„Не съм аз — обаждам ти се сега!“** → mum's screen turns red: „Това НЕ е Иван. Затворете. Иван ви звъни сега.“; Ivan's phone **calls mum straight away**, so his call arrives as a waiting call during the scam call (a natural, unmistakable signal); the call-back button on mum's screen always uses **the number saved in the family, never the number that is calling**; the rest of the family is warned (#38). **„Аз съм“** → calm screen, but the hard rules still apply (no cash to a courier, no money by a link). **No answer in 45 s** → the next family member is asked, the screen reminds her: „Попитайте го нещо, което само истинският Иван знае.“ (#3, one line, nothing stored), and she gets the verdict of the check she has been answering. Replaces the server-side escalation job (#17, W3-09). | It **is** the product. Caller ID can be spoofed and a voice can be cloned; the real person's signed-in phone cannot. One button means nothing new to learn; the waiting call from the real son ends the scam in the scammer's own call | ≈ 2–3 days (P-05, P-06) |
| **7** | **Time-to-answer, as evidence only (changed 26 Nov):** the request already stores when it was sent and when it was answered; we read the median from the database after rehearsals and the family tests. No admin screen | Turns "in seconds" into a **measured** number for the slides, without adding a feature | ≈ 0.5 h (P-09) |
| **24** | **Phone sticker, merged with the fridge card:** „Звънят ти, че съм в беда? Провери ме в Scamly.“ | A physical trigger next to the phone; also works for landline calls. A good prop in the defense | ≈ 1 h (in P-04) |
| **38** | **„Предупреди кръга“** (new): when the real person taps „Не съм аз“, everyone else in the family gets „Някой се представя за Иван. Ако ви звънне, затворете.“ | Scammers often call several relatives one after another. Reuses the existing alert fan-out | ≈ 3 h (in P-05) |
| **44** | **„Някой идва към вас?“ → 112** (new, 26 Nov): after „Не съм аз“ or a red verdict, if a courier or "a colleague" is on the way to collect money, a big „Обадете се на 112“ button (`tel:112`) and a note to the family | The last step of the scam is the handover at the door; this is the moment the police can still catch someone | ≈ 0.5 h (in P-06) |
| **39** | **Juror demo kit** (new): a QR code on a slide turns a juror's own phone into "the real son" through an invite in 20 s; another juror plays the scammer. | The strongest live proof of "distributed" the jury can hold in their hands | ≈ 3 h (P-12) |

---

## 3. Already built (keep, no new work)

| # | Idea | Where |
|---|---|---|
| 1 (first stage) | **Text practice call** on the paired phone (Roberta, 25 Nov, her D30, D32, D33): two fictional scenarios (incl. „Близък в беда“), warning-sign questions, a final action choice, exit at every step | Protected home. The surprise drill with a voice (#20, #30) stays after the tournament |
| 4 | **Words to end the call** (Roberta, 25 Nov, her D31) | Active red verdict + practice lesson. „Провери истинския“ reuses the same phrase |
| 25 (first stage) | **District scam-wave warning** on the paired phone's home screen (Roberta, 25 Nov, her D29) | Protected home. Push delivery waits for the real-phone test (P-01) |
| 6 | Engine X-ray + "try to fool it" | The landing demo runs the real engine on any text. Use it in the defense Q&A |
| 8 | Praise, not fear („Добре направихте, че проверихте.“) | Red verdict screen |
| 10 | Vibration on red | Protected flow (Phase 3) |
| 13 | Our own illustrations | Landing, education and help pages (Ореол redesign) |
| 19 | „Разкажете ми“: retell the call by voice | Built as voice input, but **hidden** (`FEATURE_VOICE` off, D35): Bulgarian recognition was never tested on a real phone |

---

## 4. After the tournament (real improvements, in this order)

| # | Idea | Why it improves the app |
|---|---|---|
| **22** (+ 31, 23) | **„Scamly Пазител“: the ringing prompt (first native step, edited 26 Nov).** A small Android companion app (call-screening role, Android 10+) sees each incoming call **before it rings**, never the audio. For a number that is **not in the contacts** it shows over the ringing screen: **„Непознат номер — ако каже, че е близък, натиснете тук“**; one tap opens „Провери истинския“ already on the question „Казва, че е…“. Numbers reported in Scamly get „Внимание: докладван N пъти“. #31: after a long call (> 20 min) with an unknown number, a quiet note to the family (time and length only). #23 is the iPhone counterpart, limited to labels for reported numbers (iOS allows nothing more; needs a paid Apple account, D11). | It **shortens the first step**: the reminder appears at the exact moment of the scam, before the first word. It does not remove the step, because who the caller claims to be is only known once they speak. ≈ 3–5 days (Kotlin or Capacitor + one plugin), sideloaded for a demo. **Replaces F-01 as the main future-work item** |
| **21** (restored and edited 26 Nov, Alex) | **„Scamly Слух“: Scamly hears the claim, not the voice.** With the person's permission, while a suspicious call is on speaker, the companion app (#22) or a second device turns the caller's words into text (Bulgarian speech-to-text) and runs our engine every few seconds. It does **not** judge whether the voice is real (it cannot be, see #36); it listens for the **claim and the demand**: „мамо, аз съм“, „катастрофирах“, „пари“, „куриер“. When it hears „someone close + money“, it **starts „Провери истинския“ by itself** („Казва, че е Иван?“ → one tap to confirm) and lights up the signs on screen as they are heard; at danger level the screen turns red with „Затворете телефона!“. After the call: a short summary in plain words. Needs: a legal check (consent; the caller is told the call is checked; GDPR), paid speech APIs (D11), a usability test. | It removes even the first tap: the check starts while the scammer is still talking. Second future step, after #22 |
| **40** | **„Семеен кръг“ (moved up from the slides, 26 Nov):** anyone protects anyone (teenager ↔ parent ↔ grandparent); every member can both send and answer „Провери истинския“ | Scammers also call teenagers („мама е в болница“) and parents in their 50s; today only the "protected" phone can ask. Removes the "it's for old people" stigma. Needs a change to the roles model |
| **43** | **„Номерът ми се сменя само в Scamly“** (new, 26 Nov; builds on #37, merged into #36): a family member who really changes their phone number announces it inside Scamly; every relative sees „Иван смени номера си“ with his old account confirming it. A family rule printed on the fridge card: if the "new number" did not come through Scamly, it is not Ivan | Kills the „това е новият ми номер“ scam at the root, building on #37 |
| **2** | **Faces, not names:** a photo of each family member on the „Казва, че е…“ tiles and on the red screen („Това НЕ е Иван“ with his face) | People recognise a face faster than a name under stress; makes picking the right person instant. Needs private storage + RLS |
| **1** (edited 26 Nov) | **Family drill of the real loop:** the son starts a practice from his phone; mum gets a clearly labelled „Тренировка“ and goes through „Провери истинския“ end to end; both see „Мама мина тренировката ✓“. Extends the text drill already built (section 3) | Practising the exact action under calm conditions is what makes people use it under stress (prebunking). No paid voice service needed |
| **14** | Turkish version of the protected screens | Real need for Turkish-speaking families (e.g. Кърджали); cheap thanks to `bg.ts`, but a native speaker must check it |

---

## 5. Slides only: "where Scamly goes next" (W5-03)

| # | Idea | Slide message |
|---|---|---|
| 22 | The ringing prompt („Непознат номер — ако каже, че е близък, натиснете тук“), shown as a mock-up | "Next: Scamly reminds you before the first word" |
| 35 (edited 26 Nov) | **Scam immune system:** every „Не съм аз“ becomes an anonymous data point („някой се представя за син, Пловдив, 10:40“); many of them in one district within hours = a new wave, warned at once; anonymised evidence packs for ГДБОП and banks | "Every family that checks one call protects the next one" |
| 27 + 41 | **Partners and business model:** a "verify the relationship" API for banks and mobile operators (A1, Yettel, Vivacom); free for families, paid by institutions. Banks: unusual cash withdrawal → the bank asks the family through Scamly | Answers "could this be sold?" |

---

## 6. Not doing (and why)

| Idea | Why not |
|---|---|
| Listening to or recording calls automatically | Illegal without consent, impossible from a browser, a privacy nightmare |
| Native Android/iOS app before the tournament | Weeks of extra work; the PWA does what we need (native ideas are slides, section 5) |
| Detecting fake voices / deepfakes, analysing the caller's voice or sound | Unreliable and not defendable; apps cannot access call audio; a false "safe" is our worst bug (D9). Our answer to voice cloning is #36: ask the real person |
| SMS alerts | Cost money (D11) |
| Points, badges, leaderboards | Patronising |
| Blocking phone numbers | Scammers spoof numbers; we check the relationship, not the number |
| #11 Read the verdict aloud | Bulgarian browser voices are unreliable |
| #15 Telegram bot | Not where our users are; push + the live page already work |
| #26 Weekly reminder push | Push must mean "emergency", or people learn to ignore it |
| #29 Voice vaccine (warnings in the child's own voice) | Contradicts our main message: the voice is no longer proof |
| #18 LLM suggests new keywords to the moderator | Removed 26 Nov: generic AI; detection is not our main story any more, and moderators can add keywords by hand today |
| #20 LLM-written practice scripts | Removed 26 Nov: generic; the family drill (#1) practises the real loop instead |
| #30 Surprise practice call with a text-to-speech voice | Removed 26 Nov: costs money (D11) and a surprise "scam call" can frighten an older person |
| #16 Weekly scam-wave e-mail digest | Removed 26 Nov: e-mail is not a working channel; strong waves go by push (#5) |
| #12 Open data (CSV) | Removed 26 Nov: generic civic feature, does not make any check faster or safer |
| #32 AI scam-baiting "double" | Removed 26 Nov: generic and already done elsewhere (O2's "Daisy", UK, 2024); nothing to do with verifying a relative |
| #33 „Провери съобщение“ (AI checks a message) and #34 Viber bot | Removed 26 Nov: a generic second product; the text version of our scam is covered by #37 and #43 without AI |
| #3 Family question as a stored feature | Changed 26 Nov: no settings field, nothing stored. A question alone is not proof (the victim forgets it in panic, answers can be found on social media, a scammer dodges with „не мога да мисля, полицаят ще ви обясни“). It stays as **one reminder line** on the no-answer screen: „Попитайте го нещо, което само истинският Иван знае.“ |
| #42 „От неговия номер ли звъни?“ | Removed 26 Nov: a real son can call from a borrowed phone (broken phone, empty battery) and a scammer can spoof the saved number, so the answer proves nothing either way. One more question costs time under stress |
| #37 as a separate „message“ choice | Merged into #36 on 26 Nov: the request to the real person covers both a call and a „това е новият ми номер“ message, so no extra choice on screen |
| #5 + #25 Scam-wave push | Removed 26 Nov: push stays for emergencies only; the in-app district warning (built) is enough |
| #9 Home-screen shortcut | Removed 26 Nov: saves one tap on Android only; the automatic trigger (#22) solves the real problem, that people forget to open the app |
| AI second opinion for the call check (W3-07, D6) | Never built; the rules engine is explainable and tested. The flag `FEATURE_AI` is removed (D35) |

---

## 7. Real validation (cheap, very convincing)

1. **3–5 families** (a parent + an adult child, or a grandparent + a grandchild): one plays the scammer, the other uses „Провери истинския“; the real relative answers on their own phone. Time it (#7), note where they got stuck. About 20 minutes each (W4-05).
2. **A pensioners' club** („пенсионерски клуб“) or community centre („читалище“): a 30-minute talk with the leaflet, plus 3 people trying the app. Photos only with consent.
3. **One expert quote:** a police officer or a municipal social worker, one sentence about the "relative in trouble" scam. Real words beat any statistic.
4. Everything goes into `docs/evidence/` with dates. Never invent statistics: every number in the slides has a source or was measured by us.

---

## 8. Ideas inbox (add new ideas here)

| # | Idea | Who suggested | Date | Verdict |
|---|---|---|---|---|
| 42 | „От неговия номер ли звъни?“ | Agent, review | 26 Nov | Removed 26 Nov (section 6) |
| 43 | „Номерът ми се сменя само в Scamly“ (section 4) | Agent, review | 26 Nov | After the tournament |
| 44 | „Някой идва към вас?“ → 112 (section 2) | Agent, review | 26 Nov | Build now (P-06) |
| 45 | *(next idea)* | | | |
