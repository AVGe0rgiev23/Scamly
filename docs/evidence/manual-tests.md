# Manual tests (live site)

Tests that need real phones, real accounts or real services, so they can't run automatically.
Do them on the **live site** https://scamly-ag777.vercel.app. Fill in the **Result** column
(✅ / ❌ + date + device). Anything that fails or feels confusing goes into the notes at the
bottom: this is our usability-test evidence for the jury (W4-05).

Add new rows whenever a feature is added. Last updated: 6 Nov 2026 (end of Week 2).

## A. Before you start (once)

- **iPhone:** delete any Scamly icon added before 6 Nov (it was only a bookmark, without the app manifest). Open the site in **Safari** → Share → „Добави към началния екран“ → open Scamly **from the new icon**.
- Use accounts where the phone's family account is really a relative of the grandma you test with (the owner of the person, or a contact who accepted an invite).

## B. Core demo (most important)

| # | Test | Devices | Expected | Result |
|---|---|---|---|---|
| 1 | Pair a phone: family `/family` → person → „Свържи телефон“ → enter the code on the other device at `/svarzhi` (or scan the QR) | 2 | Grandma's big-button screen opens and stays logged in after closing and reopening | |
| 2 | Full flow: grandma presses „Обаждат ми се за пари!“ → police + money → result | grandma | Red, starting with „Добре направихте, че проверихте.“, within 5 s | |
| 3 | Family sees it live on `/family/alerts` | family | Alert appears in about 2–4 s without reloading | |
| 4 | Family presses „Обаждам ѝ се сега“ | family | Grandma's screen shows „<Име> ще ви се обади веднага.“ in about 1 s | |
| 5 | Repeat 2–4 three times | both | Works every time | |
| 6 | Green case: bank + no money | grandma | „Няма типични признаци на измама…“, never „безопасно“ | |
| 7 | Add a phone number to contact #1, then run a check | both | „Обади се на <име>“ appears and opens the phone dialer | |

## C. Notifications (push)

| # | Test | Expected | Result |
|---|---|---|---|
| 8 | iPhone: in the installed app → `/family` → „Включи известията“ → Allow → close the app → grandma runs a check | Notification within seconds; tapping it opens the alert | |
| 9 | Android (Chrome): same | Same | |
| 10 | Red verdict after the first notification | The red notification replaces the first one | |
| 11 | Log out on the phone, run a check | No notification (unsubscribed on logout) | |

## D. Other features

| # | Test | Expected | Result |
|---|---|---|---|
| 12 | Invite: owner → „Покани близък“ → open the link logged out → register / log in | Back to the invite, „Вече сте близък на…“, token gone from the address bar, the second account now gets alerts | |
| 13 | Voice (Android Chrome): grandma's text step → „Говорете“ → speak Bulgarian | Spoken words appear as text | |
| 14 | Offline: installed app, airplane mode on, open a page | Offline card with the 3 rules | |
| 15 | Install card: Android shows „Инсталирай Scamly“, iPhone Safari shows the 3 steps | Correct variant | |
| 16 | Remove a phone: family → „Премахни“ | That device is logged out at its next action | |
| 17 | Dark mode and a small phone | Readable, no sideways scrolling | |
| 18 | E-mail (after Brevo is set up) | One e-mail at check start, a second only when red | |

## E. Jury demo accounts

| # | Test | Expected | Result |
|---|---|---|---|
| 19 | Log in with each demo account (password: given privately, not in this public repo) | family / second relative → `/family`; moderator, admin → their pages | |
| 20 | Wrong password 11 times within 15 minutes | „Твърде много опити…“ | |

## Notes (problems, confusing moments, ideas)

| Date | Device | Test # | What happened |
|---|---|---|---|
| | | | |
