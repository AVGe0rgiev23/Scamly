# Scamly: ideas and recommendations

> A menu, not a to-do list. Nothing here is built until you pick it.
> To accept an idea, tell Claude "accept idea 3" (or "accept 3, but change…"). Claude then adds it to the status board in `IMPLEMENTATION_PLAN.md` and logs it in `CHANGES.md`.
> To add your own idea, just describe it. Claude adds it here with an honest estimate.

Effort = your hours including review. Score impact = which jury criterion it helps (brief section 3).

---

## 1. Honest jury view of the current plan

If I were on the jury and saw only the current plan, built well, this is where I'd still take points away:

| Criterion | Where we'd lose points | What fixes it |
|---|---|---|
| **Originality** (20 pts) | "A button plus a questionnaire" can look like a form with a traffic light. Other teams will have AI chatbots. | Ideas 1–6: things no other team will have, built on our real insight (isolation + pressure) |
| **Credibility / validation** (20 pts) | No proof real older people can use it or that it's fast enough to matter | Idea 7 (time-to-family number) + usability test with 5 real people (W4-05) |
| **Original components and design** (35 pts) | Generic-looking UI made from a standard kit | Our own illustrations for the 4 scam scripts (idea 13) + a calm, recognisable visual style |
| **Defense** (20 pts) | The jury has to trust us that the engine works | Idea 6: let the jury *try to fool it* live |
| **Completeness** | Too many half-finished features look worse than fewer finished ones | Polish the MVP first; accept new ideas only when the current week is on track |

---

## 2. Top recommendations: make Scamly memorable

### Idea 1: „Тренировка“ (scam drill), ⭐ my top pick

**What:** The family turns on a practice drill. Grandma's app shows a clearly labelled **„Тренировъчно обаждане“** screen and plays a short fake scam script, recorded by you two in your own voices (an original asset!). She practises: press the big button, answer, see the red screen, call Ivan. The family sees „Баба мина тренировката за 18 секунди ✔“.

**Why it's strong:** Psychology research calls this **"prebunking" / inoculation**: people who practise spotting a manipulation trick resist it better later. That gives us a scientific argument no other team will have (find and cite the real papers before using them). It also answers the jury's hardest question: *"Will an 80-year-old really remember to press the button under stress?"* Yes, because she has practised.

**How:** It reuses the check flow, with an `is_drill` flag. Drills are excluded from statistics and never alert family as real.
**Effort:** ~9 h · **Week:** 3 · **Risk:** low · **Helps:** originality, credibility, defense.

### Idea 2: Faces, not names

**What:** Each trusted contact can have a photo. The result screen shows a **big photo of Ivan** with „Обади се на Иван“.

**Why:** Older people recognise a face faster than they read a name. It also makes it less likely they call back the number the scammer gave them.
**How:** Supabase Storage (free 1 GB), private, readable only by that family and device.
**Effort:** ~4 h · **Week:** 2 · **Risk:** low · **Helps:** UX, originality.

### Idea 3: Family question („Семеен въпрос“)

**What:** The family sets one question only the real relative can answer, e.g. „Как се казваше първото ни куче?“. On a yellow or red „Роднина в беда“ result, the screen says: **„Попитайте го: „Как се казваше първото ни куче?“ Истинският ви внук знае отговора.“**

**Why:** It defeats the „Роднина в беда“ script directly, and it gives grandma an action, not just a warning.
**Privacy bonus:** we store only the *question*, never the answer. Grandma knows the answer, so there's no secret to leak. That's a great line for the defense.
**Effort:** ~3 h · **Week:** 2 · **Risk:** very low · **Helps:** originality, security story.

### Idea 4: „Какво да кажа?“ (words to end the call)

**What:** The red screen shows one big sentence to read out loud before hanging up: **„Ще се обадя на сина си и ще ви върна обаждане.“**

**Why:** Many victims are polite and don't know how to end the call. Scammers count on that. Giving them the exact words removes that barrier.
**Effort:** ~1 h (text + layout) · **Week:** 2 (inside W2-01) · **Recommended default: yes.**

### Idea 5: Scam wave → personal warning

**What:** When the map detects a wave in grandma's district, her home screen shows a calm banner: „Тази седмица в област Бургас има обаждания от фалшиви полицаи. Полицията никога не иска пари.“ Her family gets one short note too.

**Why:** It connects the public map to personal protection: community reports protect a specific person *before* the call. That's a real "distributed application" story (many users → shared data → individual benefit).
**Effort:** ~4 h · **Week:** 3 (after the map) · **Risk:** low.

### Idea 6: Engine X-ray + "try to fool it"

**What:**
- In the family history: **„Как реши Scamly?“** shows bars for each signal (money, pressure, secrecy…), which hard rules fired, and the caller's words highlighted.
- A public page **„Изпитайте Scamly“**, where anyone (the jury!) types a made-up call and sees the verdict and the X-ray live. Nothing is saved.

**Why:** Explainable detection is a hot topic, and the jury can test the algorithm themselves during questions. A confident team says: "Try to fool it."
**Effort:** ~5 h · **Week:** 3 · **Risk:** low (the engine is pure, so the page needs no database).

### Idea 7: Time-to-family metric

**What:** Measure the seconds from "button pressed" to "family pressed „Обаждам ѝ се сега“". Show the median in admin stats and in the presentation.

**Why:** It turns the tagline "under 30 seconds" into **measured evidence**, e.g. "In our tests with 5 families: median 41 seconds."
**Effort:** ~2 h · **Week:** 3 · **Risk:** none.

---

## 3. Small things with a big effect (≈ 0–2 h each; recommended: yes to all)

| # | Idea | Why | Effort |
|---|---|---|---|
| 8 | **Praise, not fear.** Red screen starts with „Добре направихте, че проверихте.“ Calm red, no flashing | Panicked people make mistakes; praise makes them use the app again | 0 h (wording) |
| 9 | **Home-screen shortcut:** long-press the Scamly icon → „Обаждат ми се за пари“ (Android) | One step faster under stress | 0.5 h |
| 10 | **Vibration on red** (Android) | A second signal for weak eyesight | 0.5 h |
| 11 | **Read the verdict aloud** (built-in browser voice, only if a Bulgarian voice exists) | Helps people with poor eyesight or reading | 2 h |
| 12 | **Open data:** download map statistics as CSV (CC BY 4.0) for journalists and municipalities | Civic value, an "applicability" argument | 2 h |
| 13 | **Our own illustrations** for the 4 scam scripts (Roberta draws or designs them; simple flat style) | "Original components and design" is scored | 3–5 h |

---

## 4. Only if there's time

| # | Idea | Note |
|---|---|---|
| 14 | Turkish version of the protected screens (minority communities, e.g. Кърджали) | Easy thanks to `bg.ts`, but needs a native speaker to check it |
| 15 | Telegram bot alerts | Already a stretch goal |
| 16 | Weekly "scam wave" email for family | Idea 5 covers most of the value |
| 17 | Escalation chain (D8) | Already planned as a stretch in W3-09 |

---

## 5. Ideas I recommend NOT doing (and why)

| Idea | Why not |
|---|---|
| Listening to or recording calls automatically | Illegal without consent, impossible from a browser, and a privacy nightmare |
| Native Android/iOS app | Weeks of extra work. A PWA does what we need |
| Detecting fake voices / deepfakes | Unreliable, and we couldn't defend how it works |
| SMS alerts | Costs money (D11) |
| Points, badges, leaderboards for grandma | Feels patronising to older people |
| Blocking phone numbers | Scammers spoof numbers. We target behaviour, not numbers (brief section 14) |
| Analysing the caller's voice or sound frequencies to detect a scam | A web or phone app can't access call audio (Android and iPhone block it); recording a caller without consent is a legal problem in Bulgaria and under GDPR; voice/stress detection isn't reliable enough, and a false "safe" is our worst bug (D9). See idea 19 for the legal alternative |

---

## 6. Real validation (cheap, very convincing)

1. **5 relatives** (grandparents, neighbours): run the drill (idea 1), time them, note where they got stuck. About 20 minutes each.
2. **A pensioners' club** („пенсионерски клуб“) or community centre („читалище“): a 30-minute talk with the leaflet, plus 3 people trying the app. Take photos (with consent) for the presentation.
3. **One expert quote:** ask a local police officer or a municipal social worker for one sentence about the problem. Real words from a professional beat any statistic.
4. Put everything in `docs/evidence/` with dates.

---

## 7. My suggested package

If you want one decision: **accept ideas 2, 3, 4, 6, 7 and all of section 3 (8–13); accept idea 1 if Week 2 ends on time.**

Honest cost: about **20–25 extra hours over Weeks 2–3** for both of you together. Weeks 2–3 are already full, so to make room I'd propose:
- Idea 6 ("try to fool it") is our demo of the algorithm. If we fall behind, it's a reason to **cut the AI layer** (already first in D12) without losing the "smart" story.
- Idea 5 replaces the weekly email digest (idea 16).
- Idea 1 is the wow feature. If time runs out, a simpler version still works: grandma starts a practice from her menu, with text instead of recorded audio (~4 h).

---

## 8. AI / LLM ideas (added 6 Nov, to decide later)

The regulation does **not** require AI or an LLM. These ideas build on the planned optional AI layer (W3-07, ADR 0004): AI may only make Scamly more careful, never less, and a human stays in control.

| # | Idea | Why it's "another level" | Effort |
|---|---|---|---|
| 18 | **LLM-assisted detection of new scam scripts.** The LLM reads the anonymous public reports (personal data removed), groups similar ones and tells the moderator e.g. *"New script this week: 'НАП refund by SMS link', 9 reports in Пловдив"*, and **suggests new keywords**. The moderator approves; the rule engine then recognises the new script at once (`extraKeywords`) | The system improves itself while staying explainable: AI suggests, a human decides, the rules decide the verdict | ≈ 6–8 h (after W3-01, W3-04, W3-05, W3-07) |
| 19 | **„Разкажете ми“: grandma retells the call by voice.** After the call (or with the caller on hold) she says in her own words what happened; speech-to-text (W2-10) turns it into text; the rule engine and the LLM analyse it | The legal version of "listening to the call": we analyse her words, not the caller's voice | ≈ 2 h on top of W2-10 |
| 20 | **LLM-written practice calls for „Тренировка“ (idea 1).** The LLM writes short, realistic fake scam scripts based on the real scam waves from the map; grandma practises pressing the button; family sees the result | Prebunking with fresh, local scripts instead of a fixed set | ≈ 3 h on top of idea 1 |

## 9. Ideas inbox (add new ideas here)

Write each new idea as one row; we decide together which ones to build.

| # | Idea | Who suggested | Date | Decision |
|---|---|---|---|---|
| 21 | *(next idea)* | | | |
