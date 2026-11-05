// Our own Scamly mark: a shield with a mobile phone inside, drawn as inline SVG.
// No image file to download, and the colours come from the theme tokens in globals.css,
// so the mark changes together with the light and dark theme.

export function LogoMark() {
  return (
    // aria-hidden: the picture is decoration; the link next to it carries the text.
    <svg className="logo-mark" viewBox="0 0 32 32" width="36" height="36" aria-hidden="true">
      <path
        className="logo-shield"
        d="M16 2 L28 6.5 V15 C28 22.4 23 27.8 16 30 C9 27.8 4 22.4 4 15 V6.5 Z"
      />
      <rect className="logo-phone" x="11.5" y="8.5" width="9" height="15" rx="2" />
      <circle className="logo-phone-dot" cx="16" cy="20" r="1.2" />
    </svg>
  );
}
