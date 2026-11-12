// The HTML of the offline card /offline (task W2-09): „Няма връзка с интернет“ and the
// three rules to remember. The service worker (public/sw.js) keeps a copy of it and
// shows it when a page can't load because the phone has no internet.
//
// Why plain HTML in one string, not a normal React page: without internet the phone
// can't load our CSS and JavaScript files from /_next/static, and a normal page
// would also carry the header with the logged-in person's name. So this page is
// self-contained: inline styles (dark by default, light when the device asks for
// it; the colours of the Signal tokens in globals.css), our
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
:root{color-scheme:dark;--bg:#080b0f;--surface:#0d1218;--fg:#eaf1f5;--muted:#a8b5c0;--primary:#3de6f0;--on-primary:#03181b;--border:#1f2a35}
@media (prefers-color-scheme:light){:root{color-scheme:light;--bg:#f6f7f4;--surface:#ffffff;--fg:#0e161c;--muted:#44515b;--primary:#006d78;--on-primary:#ffffff;--border:#d5d9d1}}
*{box-sizing:border-box}
html{font-size:18px}
body{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;line-height:1.6}
main{max-width:40rem;margin:0 auto;padding:2rem 1rem}
.brand{display:flex;align-items:center;gap:.5rem;font-size:1.25rem;font-weight:700;letter-spacing:-.01em;margin-bottom:2rem}
.shield{fill:var(--primary)}.phone{fill:none;stroke:var(--on-primary);stroke-width:2}.dot{fill:var(--on-primary)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem}
h1{font-size:2rem;line-height:1.1;letter-spacing:-.02em;margin:0 0 .75rem}
h2{font-size:1.25rem;letter-spacing:-.01em;margin:1.5rem 0 .5rem}
p{color:var(--muted);margin:0}
ul{margin:0;padding:0;list-style:none;font-weight:600}
li{padding:.75rem 0;border-top:1px solid var(--border)}
.button{display:inline-flex;align-items:center;min-height:64px;margin-top:1.5rem;padding:.7rem 1.4rem;border:1px solid var(--primary);border-radius:10px;background:var(--primary);color:var(--on-primary);font-weight:700;text-decoration:none}
.button:focus-visible{outline:2px solid var(--primary);outline-offset:3px}
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
