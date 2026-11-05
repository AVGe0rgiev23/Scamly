// Displays a verdict using words and symbols as well as colour; does not score calls.
import { bg } from "@/i18n/bg";
import { Card } from "./Card";

// The symbol shown before the verdict's words (shared with VerdictBadge).
export const VERDICT_SYMBOLS = { red: "!", yellow: "!", green: "✓" } as const;

export function Verdict({ level }: { level: "red" | "yellow" | "green" }) {
  const text = bg.verdict[level];
  const symbol = VERDICT_SYMBOLS[level];
  return (
    <Card className={`verdict verdict-${level}`}>
      <h3>
        <span aria-hidden="true">{symbol} </span>
        {text.title}
      </h3>
      <p>{text.description}</p>
    </Card>
  );
}
