// The heading and intro of /kak-raboti („Как работи измамата“, W3-05). Shared by the
// real page and the browser-test preview /dev/kak-raboti, so both look the same.

import { bg } from "@/i18n/bg";

export function EducationIntro() {
  return (
    <header className="edu-intro">
      <h1>{bg.education.title}</h1>
      <p className="edu-lead">{bg.education.lead}</p>
      <p>{bg.education.intro}</p>
    </header>
  );
}
