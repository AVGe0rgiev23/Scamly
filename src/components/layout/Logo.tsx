// The Scamly mark: a signal trace inside a square. The left half is jagged (a
// suspicious call), the right half is steady (checked). Drawn as inline SVG in the
// current text colour, so it follows the theme. Our own drawing.

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    // aria-hidden: decoration; the link next to it carries the name.
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="7" className="fill-accent" />
      <path
        d="M5 16h3l2-7 3 13 2.5-9 1.5 3H27"
        className="stroke-on-accent"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
