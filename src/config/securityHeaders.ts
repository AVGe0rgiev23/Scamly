// The security headers of every page (task W4-01), added in next.config.ts.
//
// The most important one is the Content Security Policy (CSP). It tells the browser
// what a Scamly page may load and where it may connect: scripts, fonts and pictures
// only from our own site, data only from our site and our Supabase project, no
// frames, no plugins, forms only to us.
//
// Scripts: Next.js writes small inline scripts into every page (the data React needs
// to start), and their text changes from page to page. A strict policy would need a
// "nonce" (a random number per request), and the Next.js docs say nonces cannot
// work with pre-rendered pages (our Cache Components / Partial Prerendering). So we
// allow inline scripts ('unsafe-inline') and keep every other rule strict; React
// escaping all text is the main protection against injected scripts (XSS).
// The full reasoning is in docs/security.md and decision D27.

// One header, like a Python dict with two keys.
export type Header = { key: string; value: string };

// The origins of our Supabase project: https for the API and wss for Realtime.
// `null` (no Supabase settings, e.g. in CI) → no outside connection is allowed.
export function supabaseOrigins(supabaseUrl: string | undefined): string[] {
  if (supabaseUrl === undefined || supabaseUrl === "") return [];
  try {
    const url = new URL(supabaseUrl);
    return [url.origin, `${url.protocol === "http:" ? "ws:" : "wss:"}//${url.host}`];
  } catch {
    return [];
  }
}

type PolicyOptions = {
  supabaseUrl: string | undefined;
  development: boolean;
};

// The Content-Security-Policy value, one directive per entry.
export function contentSecurityPolicy({ supabaseUrl, development }: PolicyOptions): string {
  // `next dev` also needs eval() (React's readable error messages); production not.
  const scripts = development
    ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    : ["'self'", "'unsafe-inline'"];
  const directives = [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    // Inline style attributes are needed (the map, the charts, the signal line).
    // Styles cannot run code, so this is a much smaller risk than inline scripts.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${["'self'", ...supabaseOrigins(supabaseUrl)].join(" ")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!development) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

// Every header for every page. `development` is true under `next dev`.
export function securityHeaders(options: PolicyOptions): Header[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // Always HTTPS for two years, also for subdomains (Vercel serves only HTTPS).
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    // Never guess a file type from its content (a "picture" can't become a script).
    { key: "X-Content-Type-Options", value: "nosniff" },
    // No other site may show Scamly inside a frame (clickjacking). The CSP's
    // frame-ancestors says the same for newer browsers.
    { key: "X-Frame-Options", value: "DENY" },
    // Other sites see only "scamly-ag777.vercel.app", never the page address.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Only the microphone (voice input „Говорете“), only for our own pages.
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), bluetooth=(), browsing-topics=()",
    },
    // A page opened from Scamly can't reach back into our window.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
