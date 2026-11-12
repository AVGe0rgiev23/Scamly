// „Потребители“ in the admin panel (W3-06): search by name or e-mail, filter by role,
// and change a role after a confirmation window. Phones of protected persons are not
// in the list (the API leaves them out). The admin's own row has no role select: the
// API refuses a change of one's own role anyway (409), the page only says so earlier.
// Looks: a search row (Field + role Select), then hairline-separated rows that line up
// in columns on a wide screen and stack on a phone. The list keeps role="list" (the
// tests and screen readers count the profiles as list items).
// A Client Component: every request goes to /api/admin/users, which checks the role.
"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { callApi } from "@/components/family/api";
import { fill, formatDateTime } from "@/components/family/format";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { SkeletonList } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { bg } from "@/i18n/bg";
import {
  ASSIGNABLE_ROLES,
  type AdminUserDto,
  type AdminUsersPageDto,
  type AssignableRole,
} from "@/schemas/admin";

type Filter = { q: string; role: AssignableRole | "" };
type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; users: AdminUserDto[]; nextCursor: string | null };
type Pending = { user: AdminUserDto; role: AssignableRole };

// "/api/admin/users?q=…&role=…&cursor=…" (empty values left out).
function usersUrl(filter: Filter, cursor: string | null): string {
  const params = new URLSearchParams();
  if (filter.q.trim() !== "") params.set("q", filter.q.trim());
  if (filter.role !== "") params.set("role", filter.role);
  if (cursor !== null) params.set("cursor", cursor);
  const query = params.toString();
  return query === "" ? "/api/admin/users" : `/api/admin/users?${query}`;
}

export function UsersPanel() {
  const ids = { search: useId(), searchHint: useId(), role: useId() };
  const [typed, setTyped] = useState<Filter>({ q: "", role: "" }); // the form
  const [filter, setFilter] = useState<Filter>({ q: "", role: "" }); // what is shown
  const [attempt, setAttempt] = useState(0); // a new number = load again
  const [state, setState] = useState<ListState>({ kind: "loading" });
  const [moreError, setMoreError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true; // an old, slow answer must not overwrite a newer one
    async function load() {
      const result = await callApi<AdminUsersPageDto>(usersUrl(filter, null));
      if (!active) return;
      setState(
        result.ok
          ? { kind: "ready", users: result.data.users, nextCursor: result.data.nextCursor }
          : { kind: "error", message: result.messageBg },
      );
    }
    void load();
    return () => {
      active = false;
    };
  }, [filter, attempt]);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "loading" });
    setNotice("");
    setFilter({ ...typed });
    setAttempt(attempt + 1);
  }

  async function loadMore() {
    if (state.kind !== "ready" || state.nextCursor === null) return;
    setLoadingMore(true);
    setMoreError(null);
    const result = await callApi<AdminUsersPageDto>(usersUrl(filter, state.nextCursor));
    setLoadingMore(false);
    if (!result.ok) {
      setMoreError(result.messageBg);
      return;
    }
    setState({
      kind: "ready",
      users: [...state.users, ...result.data.users],
      nextCursor: result.data.nextCursor,
    });
  }

  async function confirmChange() {
    if (pending === null) return;
    setSaving(true);
    setDialogError(null);
    const result = await callApi<{ user: AdminUserDto }>(
      `/api/admin/users/${pending.user.id}/role`,
      "PATCH",
      { role: pending.role },
    );
    setSaving(false);
    if (!result.ok) {
      setDialogError(result.messageBg);
      return;
    }
    const changed = result.data.user;
    if (state.kind === "ready") {
      setState({
        ...state,
        users: state.users.map((user) => (user.id === changed.id ? changed : user)),
      });
    }
    setPending(null);
    setNotice(
      fill(bg.admin.roleChanged, {
        name: changed.displayName,
        role: bg.admin.roleNames[changed.role],
      }),
    );
  }

  return (
    <div>
      <header className="mb-8 max-w-[60ch]">
        <h2 className="text-h3">{bg.admin.usersTitle}</h2>
        <p className="mt-2 text-fg-muted">{bg.admin.usersIntro}</p>
      </header>

      <form
        className="mb-6 grid gap-4 md:grid-cols-12 md:items-start"
        role="search"
        onSubmit={onSearch}
      >
        <Field
          label={bg.admin.searchLabel}
          htmlFor={ids.search}
          hint={bg.admin.searchHint}
          hintId={ids.searchHint}
          className="md:col-span-6"
        >
          <Input
            id={ids.search}
            type="search"
            value={typed.q}
            maxLength={100}
            aria-describedby={ids.searchHint}
            onChange={(event) => setTyped({ ...typed, q: event.target.value })}
          />
        </Field>
        <Field label={bg.admin.roleFilterLabel} htmlFor={ids.role} className="md:col-span-4">
          <Select
            id={ids.role}
            value={typed.role}
            onChange={(event) =>
              setTyped({ ...typed, role: event.target.value as AssignableRole | "" })
            }
          >
            <option value="">{bg.admin.roleFilterAll}</option>
            {ASSIGNABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {bg.admin.roleNames[role]}
              </option>
            ))}
          </Select>
        </Field>
        {/* Lined up with the fields (under their labels) on a wide screen. */}
        <Button type="submit" variant="secondary" className="self-start md:col-span-2 md:mt-8">
          <Search className="size-5" aria-hidden="true" />
          {bg.admin.search}
        </Button>
      </form>

      <div role="status">
        {notice === "" ? null : (
          <Notice status="safe" className="appear mb-6">
            {notice}
          </Notice>
        )}
      </div>

      <UserRows
        state={state}
        onRetry={() => {
          setState({ kind: "loading" });
          setAttempt(attempt + 1);
        }}
        onPickRole={(user, role) => {
          setDialogError(null);
          setNotice("");
          setPending({ user, role });
        }}
      />

      {state.kind === "ready" && state.nextCursor !== null ? (
        <div className="mt-6 flex flex-col items-start gap-3">
          {moreError ? (
            <Notice status="danger" role="alert">
              {moreError}
            </Notice>
          ) : null}
          <Button
            variant="secondary"
            loading={loadingMore}
            disabled={loadingMore}
            onClick={() => void loadMore()}
          >
            {loadingMore ? bg.admin.loadingMore : bg.admin.showMore}
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={bg.admin.confirmTitle}
        text={
          pending === null
            ? ""
            : fill(bg.admin.confirmText, {
                name: pending.user.displayName,
                role: bg.admin.roleNames[pending.role],
                oldRole: bg.admin.roleNames[pending.user.role],
              })
        }
        confirmLabel={bg.admin.confirmButton}
        cancelLabel={bg.admin.cancel}
        pendingLabel={bg.admin.confirmPending}
        pending={saving}
        error={dialogError}
        onConfirm={() => void confirmChange()}
        tone="primary"
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function UserRows({
  state,
  onRetry,
  onPickRole,
}: {
  state: ListState;
  onRetry: () => void;
  onPickRole: (user: AdminUserDto, role: AssignableRole) => void;
}) {
  if (state.kind === "loading") {
    return (
      <>
        <p role="status" className="sr-only">
          {bg.admin.loading}
        </p>
        <SkeletonList rows={3} className="border-t border-line" />
      </>
    );
  }
  if (state.kind === "error") {
    // Not ui/ErrorState: its role="alert" box also holds the retry button, and here the
    // alert must read only the API's message (the e2e test checks the exact text).
    return (
      <div className="flex flex-col items-start gap-4">
        <Notice status="danger" role="alert">
          {state.message}
        </Notice>
        <Button variant="secondary" onClick={onRetry}>
          {bg.admin.retry}
        </Button>
      </div>
    );
  }
  if (state.users.length === 0) {
    return <EmptyState text={bg.admin.usersEmpty} />;
  }
  return (
    <ul className="border-t border-line" aria-label={bg.admin.usersTitle}>
      {state.users.map((user) => (
        <UserRow key={user.id} user={user} onPickRole={onPickRole} />
      ))}
    </ul>
  );
}

// One profile: a row between hairlines. On a wide screen the name (with the date under
// it) and the e-mail sit in columns like a table, with the role select on the right;
// on a phone they stack.
function UserRow({
  user,
  onPickRole,
}: {
  user: AdminUserDto;
  onPickRole: (user: AdminUserDto, role: AssignableRole) => void;
}) {
  const selectId = useId();
  const noteId = useId();
  return (
    <li className="grid gap-4 border-b border-line py-5 md:grid-cols-12 md:items-center md:gap-6">
      <div className="min-w-0 md:col-span-4">
        <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold">
          {user.displayName}
          {user.isSelf ? <Badge status="info">{bg.admin.youBadge}</Badge> : null}
        </h3>
        <p className="tabular mt-1 font-mono text-xs text-fg-subtle">
          {fill(bg.admin.createdOn, { date: formatDateTime(user.createdAt) })}
        </p>
      </div>
      <p
        className={cn(
          "min-w-0 break-all md:col-span-5",
          user.email === null ? "text-fg-subtle" : "text-fg-muted",
        )}
      >
        {user.email ?? bg.admin.noEmail}
      </p>
      <div className="flex flex-col gap-1.5 md:col-span-3">
        <label htmlFor={selectId} className="text-sm font-medium text-fg-muted">
          {fill(bg.admin.roleSelectLabel, { name: user.displayName })}
        </label>
        {/* The select always shows the saved role; a choice only opens the confirmation. */}
        <Select
          id={selectId}
          value={user.role}
          disabled={user.isSelf}
          aria-describedby={user.isSelf ? noteId : undefined}
          onChange={(event) => onPickRole(user, event.target.value as AssignableRole)}
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {bg.admin.roleNames[role]}
            </option>
          ))}
        </Select>
        {user.isSelf ? (
          <p id={noteId} className="text-sm text-fg-subtle">
            {bg.admin.selfNote}
          </p>
        ) : null}
      </div>
    </li>
  );
}
