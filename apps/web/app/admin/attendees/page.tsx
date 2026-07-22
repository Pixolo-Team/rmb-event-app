"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { withCsrfHeaders } from "../../lib/csrf";

type AdminAttendee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string | null;
  businessCategory: string | null;
  city: string | null;
  tableNumber: string | null;
  chapterName: string | null;
  profileCompletedAt: string | null;
  deletedAt: string | null;
  checkedInAt: string | null;
  checkInMethod: "GEOLOCATION" | "MANUAL" | "STAFF_QR" | "VENUE_QR" | null;
};

type LoadState = "loading" | "ready" | "error";

export default function AdminAttendeesPage() {
  const [attendees, setAttendees] = useState<AdminAttendee[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<LoadState>("loading");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAttendees();
  }, []);

  useEffect(() => {
    if (!message || message.startsWith("Could")) return;
    const timeout = window.setTimeout(() => {
      setMessage((current) => current === message ? null : current);
    }, 10000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function loadAttendees() {
    setState("loading");
    try {
      const response = await fetch("/api/admin/attendees/manage", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load attendees");
      setAttendees((await response.json()) as AdminAttendee[]);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  async function deleteAttendee(attendee: AdminAttendee) {
    setDeletingId(attendee.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/attendees/${attendee.id}`, withCsrfHeaders({
        method: "DELETE",
        credentials: "include",
      }));
      if (!response.ok) throw new Error("Failed to delete attendee");
      await loadAttendees();
      setMessage(`${attendee.name} was soft deleted.`);
      setConfirmingId(null);
      setActionMenuId(null);
    } catch {
      setMessage("Could not delete attendee. Try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function markAsPresent(attendee: AdminAttendee) {
    setCheckingInId(attendee.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/checkin/manual/${attendee.id}`, withCsrfHeaders({
        method: "POST",
        credentials: "include",
      }));
      if (!response.ok) throw new Error("Failed to check in attendee");

      const outcome = await response.json() as { status?: string; checkedInAt?: string; method?: AdminAttendee["checkInMethod"] };
      setAttendees((current) =>
        current.map((item) =>
          item.id === attendee.id
            ? {
                ...item,
                checkedInAt: outcome.checkedInAt ?? item.checkedInAt ?? new Date().toISOString(),
                checkInMethod: outcome.method ?? item.checkInMethod ?? "MANUAL",
              }
            : item,
        ),
      );
      setMessage(
        outcome.status === "already_checked_in"
          ? `${attendee.name} was already marked present.`
          : `${attendee.name} marked as present.`,
      );
    } catch {
      setMessage("Could not mark attendee as present. Try again.");
    } finally {
      setCheckingInId(null);
    }
  }

  async function addAttendee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    const email = newEmail.trim();
    const phone = newPhone.trim();
    if (!name || !email || !phone) {
      setMessage("Name, email and phone are required.");
      return;
    }

    setAdding(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/attendees/manage", withCsrfHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, phone }),
      }));
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
        const detail = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
        throw new Error(detail || "Could not add attendee");
      }
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      await loadAttendees();
      setMessage(`${name} was added.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add attendee. Try again.");
    } finally {
      setAdding(false);
    }
  }

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return attendees;
    return attendees.filter((attendee) =>
      [
        attendee.name,
        attendee.email,
        attendee.phone,
        attendee.businessName,
        attendee.chapterName,
        attendee.businessCategory,
        attendee.city,
        attendee.tableNumber,
      ].some((value) => value?.toLowerCase().includes(term)),
    );
  }, [attendees, query]);

  const activeCount = attendees.filter((attendee) => !attendee.deletedAt).length;
  const deletedCount = attendees.length - activeCount;

  return (
    <main className="admin-page admin-overview">
      <div className="admin-hub-head">
        <div>
          <p className="eyebrow">Roster</p>
          <h1>Manage attendees</h1>
          <p className="admin-overview-copy">
            View imported attendees and soft delete records without removing their database history.
          </p>
        </div>
        <div className="admin-overview-actions">
          <span className="admin-updated-at">{activeCount} active</span>
          <span className="admin-updated-at">{deletedCount} deleted</span>
          <button className="btn-secondary" type="button" onClick={loadAttendees} disabled={state === "loading"}>
            {state === "loading" ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`banner ${message.startsWith("Could") ? "warn" : "ok"}`}>
          <div>{message}</div>
        </div>
      )}

      {state === "error" && (
        <div className="banner warn">
          <div>
            <b>Can&rsquo;t load attendees</b>
            Refresh the page to try again.
          </div>
        </div>
      )}

      <section className="admin-overview-panel admin-add-attendee-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">Single attendee</p>
            <h2>Add attendee</h2>
          </div>
          <span>ID and QR token are generated automatically</span>
        </div>
        <form className="admin-add-attendee-form" onSubmit={addAttendee}>
          <div className="field">
            <label htmlFor="new-attendee-name">Name</label>
            <input
              id="new-attendee-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Jyoti Pandey"
              disabled={adding}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-attendee-email">Email</label>
            <input
              id="new-attendee-email"
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="name@example.com"
              disabled={adding}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-attendee-phone">Phone number</label>
            <input
              id="new-attendee-phone"
              value={newPhone}
              onChange={(event) => setNewPhone(event.target.value)}
              placeholder="+91..."
              disabled={adding}
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={adding}>
            {adding ? "Adding..." : "Add attendee"}
          </button>
        </form>
      </section>

      <div className="feedback-admin-toolbar" style={{ marginTop: 18 }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, company, table"
          aria-label="Search attendees"
        />
      </div>

      <section className="admin-attendee-list">
        {state === "loading" && attendees.length === 0 ? (
          <div className="directory-state">
            <h2>Loading attendees</h2>
            <p>The roster will appear here in a moment.</p>
          </div>
        ) : filtered.length ? (
          filtered.map((attendee) => (
            <article key={attendee.id} className={`admin-attendee-row${attendee.deletedAt ? " is-deleted" : ""}`}>
              <div>
                <div className="admin-attendee-title">
                  <b>{attendee.name}</b>
                  <span className={attendee.deletedAt ? "badge-warning" : "badge-success"}>
                    {attendee.deletedAt ? "Deleted" : "Active"}
                  </span>
                </div>
                <span>{attendee.businessName ?? "No company"} · {attendee.email}</span>
                <small>
                  {[attendee.chapterName, attendee.businessCategory, attendee.city, attendee.tableNumber ? `Table ${attendee.tableNumber}` : null]
                    .filter(Boolean)
                    .join(" · ") || "No extra details"}
                </small>
              </div>
              <div className="admin-attendee-meta">
                <span>{attendee.profileCompletedAt ? "Profile complete" : "Profile pending"}</span>
                <span>{attendee.checkedInAt ? `Checked in ${formatDate(attendee.checkedInAt)}` : "Not checked in"}</span>
              </div>
              <div className="admin-attendee-actions">
                <button
                  className="btn-secondary admin-present-button"
                  type="button"
                  onClick={() => markAsPresent(attendee)}
                  disabled={Boolean(attendee.deletedAt) || Boolean(attendee.checkedInAt) || checkingInId === attendee.id}
                >
                  {checkingInId === attendee.id ? "Marking..." : attendee.checkedInAt ? "Present" : "Mark as present"}
                </button>
                {confirmingId === attendee.id ? (
                  <div className="admin-attendee-confirm" role="group" aria-label={`Confirm delete ${attendee.name}`}>
                    <span>Soft delete this attendee?</span>
                    <div>
                      <button className="btn-secondary" type="button" onClick={() => setConfirmingId(null)} disabled={deletingId === attendee.id}>
                        Cancel
                      </button>
                      <button className="btn-danger-soft" type="button" onClick={() => deleteAttendee(attendee)} disabled={deletingId === attendee.id}>
                        {deletingId === attendee.id ? "Deleting..." : "Confirm delete"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-attendee-menu">
                    <button
                      className="admin-attendee-menu-button"
                      type="button"
                      aria-label={`More actions for ${attendee.name}`}
                      aria-expanded={actionMenuId === attendee.id}
                      onClick={() => setActionMenuId((current) => current === attendee.id ? null : attendee.id)}
                      disabled={Boolean(attendee.deletedAt) || deletingId === attendee.id}
                    >
                      <span aria-hidden="true">⋮</span>
                    </button>
                    {actionMenuId === attendee.id && (
                      <div className="admin-attendee-menu-dropdown">
                        <button
                          className="admin-delete-button"
                          type="button"
                          onClick={() => {
                            setConfirmingId(attendee.id);
                            setActionMenuId(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="directory-state">
            <h2>No attendees found</h2>
            <p>Try a different search.</p>
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
