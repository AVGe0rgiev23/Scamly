// Feature switches: one on/off switch for every optional feature.
//
// Why: decisions D12 and D35 in docs/PROJECT_BRIEF.md say which features we cut. With
// these switches we can turn a feature on or off by changing one environment variable
// (for example on Vercel), without changing any code. Voice input and alert e-mails
// are off by default (D35): voice was never tested on a real phone, and there is no
// e-mail sender account yet. Their code stays, so one variable turns them back on.
//
// The switches are read on the server. A page that needs one passes the value down to
// its components as a normal prop.

// Turns the text of an environment variable into true/false.
// "true" or "1" (any letter case, spaces ignored) → true. Any other text → false.
// If the variable is missing or empty, we use the safe default instead.
export function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return defaultValue;
  }
  const cleaned = value.trim().toLowerCase();
  return cleaned === "true" || cleaned === "1";
}

// The shape of our switches: like a Python dataclass with three bool fields.
export type Features = {
  voice: boolean; // speak instead of typing (Web Speech API), off by default (D35)
  push: boolean; // web push notifications
  email: boolean; // alert e-mails, off by default until a sender is set up (D35)
};

// Environment variables can be missing, so every value may be undefined.
// Record<string, string | undefined> is like Python's dict[str, str | None].
type Env = Record<string, string | undefined>;

// Reads all switches. Tests pass their own `env` object; the app uses the real process.env.
export function getFeatures(env: Env = process.env): Features {
  return {
    voice: parseBoolean(env.FEATURE_VOICE, false),
    push: parseBoolean(env.FEATURE_PUSH, true),
    email: parseBoolean(env.FEATURE_EMAIL, false),
  };
}
