// Remembers on this phone who to call („Обади се на Иван“), so the home screen can
// show the button before the next check. The API sends the contact with every
// verdict (PUT /api/checks/:id/answers -> callContact); there is no other API the
// phone may read it from.
//
// localStorage keeps it only in this browser, like a small Python dict saved to a
// file. It is a convenience: if it is missing (first check, private window, cleared
// data) the home screen simply shows no call button. Every read and write is inside
// try/catch, because some browsers block localStorage.

import { useSyncExternalStore } from "react";
import type { CallContactDto } from "@/schemas/checks";

const STORAGE_KEY = "scamly-call-contact";
// Our own event name: the browser's "storage" event only reaches OTHER tabs.
const CHANGE_EVENT = "scamly-call-contact-change";

// The saved text, or null if there is none (or it can't be read).
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// The saved text -> a contact, or null if it is missing or broken. Pure function.
export function parseCallContact(raw: string | null): CallContactDto | null {
  if (raw === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === "object" &&
      value !== null &&
      "displayName" in value &&
      "phone" in value &&
      typeof value.displayName === "string" &&
      typeof value.phone === "string"
    ) {
      return { displayName: value.displayName, phone: value.phone };
    }
  } catch {
    // Not JSON: treat it as "nothing saved".
  }
  return null;
}

// Saves the contact from the latest verdict; null forgets it (nobody with a phone).
export function saveCallContact(contact: CallContactDto | null): void {
  try {
    if (contact === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contact));
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage blocked: the button just won't be shown before the next verdict.
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// React hook: the remembered contact, updated when it changes. On the server (and
// during the first render in the browser) it is null, so the HTML always matches.
// useSyncExternalStore is React's way to read a value that lives outside React.
export function useCallContact(): CallContactDto | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return parseCallContact(raw);
}

// "+359 888 123 456" -> "tel:+359888123456" (spaces are not allowed in a tel: link).
export function telLink(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
