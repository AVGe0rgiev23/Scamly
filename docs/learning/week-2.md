# Week 2 learning notes

## Roberta's screens and PWA

- **Site layout.** The root layout gives every route the same header and footer. The header reads account links on the server, inside a Suspense boundary, so the page frame can render while the session lookup finishes.
- **Protected call check.** React state tracks the current question and the answers. Each screen presents one decision. The server returns the official verdict and handles family alerts. If the request stalls, the phone can use the shared rules engine for immediate guidance and retry submission when the network returns.
- **Family dashboard.** Server-rendered pages read the signed-in family's data. Client components call the existing APIs to update people, reorder contacts, and manage pairing. The pairing QR encodes a link, so a phone can open it with its camera.
- **Invitation.** The invitation page submits the token and removes it from the address bar. The login form accepts only an allowed local return path. Explain how those two steps limit token exposure and unwanted redirects.
- **PWA.** The manifest provides app identity and icons for installation. The service worker returns the offline page after a navigation request fails. The call-check engine is a separate fallback for a protected screen that is already open. A browser test can verify the offline response, while installation and push delivery still need a real phone.

For the defense, trace a check from the first answer to the server verdict and explain what the protected person sees when the network drops. Then show where the family reorders trusted contacts and how the pairing QR opens on a phone.
