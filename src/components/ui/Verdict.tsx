// Displays a verdict using words and symbols as well as colour; does not score calls.
import { bg } from "@/i18n/bg";
import { Card } from "./Card";

export function Verdict({ level }: { level: "red" | "yellow" | "green" }) {
  const text = bg.verdict[level];
  const symbol = { red: "!", yellow: "!", green: "✓" }[level];
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
