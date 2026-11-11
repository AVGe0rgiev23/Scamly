# Week 3 learning notes

## Roberta's map, moderation API, and script library

- **Map (W3-03).** The map combines public district geometry with aggregate counts of approved reports. Leaflet draws the 28 district shapes in the browser without fetching base-map tiles. A district panel and table expose the counts without relying on colour or the ability to operate the map.
- **Moderation API (W3-04).** The API checks the moderator's role on the server and approves or rejects only a report that is still pending. If two moderators act on the same report, the second gets a 409 and can refresh the queue. The audit records the decision. The repeat-caller indicator exposes a count while keeping the phone hash on the server.
- **Script library (W3-05).** Published cards come from the database. Moderators manage cards and keywords through validated API requests. Keywords attach to existing scam categories, and the engine reads them through a short cache. A moderator can explain how an edit reaches the education page and how a keyword reaches the checker.

## Roberta's guides, escalation, and fridge card

- **Role help (W3-08).** One shared component renders the four role guides. Each guide uses Bulgarian copy and screenshots for actions available in that dashboard.
- **Escalation (W3-09).** A scheduled job checks for alerts that have gone two minutes without acknowledgement. The database locks each due check while it records the next eligible recipient, so overlapping runs cannot claim the same step. An acknowledgement stops future escalation. When the last response window expires, the protected screen can advise calling 112 in immediate danger. The production scheduler and a live test are still pending.
- **Fridge card (W3-10).** A print stylesheet produces one A5 portrait page with large Bulgarian instructions and a pairing QR. Explain how to pair from the printed card and show the page in print preview.

For the defense, trace a report from pending to approved and show the district count change. Then explain how the escalation timer behaves when contact one acknowledges, when contact two acknowledges, and when nobody acknowledges.
