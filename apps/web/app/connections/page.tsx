"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { SaveContactButton } from "../components/SaveContactButton";
import { type Connection, type ConnectionsResponse, connectionsCache } from "../lib/connectionsCache";
import { withCsrfHeaders } from "../lib/csrf";
import { getCachedVenueConfig } from "../lib/offlineQueue";

type SortOption = "recent" | "name";

export default function ConnectionsPage() {
  const [data, setData] = useState<ConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortOption>("recent");
  const [eventName, setEventName] = useState<string | null>(null);

  useEffect(() => {
    getCachedVenueConfig().then((cached) => {
      if (cached?.name) setEventName(cached.name);
    });
    fetch("/api/event")
      .then((res) => (res.ok ? res.json() : null))
      .then((next: { name?: string } | null) => {
        if (next?.name) setEventName(next.name);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const cached = connectionsCache.get();
    if (cached) {
      setData(cached);
      setOffline(!navigator.onLine);
      if (cached.connections.length > 0) setLoading(false);
    }

    fetch("/api/attendees/me/connections", { credentials: "include" })
      .then(async (connectionsResponse) => {
        if (!connectionsResponse.ok) throw new Error("connections unavailable");
        const result = {
          ...(await connectionsResponse.json()),
          bookmarks: cached?.bookmarks ?? [],
        } as ConnectionsResponse;
        connectionsCache.set(result);
        setData(result);
        setOffline(false);
        setError(false);
      })
      .catch(() => {
        if (!cached) setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const connections = useMemo(
    () =>
      [...(data?.connections ?? [])].sort((a, b) =>
        sort === "name" ? a.name.localeCompare(b.name) : Date.parse(b.metAt) - Date.parse(a.metAt),
      ),
    [data, sort],
  );

  function updateConnection(id: string, update: Partial<Connection>) {
    if (!data) return;
    const next = {
      ...data,
      connections: data.connections.map((item) => (item.id === id ? { ...item, ...update } : item)),
    };
    setData(next);
    connectionsCache.set(next);
  }

  return (
    <AttendeePageShell>
      <main className="attendee-page connections-page">
        <div className="page-context-row">
          <div className="connections-metric">
            <span className="connections-metric-label">Number of people Met</span>
          </div>
          {!loading || connections.length > 0 ? (
            <strong className="connections-count">{connections.length}</strong>
          ) : (
            <span className="connections-count skeleton-block" aria-hidden="true" />
          )}
        </div>

        {offline && (
          <div className="banner info">
            <div>
              <b>Showing saved connections</b>
              You're offline. Notes need a connection.
            </div>
          </div>
        )}

        {connections.length > 1 && (
          <label className="connections-sort">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="recent">Most recent</option>
              <option value="name">Name</option>
            </select>
          </label>
        )}

        {loading && connections.length === 0 && <ConnectionsSkeleton />}
        {!loading && error && !data && (
          <ConnectionState title="Can't load connections" body="Check your connection and try again." />
        )}
        {!loading && data && connections.length === 0 && (
          <ConnectionState
            title="You haven't met anyone yet"
            body="Scan someone's QR code to exchange details and they'll appear here."
            action
          />
        )}
        {connections.length > 0 && (
          <div className="connections-list">
            {connections.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                offline={offline}
                eventName={eventName}
                onNote={(note) => updateConnection(connection.id, { note })}
              />
            ))}
          </div>
        )}
      </main>
    </AttendeePageShell>
  );
}

function ConnectionsSkeleton() {
  return (
    <div
      className="connections-list connections-skeleton"
      role="status"
      aria-label="Loading connections"
      aria-busy="true"
    >
      {[0, 1, 2].map((item) => (
        <article className="connection-card" key={item}>
          <div className="connection-person">
            <span className="skeleton-block connection-skeleton-avatar" />
            <div className="connection-skeleton-copy">
              <span className="skeleton-block connection-skeleton-name" />
              <span className="skeleton-block connection-skeleton-line" />
              <span className="skeleton-block connection-skeleton-line short" />
            </div>
          </div>
          <div className="connection-skeleton-actions">
            <span className="skeleton-block" />
            <span className="skeleton-block" />
          </div>
        </article>
      ))}
      <span className="sr-only">Loading connections...</span>
    </div>
  );
}

function ConnectionCard({
  connection,
  offline,
  eventName,
  onNote,
}: {
  connection: Connection;
  offline: boolean;
  eventName: string | null;
  onNote: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(connection.note);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const whatsappNumber = connection.phone.replace(/[^\d]/g, "");
  const whatsappText = encodeURIComponent(
    eventName
      ? `Hi ${connection.name}, we met at the ${eventName}.`
      : `Hi ${connection.name}, we met at the event.`,
  );

  async function saveNote() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/attendees/me/connections/${connection.id}/note`,
        withCsrfHeaders({
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        }),
      );
      if (!response.ok) throw new Error();
      const result = (await response.json()) as { note: string };
      setNote(result.note);
      onNote(result.note);
      setEditing(false);
    } catch {
      setMessage("Couldn't save note. Try again when online.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="connection-card">
      <Link className="connection-person" href={`/attendees/${connection.id}`}>
        <DirectoryAvatar name={connection.name} photoUrl={connection.photoUrl} />
        <div>
          <h2>
            {connection.name}
            <span className="met-badge">Met</span>
          </h2>
          {connection.businessName && <p>{connection.businessName}</p>}
          <div className="connection-meta-line">
            <span>
              Met{" "}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(connection.metAt))}
            </span>
            {connection.tableNumber && (
              <span className="connection-table">
                <TableIcon /> Table {connection.tableNumber}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="connection-details">
        {connection.businessCategory && <span>{connection.businessCategory}</span>}
      </div>
      {connection.note && !editing && (
        <div className="connection-note">
          <div>
            <b>Private note</b>
            <button type="button" disabled={offline} onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
          <p>{connection.note}</p>
        </div>
      )}
      {!connection.note && !editing && (
        <button className="connection-add-note" type="button" disabled={offline} onClick={() => setEditing(true)}>
          + Add private note
        </button>
      )}
      {editing && (
        <div className="note-editor">
          <label htmlFor={`note-${connection.id}`}>Private note</label>
          <textarea
            id={`note-${connection.id}`}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Potential supplier - follow up next week"
            autoFocus
          />
          <div>
            <span>{note.length}/500</span>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setNote(connection.note);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving || offline} onClick={saveNote}>
              {saving ? "Saving..." : "Save note"}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p className="connection-error" role="alert">
          {message}
        </p>
      )}
      <div className="connection-actions">
        <a href={`tel:${connection.phone}`}>
          <CallIcon /> Call
        </a>
        <a href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`} target="_blank" rel="noreferrer">
          <WhatsAppIcon /> WhatsApp
        </a>
        {connection.linkedInUrl && (
          <a href={connection.linkedInUrl} target="_blank" rel="noreferrer">
            <LinkedInIcon /> LinkedIn
          </a>
        )}
      </div>
      <SaveContactButton
        contact={{
          name: connection.name,
          phone: connection.phone,
          email: connection.email,
          company: connection.businessName,
          note: connection.note || "Met at Evento",
        }}
      />
    </article>
  );
}

function ConnectionState({
  title,
  body,
  action = false,
  directoryAction = false,
}: {
  title: string;
  body: string;
  action?: boolean;
  directoryAction?: boolean;
}) {
  return (
    <div className="directory-state">
      <h2>{title}</h2>
      <p>{body}</p>
      {action && (
        <Link className="btn-primary connections-empty-action" href="/scan">
          Scan a code
        </Link>
      )}
      {directoryAction && (
        <Link className="btn-primary connections-empty-action" href="/directory">
          Browse attendees
        </Link>
      )}
    </div>
  );
}

function TableIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M7 9l-2 10M17 9l2 10M4 5h16v4H4z" /></svg>;
}

function CallIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path opacity="0.1" d="M3 6.5C3 14.5081 9.49187 21 17.5 21C18.166 21 18.8216 20.9551 19.4637 20.8682C20.3747 20.7448 21 19.9292 21 19.01V16.4415C21 15.5807 20.4491 14.8164 19.6325 14.5442L16.4841 13.4947C15.6836 13.2279 14.8252 13.699 14.6206 14.5177C14.3475 15.6102 12.987 15.987 12.1907 15.1907L8.80926 11.8093C8.01301 11.013 8.38984 9.65254 9.48229 9.37943C10.301 9.17476 10.7721 8.31644 10.5053 7.51586L9.45585 4.36754C9.18362 3.55086 8.41934 3 7.55848 3H4.99004C4.0708 3 3.25518 3.62533 3.13185 4.53627C3.0449 5.17845 3 5.83398 3 6.5Z" fill="currentColor" /><path d="M3 6.5C3 14.5081 9.49187 21 17.5 21C18.166 21 18.8216 20.9551 19.4637 20.8682C20.3747 20.7448 21 19.9292 21 19.01V16.4415C21 15.5807 20.4491 14.8164 19.6325 14.5442L16.4841 13.4947C15.6836 13.2279 14.8252 13.699 14.6206 14.5177C14.3475 15.6102 12.987 15.987 12.1907 15.1907L8.80926 11.8093C8.01301 11.013 8.38984 9.65254 9.48229 9.37943C10.301 9.17476 10.7721 8.31644 10.5053 7.51586L9.45585 4.36754C9.18362 3.55086 8.41934 3 7.55848 3H4.99004C4.0708 3 3.25518 3.62533 3.13185 4.53627C3.0449 5.17845 3 5.83398 3 6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function WhatsAppIcon() {
  return (
    <svg className="brand-glyph" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M26.576 5.363c-2.69-2.69-6.406-4.354-10.511-4.354-8.209 0-14.865 6.655-14.865 14.865 0 2.732 0.737 5.291 2.022 7.491l-0.038-0.070-2.109 7.702 7.879-2.067c2.051 1.139 4.498 1.809 7.102 1.809h0.006c8.209-0.003 14.862-6.659 14.862-14.868 0-4.103-1.662-7.817-4.349-10.507l0 0zM16.062 28.228h-0.005c-0 0-0.001 0-0.001 0-2.319 0-4.489-0.64-6.342-1.753l0.056 0.031-0.451-0.267-4.675 1.227 1.247-4.559-0.294-0.467c-1.185-1.862-1.889-4.131-1.889-6.565 0-6.822 5.531-12.353 12.353-12.353s12.353 5.531 12.353 12.353c0 6.822-5.53 12.353-12.353 12.353h-0zM22.838 18.977c-0.371-0.186-2.197-1.083-2.537-1.208-0.341-0.124-0.589-0.185-0.837 0.187-0.246 0.371-0.958 1.207-1.175 1.455-0.216 0.249-0.434 0.279-0.805 0.094-1.15-0.466-2.138-1.087-2.997-1.852l0.010 0.009c-0.799-0.74-1.484-1.587-2.037-2.521l-0.028-0.052c-0.216-0.371-0.023-0.572 0.162-0.757 0.167-0.166 0.372-0.434 0.557-0.65 0.146-0.179 0.271-0.384 0.366-0.604l0.006-0.017c0.043-0.087 0.068-0.188 0.068-0.296 0-0.131-0.037-0.253-0.101-0.357l0.002 0.003c-0.094-0.186-0.836-2.014-1.145-2.758-0.302-0.724-0.609-0.625-0.836-0.637-0.216-0.010-0.464-0.012-0.712-0.012-0.395 0.010-0.746 0.188-0.988 0.463l-0.001 0.002c-0.802 0.761-1.3 1.834-1.3 3.023 0 0.026 0 0.053 0.001 0.079l-0-0.004c0.131 1.467 0.681 2.784 1.527 3.857l-0.012-0.015c1.604 2.379 3.742 4.282 6.251 5.564l0.094 0.043c0.548 0.248 1.25 0.513 1.968 0.74l0.149 0.041c0.442 0.14 0.951 0.221 1.479 0.221 0.303 0 0.601-0.027 0.889-0.078l-0.031 0.004c1.069-0.223 1.956-0.868 2.497-1.749l0.009-0.017c0.165-0.366 0.261-0.793 0.261-1.242 0-0.185-0.016-0.366-0.047-0.542l0.003 0.019c-0.092-0.155-0.34-0.247-0.712-0.434z" />
    </svg>
  );
}

function LinkedInIcon() {
  return <svg className="brand-glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.5h4v11H3v-11Zm6 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95C20.3 9.05 21 11 21 14.1v6.4h-4v-5.7c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8H9v-11Z" /></svg>;
}
