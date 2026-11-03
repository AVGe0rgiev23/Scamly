<!-- Records the existing D7 decision; does not claim notification delivery is implemented. -->
# ADR 0005: live family page first, push and email as additional channels

Date: 3 November 2026

Status: accepted design (D7); notification implementation planned for Week 2.

## Context

Scamly must show a linked family member that a protected person has started a suspicious-call check. The live demonstration needs a visible path from the protected phone to the family's phone without requiring the jury to install an app or configure notifications first. The family must also be able to acknowledge the alert so the protected person sees who will call.

The project budget is approximately zero. We already chose Supabase for the database, authentication and Realtime. This record documents [D7 in the brief](../PROJECT_BRIEF.md#0-decision-log-decided-on-2-november-2026), rather than introducing a new plan decision.

## Options

| Option | Benefit | Limitation for this project |
|---|---|---|
| An authenticated live page using Supabase Realtime | Shows updates in an open browser without a separate installation or notification permission | Requires an open page and a working connection; it cannot promise background delivery |
| Web push as the only channel | Can notify a subscribed family member when the page is closed | Depends on permission, browser support and device setup; the plan includes an iOS Add to Home Screen hint |
| Email as the only channel | Familiar and available beyond one browser session | Delivery can be delayed or filtered as spam; it is weak evidence for an immediate live demo |
| A native app, SMS or messaging bot | Could offer another way to reach relatives | Adds platform work, accounts, possible cost or an extra app requirement; outside the chosen MVP |

## Decision

Use the authenticated family **live alert page with Supabase Realtime as the primary path**. Add **web push** and **email** as additional notification channels, following the existing D7 plan.

- The backend creates an alert for each linked family recipient and updates the check; the browser receives permitted Realtime changes.
- The family's acknowledgement goes through the REST API. The protected screen receives the resulting update and can show who will call.
- RLS limits what each subscriber may read. Browser writes still go through the API with validation and permission checks; Realtime does not replace those checks.
- Web push uses opt-in subscriptions and VAPID as planned in W2-05. Test the actual target devices and record support/setup evidence before the demo; do not assume permission or installation.
- Email uses the D5 `EmailProvider` abstraction with Brevo, or a configured no-op provider when disabled. Provider delivery is not the proof that a family member has read or acknowledged an alert.
- Bring our own phone, already logged in as a family member, alongside the jury's phone for the live demo.

## Consequences

The demo can show the alert and acknowledgement directly while the family page is open. Push and email provide additional opportunities to notice an alert, but no channel guarantees immediate receipt or human action. A disconnected page needs a clear connection state and fresh server state when reconnected; this must be addressed and tested during implementation.

Each channel adds setup, failure cases and tests. Keep channel delivery status separate from the family's acknowledgement. Use test/fake senders for automated tests rather than sending real messages. No new paid service is approved by this ADR.

## Current implementation and completion evidence

The schema, alert/check RLS policies and Realtime publication are present in `supabase/`. Their database tests cover the database foundation. Alert fan-out, browser subscriptions, acknowledgement API/UI, web-push sending and email sending are **not yet implemented** by this ADR.

W2-03 through W2-06 and W2-11 remain the implementation tasks. Completion requires the planned two-browser-context test (protected check → family alert → acknowledge → protected screen update), cross-family access tests, channel-failure tests and recorded device checks for push. This document alone is not delivery evidence.

Sources within the repository: [brief D7 and family alert](../PROJECT_BRIEF.md), [architecture and Week 2 tasks](../BUILD_PLAN.md), [notification choices](../WHY_WE_CHOSE.md#5-notifications).
