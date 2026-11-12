// Joins CSS class names and skips empty ones, like Python's
// " ".join(x for x in names if x).

export function cn(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
