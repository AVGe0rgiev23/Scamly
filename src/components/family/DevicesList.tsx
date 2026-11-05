// „Свързани телефони“: the phones paired for this person (name, date, status).
// The owner can remove („Премахни“) a phone, e.g. a lost one, after a clear
// confirmation window: DELETE /api/devices/:id deletes the phone's account, so its
// very next request is refused. Trusted contacts see the list without the button.
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
    <div className="devices">
      {devices.length === 0 ? (
        <p className="muted">{bg.family.devicesEmpty}</p>
      ) : (
        <ul className="device-list">
          {devices.map((device) => (
            <li key={device.id} className="device-row">
              <p className="contact-name">{nameOf(device)}</p>
              <p>{fill(bg.family.devicePairedAt, { time: formatDateTime(device.pairedAt) })}</p>
              <p className={device.revoked ? "device-status muted" : "device-status"}>
                <span aria-hidden="true">{device.revoked ? "✕ " : "✓ "}</span>
                {device.revoked ? bg.family.deviceRevoked : bg.family.deviceActive}
              </p>
              {canEdit && !device.revoked ? (
                <Button
                  variant="danger"
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
      <Button variant="secondary" onClick={refresh} disabled={refreshing}>
        {refreshing ? bg.common.loading : bg.family.refreshDevices}
      </Button>
      <FormMessage notice={notice} />

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
