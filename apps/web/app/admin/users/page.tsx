"use client";

import { type FormEvent, useEffect, useState } from "react";
import { withCsrfHeaders } from "../../lib/csrf";

type AdminUserRow = {
  id: string;
  name: string;
  username: string;
  role: "SUPERADMIN" | "REGISTRATION_STAFF";
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

type LoadState = "loading" | "ready" | "error";
type Message = { kind: "success" | "error"; text: string };

// Standard rule: lowercase letters and digits only, no spaces or symbols —
// matches the backend's validation in CreateAdminUserDto.
function slugifyUsername(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<Message | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AdminUserRow["role"]>("REGISTRATION_STAFF");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!message || message.kind === "error") return;
    const timeout = window.setTimeout(() => setMessage((current) => (current === message ? null : current)), 8000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function loadUsers() {
    setState("loading");
    try {
      const response = await fetch("/api/admin/users", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load admin users");
      setUsers((await response.json()) as AdminUserRow[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    const username = newUsername.trim();
    const password = newPassword.trim();
    if (!name || !username || password.length < 8) {
      setMessage({ kind: "error", text: "Name, username, and an 8+ character password are required." });
      return;
    }

    setCreating(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", withCsrfHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, username, password, role: newRole }),
      }));
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
        const detail = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new Error(detail || "Could not create user");
      }
      setNewName("");
      setNewUsername("");
      setUsernameTouched(false);
      setNewPassword("");
      setNewRole("REGISTRATION_STAFF");
      await loadUsers();
      setMessage({ kind: "success", text: `${name} was created.` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not create user. Try again." });
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user: AdminUserRow) {
    setBusyId(user.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, withCsrfHeaders({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active: !user.active }),
      }));
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
        const detail = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new Error(detail || "Failed to update user");
      }
      await loadUsers();
      setMessage({ kind: "success", text: `${user.username} was ${user.active ? "deactivated" : "reactivated"}.` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not update user. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  async function submitPasswordReset(user: AdminUserRow) {
    const password = resetPassword.trim();
    if (password.length < 8) {
      setMessage({ kind: "error", text: "New password must be at least 8 characters." });
      return;
    }
    setBusyId(user.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, withCsrfHeaders({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      }));
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
        const detail = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new Error(detail || "Failed to reset password");
      }
      setResettingId(null);
      setResetPassword("");
      setMessage({ kind: "success", text: `Password reset for ${user.username}.` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not reset password. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="admin-page admin-overview">
      <div className="admin-hub-head">
        <div>
          <p className="eyebrow">Access control</p>
          <h1>Admin users</h1>
          <p className="admin-overview-copy">
            Create logins for registration staff (search, add, and check attendees in/out) or additional
            superadmins. Your own env-based login is unaffected and always has full access.
          </p>
        </div>
        <div className="admin-overview-actions">
          <button className="btn-secondary" type="button" onClick={loadUsers} disabled={state === "loading"}>
            {state === "loading" ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`banner ${message.kind === "error" ? "error" : "ok"}`}>
          <div>{message.text}</div>
        </div>
      )}

      {state === "error" && (
        <div className="banner warn">
          <div>
            <b>Can&rsquo;t load admin users</b>
            Refresh the page to try again.
          </div>
        </div>
      )}

      <section className="admin-overview-panel admin-add-attendee-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">New login</p>
            <h2>Create admin user</h2>
          </div>
        </div>
        <form className="admin-add-attendee-form" onSubmit={createUser}>
          <div className="field">
            <label htmlFor="new-user-name">Name</label>
            <input
              id="new-user-name"
              value={newName}
              onChange={(event) => {
                const name = event.target.value;
                setNewName(name);
                if (!usernameTouched) setNewUsername(slugifyUsername(name));
              }}
              placeholder="e.g. Jyoti Pandey"
              disabled={creating}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-user-username">Username</label>
            <input
              id="new-user-username"
              value={newUsername}
              onChange={(event) => {
                setUsernameTouched(true);
                setNewUsername(slugifyUsername(event.target.value));
              }}
              placeholder="e.g. jyotipandey"
              disabled={creating}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-user-password">Password</label>
            <input
              id="new-user-password"
              type="text"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="8+ characters"
              disabled={creating}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-user-role">Role</label>
            <select
              id="new-user-role"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as AdminUserRow["role"])}
              disabled={creating}
            >
              <option value="REGISTRATION_STAFF">Registration staff</option>
              <option value="SUPERADMIN">Superadmin</option>
            </select>
          </div>
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create user"}
          </button>
        </form>
      </section>

      <section className="admin-attendee-list" style={{ marginTop: 18 }}>
        {state === "loading" && users.length === 0 ? (
          <div className="directory-state">
            <h2>Loading admin users</h2>
          </div>
        ) : users.length ? (
          users.map((user) => (
            <article key={user.id} className="admin-attendee-row">
              <div>
                <div className="admin-attendee-title">
                  <b>{user.name}</b>
                  <span className={`badge ${user.active ? "badge-success" : "badge-neutral"}`}>
                    {user.active ? "Active" : "Deactivated"}
                  </span>
                  <span className="badge badge-neutral">
                    {user.role === "SUPERADMIN" ? "Superadmin" : "Registration staff"}
                  </span>
                </div>
                <span>@{user.username}</span>
                <small>
                  Created {formatDate(user.createdAt)}
                  {user.lastLoginAt ? ` · Last login ${formatDate(user.lastLoginAt)}` : " · Never logged in"}
                </small>
              </div>
              <div className="admin-attendee-actions">
                {resettingId === user.id ? (
                  <div className="admin-attendee-confirm" role="group" aria-label={`Reset password for ${user.username}`}>
                    <input
                      type="text"
                      value={resetPassword}
                      onChange={(event) => setResetPassword(event.target.value)}
                      placeholder="New password (8+ chars)"
                      autoFocus
                    />
                    <div>
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => {
                          setResettingId(null);
                          setResetPassword("");
                        }}
                        disabled={busyId === user.id}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        type="button"
                        onClick={() => submitPasswordReset(user)}
                        disabled={busyId === user.id}
                      >
                        {busyId === user.id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => setResettingId(user.id)}
                      disabled={busyId === user.id}
                    >
                      Reset password
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      onClick={() => toggleActive(user)}
                      disabled={busyId === user.id}
                    >
                      {busyId === user.id ? "Saving..." : user.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="directory-state">
            <h2>No admin users yet</h2>
            <p>Create one above to get started.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
