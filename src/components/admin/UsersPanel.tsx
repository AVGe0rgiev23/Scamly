// „Потребители“ in the admin panel (W3-06): search by name or e-mail, filter by role,
// and change a role after a confirmation window. Phones of protected persons are not
// in the list (the API leaves them out). The admin's own row has no role select: the
// API refuses a change of one's own role anyway (409), the page only says so earlier.
// A Client Component: every request goes to /api/admin/users, which checks the role.
"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { callApi } from "@/components/family/api";
import { fill, formatDateTime } from "@/components/family/format";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
    <div className="admin-section">
      <h2>{bg.admin.usersTitle}</h2>
      <p className="muted">{bg.admin.usersIntro}</p>

      <form className="admin-filter" role="search" onSubmit={onSearch}>
        <div className="form-field admin-filter-q">
          <label htmlFor={ids.search}>{bg.admin.searchLabel}</label>
          <input
            id={ids.search}
            type="search"
            value={typed.q}
            maxLength={100}
            aria-describedby={ids.searchHint}
            onChange={(event) => setTyped({ ...typed, q: event.target.value })}
          />
          <p id={ids.searchHint} className="muted">
            {bg.admin.searchHint}
          </p>
        </div>
        <div className="form-field">
          <label htmlFor={ids.role}>{bg.admin.roleFilterLabel}</label>
          <select
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
          </select>
        </div>
        <Button type="submit" className="admin-filter-submit">
          {bg.admin.search}
        </Button>
      </form>

      <p role="status" className={notice === "" ? "sr-only" : "form-message form-message-success"}>
        {notice}
      </p>

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
        <div className="admin-more">
          {moreError ? (
            <p role="alert" className="form-message form-message-error">
              {moreError}
            </p>
          ) : null}
          <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>
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
      <p role="status" className="muted">
        {bg.admin.loading}
      </p>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="family-error">
        <p role="alert" className="form-message form-message-error">
          {state.message}
        </p>
        <Button variant="secondary" onClick={onRetry}>
          {bg.admin.retry}
        </Button>
      </div>
    );
  }
  if (state.users.length === 0) {
    return <p className="card">{bg.admin.usersEmpty}</p>;
  }
  return (
    <ul className="person-list admin-users" aria-label={bg.admin.usersTitle}>
      {state.users.map((user) => (
        <UserRow key={user.id} user={user} onPickRole={onPickRole} />
      ))}
    </ul>
  );
}

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
    <li className="card admin-user">
      <div className="admin-user-who">
        <h3>
          {user.displayName}
          {user.isSelf ? <span className="mod-badge admin-you">{bg.admin.youBadge}</span> : null}
        </h3>
        <p className="admin-user-email">{user.email ?? bg.admin.noEmail}</p>
        <p className="muted">
          {fill(bg.admin.createdOn, { date: formatDateTime(user.createdAt) })}
        </p>
      </div>
      <div className="form-field admin-user-role">
        <label htmlFor={selectId}>
          {fill(bg.admin.roleSelectLabel, { name: user.displayName })}
        </label>
        {/* The select always shows the saved role; a choice only opens the confirmation. */}
        <select
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
        </select>
        {user.isSelf ? (
          <p id={noteId} className="muted">
            {bg.admin.selfNote}
          </p>
        ) : null}
      </div>
    </li>
  );
}
