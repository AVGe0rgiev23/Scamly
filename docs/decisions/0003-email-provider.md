<!-- Records D5; the email provider is configured in env.ts but no sender is implemented yet. -->
# ADR 0003: Brevo free tier behind an `EmailProvider` interface

Date: 4 November 2026

Status: accepted (D5); implementation planned for Week 2 (W2-06).

## Context

E-mail is the third alert channel for family members, after the Realtime live page and web push ([ADR 0005](./0005-alert-channels.md), D7). It may also send sign-up confirmation e-mails, because Supabase's built-in auth e-mail is very limited on the free tier (risk R5, Q8).

We have no domain of our own and do not plan to buy one for now (Q13); the app will run on a `*.vercel.app` address. The budget is about €0 ([D11](../PROJECT_BRIEF.md#0-decision-log-decided-on-2-november-2026)). E-mail is the least important channel for the live demo, so it must be easy to switch off without code changes.

## Options

| Option | Benefit | Limitation for this project |
|---|---|---|
| **Brevo free tier** | Sends from one verified sender address with **no domain of our own**; API and SMTP; a daily free limit (about 300 e-mails when we checked; check current limits) | Single-sender mail without our own domain is more likely to land in spam (risk R4); one more account and API key |
| Resend | Clean developer API | Needs our own verified domain to send to other people |
| SendGrid | Well known | Its free offer has changed over time; we could not rely on a lasting free plan (check current terms) |
| Gmail SMTP | Free and familiar | A personal Google account's credentials on our server, low limits, risk of the account being blocked |
| Supabase built-in e-mail | Already there | Only a few e-mails per hour, meant for auth tests, not alerts |
| No e-mail at all | Nothing to build or break | Loses one way to reach a family member whose page is closed and who has no push |

## Decision

Send e-mail through **Brevo's free tier**, behind a small **`EmailProvider` interface** (like a Python abstract base class) in the notifications layer.

- Implementations: `BrevoEmailProvider`, `NoopEmailProvider` (sends nothing) and a `ResendEmailProvider` stub for the day we have a domain.
- The provider is chosen only by configuration: `EMAIL_PROVIDER = brevo | resend | noop` (already validated in `src/lib/env.ts`, default `noop`). `BREVO_API_KEY` and `EMAIL_FROM` live in environment variables, never in git.
- At most one e-mail per alert per recipient. The alert text is Bulgarian wording from `src/i18n/bg.ts`.
- Sending an e-mail is not proof that the family saw the alert; only the acknowledgement through the API counts (ADR 0005).
- Unit tests use a fake HTTP client, so automated tests never send real mail.

## Consequences

Good: we can send alert e-mails today without buying a domain. If Brevo blocks us or delivery is bad, we switch to `noop` (or to Resend after buying a domain) by changing one environment variable, with no code change. Local work and CI run with `noop`, so nothing is sent by accident.

Bad: e-mails from a single sender without our own domain may go to spam, so testers may need to whitelist the sender, and e-mail is weak evidence for an immediate live demo. The free daily limit is fine for the competition but not for real use. The interface adds a little code for a channel that may end up turned off. The Brevo API key is one more secret to protect. No paid service is approved by this ADR.

## Current implementation and completion evidence

Present now: only the configuration. `src/lib/env.ts` accepts `EMAIL_PROVIDER` (`brevo`, `resend`, `noop`, default `noop`) and an optional `BREVO_API_KEY`; `.env.example` documents `EMAIL_PROVIDER`, `BREVO_API_KEY` and `EMAIL_FROM`. **No e-mail is sent by the app yet**; the interface, the providers and the Bulgarian alert template are not implemented.

W2-06 is the implementation task (Alex; e-mail wording by Roberta). It is done when switching `EMAIL_PROVIDER=noop` needs no code change, unit tests with a fake HTTP client pass, and one real e-mail has been received from the configured Brevo sender.

Sources within the repository: [brief D5](../PROJECT_BRIEF.md), [risks R4, R5 and questions Q8, Q13](../BUILD_PLAN.md#7-risk-register), [notification choices](../WHY_WE_CHOSE.md#5-notifications).
