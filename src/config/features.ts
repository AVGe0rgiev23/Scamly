// Feature switches: one on/off switch for every optional feature.
//
// Why: decision D12 in docs/PROJECT_BRIEF.md says which features we cut first if we run
// late (AI → voice → escalation ...). With these switches we can turn a feature off by
// changing one environment variable (for example on Vercel), without changing any code.
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

// The shape of our switches: like a Python dataclass with five bool fields.
export type Features = {
  ai: boolean; // AI second opinion (Gemini / Groq), off until Week 3
  voice: boolean; // speak instead of typing (Web Speech API)
  escalation: boolean; // escalate an unanswered alert to more family members
  push: boolean; // web push notifications
  email: boolean; // alert e-mails
};

// Environment variables can be missing, so every value may be undefined.
// Record<string, string | undefined> is like Python's dict[str, str | None].
type Env = Record<string, string | undefined>;

// Reads all switches. Tests pass their own `env` object; the app uses the real process.env.
export function getFeatures(env: Env = process.env): Features {
  return {
    ai: parseBoolean(env.FEATURE_AI, false),
    voice: parseBoolean(env.FEATURE_VOICE, true),
    escalation: parseBoolean(env.FEATURE_ESCALATION, false),
    push: parseBoolean(env.FEATURE_PUSH, true),
    email: parseBoolean(env.FEATURE_EMAIL, true),
  };
}
