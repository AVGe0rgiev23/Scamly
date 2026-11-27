// „Изпратете анонимно на картата“ (P-11): a quiet secondary action on the protected
// phone's red screens (the red verdict and „Не съм аз“). It sends an anonymous report
// to the existing POST /api/reports, so it lands in the moderation queue as
// "pending", exactly like a report from the public form /signal.
//
//   closed  -> one secondary button
//   open    -> what is sent (district + kind of scam, nothing else) and „Изпрати“;
//              when the person's district is not known, one simple district picker
//   sent    -> a calm thank-you in a live region; the button does not come back
//
// The API's rate limit (3 per network per hour) and honeypot apply as on /signal:
// the honeypot field is simply sent empty (mapReport.ts). Its message is shown on
// any error, with „Опитайте отново“.
"use client";

import { MapPin } from "lucide-react";
import { useId, useState } from "react";
import { callApi } from "@/components/family/api";
import { districtName, districtOptions, fill } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import type { ScriptType } from "@/engine";
import { bg } from "@/i18n/bg";
import type { DistrictCode } from "@/schemas/reports";
import { asDistrictCode, buildMapReport } from "./mapReport";

// Which part is shown. Like a Python Literal["closed", "open", "sending", "sent"].
type Phase = "closed" | "open" | "sending" | "sent";

export function SendToMap({
  scriptType,
  districtCode,
  className,
}: {
  scriptType: ScriptType;
  districtCode: DistrictCode | null; // the person's district, null = ask
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>("closed");
  const [picked, setPicked] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const selectId = useId();
  const errorId = useId();

  async function send() {
    const district = districtCode ?? asDistrictCode(picked);
    if (district === null) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setError(null);
    setPhase("sending");
    const result = await callApi<{ ok: true }>(
      "/api/reports",
      "POST",
      buildMapReport({ districtCode: district, scriptType, now: new Date() }),
    );
    if (result.ok) {
      setPhase("sent");
    } else {
      setError(result.messageBg);
      setPhase("open");
    }
  }

  return (
    <div className={className}>
      {/* A live region from the start, so the thank-you is read aloud when it appears. */}
      <div role="status">
        {phase === "sent" ? (
          <Notice status="safe" className="text-lg">
            {bg.sendToMap.sent}
          </Notice>
        ) : null}
      </div>

      {phase === "closed" ? (
        <Button variant="secondary" size="xl" className="w-full" onClick={() => setPhase("open")}>
          <MapPin className="size-6 shrink-0" aria-hidden="true" />
          {bg.sendToMap.button}
        </Button>
      ) : null}

      {phase === "open" || phase === "sending" ? (
        <section className="check-reasons flex flex-col gap-4" aria-labelledby={`${selectId}-t`}>
          <h2 id={`${selectId}-t`} className="text-xl font-semibold">
            {bg.sendToMap.title}
          </h2>
          <p className="text-lg">{bg.sendToMap.intro}</p>
          {districtCode === null ? (
            <Field
              label={bg.sendToMap.districtLabel}
              htmlFor={selectId}
              error={missing ? bg.sendToMap.districtMissing : null}
              errorId={errorId}
            >
              <Select
                id={selectId}
                size="lg"
                value={picked}
                aria-invalid={missing || undefined}
                aria-describedby={missing ? errorId : undefined}
                onChange={(event) => {
                  setPicked(event.target.value);
                  setMissing(false);
                }}
              >
                <option value="">{bg.sendToMap.districtPlaceholder}</option>
                {districtOptions().map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <p className="text-lg font-semibold">
              {fill(bg.sendToMap.districtKnown, { district: districtName(districtCode) })}
            </p>
          )}
          {error === null ? null : (
            <Notice status="danger" role="alert" className="text-lg">
              {error}
            </Notice>
          )}
          <Button size="xl" onClick={() => void send()} disabled={phase === "sending"}>
            {phase === "sending"
              ? bg.sendToMap.sending
              : error === null
                ? bg.sendToMap.send
                : bg.sendToMap.retry}
          </Button>
          <Button
            variant="secondary"
            size="xl"
            onClick={() => {
              setPhase("closed");
              setError(null);
              setMissing(false);
            }}
            disabled={phase === "sending"}
          >
            {bg.sendToMap.cancel}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
