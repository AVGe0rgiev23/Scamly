// „Свързани телефони“: the phones paired for this person (name, date, status).
// The owner can remove („Премахни“) a phone, e.g. a lost one, after a clear
// confirmation window: DELETE /api/devices/:id deletes the phone's account, so its
// very next request is refused. Trusted contacts see the list without the button.
// Look: hairline-separated rows; the state is a StatusPill (icon + word); the remove
// trigger is a ghost button, the red button exists only inside the confirmation.
"use client";

import { RefreshCw, Smartphone } from "lucide-react";
import { useState } from "react";
import { StatusPill } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/States";
import { bg } from "@/i18n/bg";
import { callApi, type DeviceDto, type PersonDetailsDto } from "./api";
import { FormMessage, type FormNotice } from "./fields";
import { fill, formatDateTime } from "./format";

type DevicesListProps = {
  personId: string;
  devices: DeviceDto[];
  canEdit: boolean;
  onChange: (devices: DeviceDto[]) => void;
};

function nameOf(device: DeviceDto): string {
  return device.label ?? bg.family.deviceUnnamed;
}

export function DevicesList({ personId, devices, canEdit, onChange }: DevicesListProps) {
  // The phone the confirmation window is about (null = window closed).
  const [toRevoke, setToRevoke] = useState<DeviceDto | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FormNotice>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function revoke() {
    if (toRevoke === null) return;
    setRevoking(true);
    setDialogError(null);
    const result = await callApi<{ ok: true }>(`/api/devices/${toRevoke.id}`, "DELETE");
    setRevoking(false);
    if (!result.ok) {
      setDialogError(result.messageBg);
      return;
    }
    onChange(devices.filter((device) => device.id !== toRevoke.id));
    setToRevoke(null);
    setNotice({ kind: "success", text: bg.family.deviceRemoved });
  }

  // After pairing on the phone: load the list again (only the phones change here).
  async function refresh() {
    setRefreshing(true);
    setNotice(null);
    const result = await callApi<PersonDetailsDto>(`/api/persons/${personId}`);
    setRefreshing(false);
    if (!result.ok) {
      setNotice({ kind: "error", text: result.messageBg });
      return;
    }
    onChange(result.data.devices);
  }

  return (
    <div className="flex flex-col items-start gap-4">
      {devices.length === 0 ? (
        <EmptyState text={bg.family.devicesEmpty} className="w-full" />
      ) : (
        <ul className="w-full border-t border-line">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-4"
            >
              <Smartphone className="size-5 shrink-0 text-fg-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1 basis-40">
                <p className="font-semibold text-fg">{nameOf(device)}</p>
                <p className="tabular text-sm text-fg-muted">
                  {fill(bg.family.devicePairedAt, { time: formatDateTime(device.pairedAt) })}
                </p>
              </div>
              <StatusPill status={device.revoked ? "neutral" : "safe"}>
                {device.revoked ? bg.family.deviceRevoked : bg.family.deviceActive}
              </StatusPill>
              {canEdit && !device.revoked ? (
                <Button
                  variant="ghost"
                  aria-label={fill(bg.family.revokeLabel, { name: nameOf(device) })}
                  onClick={() => {
                    setDialogError(null);
                    setToRevoke(device);
                  }}
                >
                  {bg.family.revokeButton}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" onClick={refresh} loading={refreshing}>
        {refreshing ? null : <RefreshCw className="size-5" aria-hidden="true" />}
        {refreshing ? bg.common.loading : bg.family.refreshDevices}
      </Button>
      <div className="w-full empty:hidden">
        <FormMessage notice={notice} />
      </div>

      <ConfirmDialog
        open={toRevoke !== null}
        title={fill(bg.family.revokeDialogTitle, {
          name: toRevoke === null ? "" : nameOf(toRevoke),
        })}
        text={bg.family.revokeDialogText}
        confirmLabel={bg.family.revokeConfirm}
        cancelLabel={bg.family.cancel}
        pendingLabel={bg.family.revoking}
        pending={revoking}
        error={dialogError}
        onConfirm={revoke}
        onCancel={() => setToRevoke(null)}
      />
    </div>
  );
}
