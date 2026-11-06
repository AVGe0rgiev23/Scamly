// The HTML of the offline card /offline (task W2-09): „Няма връзка с интернет“ and the
// three rules to remember. The service worker (public/sw.js) keeps a copy of it and
// shows it when a page can't load because the phone has no internet.
//
// Why plain HTML in one string, not a normal React page: without internet the phone
// can't load our CSS and JavaScript files from /_next/static, and a normal page
// would also carry the header with the logged-in person's name. So this page is
// self-contained: inline styles (light and dark, the tokens of globals.css), our
// logo as inline SVG, no scripts, no personal data. Unit-tested in offlinePage.test.ts.

import { bg } from "@/i18n/bg";

// Makes text safe to put inside HTML (like Python's html.escape).
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const STYLE = `
:root{color-scheme:light;--bg:#f4f6f8;--surface:#ffffff;--fg:#17212b;--muted:#475569;--primary:#174ea6;--on-primary:#ffffff;--border:#64748b}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#101820;--surface:#1c2733;--fg:#f1f5f9;--muted:#cbd5e1;--primary:#93c5fd;--on-primary:#17212b;--border:#94a3b8}}
*{box-sizing:border-box}
html{font-size:18px}
body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.6}
main{max-width:40rem;margin:0 auto;padding:1.5rem 1rem}
.brand{display:flex;align-items:center;gap:.5rem;font-size:1.4rem;font-weight:800;margin-bottom:1.5rem}
.shield{fill:var(--primary)}.phone{fill:none;stroke:var(--on-primary);stroke-width:2}.dot{fill:var(--on-primary)}
.card{background:var(--surface);border:1px solid var(--border);border-left:6px solid var(--primary);border-radius:1rem;padding:1.25rem}
h1{font-size:2rem;line-height:1.15;margin:0 0 .75rem}
h2{font-size:1.25rem;margin:1.25rem 0 .5rem}
ul{margin:0;padding-left:1.25rem;display:grid;gap:.5rem;font-weight:600}
li::marker{color:var(--primary)}
.button{display:inline-flex;align-items:center;min-height:64px;margin-top:1.5rem;padding:.7rem 1.2rem;border:2px solid var(--primary);border-radius:.75rem;background:var(--primary);color:var(--on-primary);font-weight:700;text-decoration:none}
.button:focus-visible{outline:3px solid var(--primary);outline-offset:4px}
`;

export function offlinePageHtml(): string {
  const rules = bg.home.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  return `<!doctype html>
<html lang="bg">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(bg.offline.pageTitle)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
<div class="brand"><svg viewBox="0 0 32 32" width="36" height="36" aria-hidden="true"><path class="shield" d="M16 2 L28 6.5 V15 C28 22.4 23 27.8 16 30 C9 27.8 4 22.4 4 15 V6.5 Z"/><rect class="phone" x="11.5" y="8.5" width="9" height="15" rx="2"/><circle class="dot" cx="16" cy="20" r="1.2"/></svg>${escapeHtml(bg.app.name)}</div>
<section class="card" aria-labelledby="offline-title">
<h1 id="offline-title">${escapeHtml(bg.offline.title)}</h1>
<p>${escapeHtml(bg.offline.lead)}</p>
<h2>${escapeHtml(bg.home.rulesTitle)}</h2>
<ul>${rules}</ul>
</section>
<a class="button" href="/">${escapeHtml(bg.offline.retry)}</a>
</main>
</body>
</html>
`;
}
