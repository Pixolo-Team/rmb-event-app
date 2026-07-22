"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { PageIntro } from "../components/PageIntro";
import { Connection, ConnectionsResponse, connectionsCache } from "../lib/connectionsCache";
import { SaveContactButton } from "../components/SaveContactButton";
import { withCsrfHeaders } from "../lib/csrf";

type SortOption = "recent" | "name";

export default function ConnectionsPage() {
  const [data, setData] = useState<ConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortOption>("recent");

  useEffect(() => {
    const cached = connectionsCache.get();
    if (cached) {
      setData(cached);
      setOffline(!navigator.onLine);
      // A populated cache is immediately useful. An empty cache is not proof
      // that the attendee still has no connections, so keep the skeleton up
      // until the live response confirms the empty state.
      if (cached.connections.length > 0) setLoading(false);
    }
    fetch("/api/attendees/me/connections", { credentials: "include" })
      .then(async (connectionsResponse) => {
        if (!connectionsResponse.ok) throw new Error("connections unavailable");
        // My Connections only renders confirmed meetings. Preserve any cached
        // bookmark snapshot for the Want to Meet screen instead of delaying
        // this page on a second, unrelated API request.
        const result = { ...(await connectionsResponse.json()), bookmarks: cached?.bookmarks ?? [] } as ConnectionsResponse;
        connectionsCache.set(result);
        setData(result);
        setOffline(false);
        setError(false);
      })
      .catch(() => { if (!cached) setError(true); })
      .finally(() => setLoading(false));
  }, []);

  const connections = useMemo(() => [...(data?.connections ?? [])].sort((a, b) =>
    sort === "name" ? a.name.localeCompare(b.name) : Date.parse(b.metAt) - Date.parse(a.metAt),
  ), [data, sort]);

  function updateConnection(id: string, update: Partial<Connection>) {
    if (!data) return;
    const next = { ...data, connections: data.connections.map((item) => item.id === id ? { ...item, ...update } : item) };
    setData(next);
    connectionsCache.set(next);
  }

  function removeConnection(id: string) {
    if (!data) return;
    const next = { ...data, connections: data.connections.filter((item) => item.id !== id) };
    setData(next);
    connectionsCache.set(next);
  }

  return (
    <AttendeePageShell>
      <main className="attendee-page connections-page">
        <div className="page-context-row">
          <PageIntro>People whose QR code you’ve scanned. Saved attendees live on the Want to Meet tab.</PageIntro>
          {!loading || connections.length > 0 ? <span className="connections-count">{connections.length}</span> : <span className="connections-count skeleton-block" aria-hidden="true" />}
        </div>

        {offline && <div className="banner info"><div><b>Showing saved connections</b>You’re offline. Notes and removals need a connection.</div></div>}

        {connections.length > 1 && <label className="connections-sort"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="recent">Most recent</option><option value="name">Name</option></select></label>}

        {loading && connections.length === 0 && <ConnectionsSkeleton />}
        {!loading && error && !data && <ConnectionState title="Can’t load connections" body="Check your connection and try again." />}
        {!loading && data && connections.length === 0 && <ConnectionState title="You haven’t met anyone yet" body="Scan someone’s QR code to exchange details and they’ll appear here." action />}
        {connections.length > 0 && <div className="connections-list">{connections.map((connection) => <ConnectionCard key={connection.id} connection={connection} offline={offline} onNote={(note) => updateConnection(connection.id, { note })} onRemove={() => removeConnection(connection.id)} />)}</div>}
      </main>
    </AttendeePageShell>
  );
}

function ConnectionsSkeleton() {
  return (
    <div className="connections-list connections-skeleton" role="status" aria-label="Loading connections" aria-busy="true">
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
      <span className="sr-only">Loading connections…</span>
    </div>
  );
}

function ConnectionCard({ connection, offline, onNote, onRemove }: { connection: Connection; offline: boolean; onNote: (note: string) => void; onRemove: () => void }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(connection.note);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const whatsappNumber = connection.phone.replace(/[^\d]/g, "");

  async function saveNote() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/attendees/me/connections/${connection.id}/note`, withCsrfHeaders({ method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) }));
      if (!response.ok) throw new Error();
      const result = await response.json() as { note: string };
      setNote(result.note);
      onNote(result.note);
      setEditing(false);
    } catch { setMessage("Couldn’t save note. Try again when online."); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!window.confirm(`Remove ${connection.name} from My Connections? Your confirmed meeting will remain in event statistics.`)) return;
    setMessage("");
    try {
      const response = await fetch(`/api/attendees/me/connections/${connection.id}`, withCsrfHeaders({ method: "DELETE", credentials: "include" }));
      if (!response.ok) throw new Error();
      onRemove();
    } catch { setMessage("Couldn’t remove this connection. Try again when online."); }
  }

  return <article className="connection-card">
    <button className="connection-remove" type="button" disabled={offline} onClick={remove} aria-label={`Remove ${connection.name}`}>Remove <span aria-hidden="true">×</span></button>
    <Link className="connection-person" href={`/attendees/${connection.id}`}>
      <DirectoryAvatar name={connection.name} photoUrl={connection.photoUrl} />
      <div>
        <h2>{connection.name}<span className="met-badge">Met</span></h2>
        {connection.businessName && <p>{connection.businessName}</p>}
        <div className="connection-meta-line">
          <span>Met {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(connection.metAt))}</span>
          {connection.tableNumber && <span className="connection-table"><TableIcon /> Table {connection.tableNumber}</span>}
        </div>
      </div>
    </Link>
    <div className="connection-details">
      {connection.businessCategory && <span>{connection.businessCategory}</span>}
    </div>
    {connection.note && !editing && <div className="connection-note"><div><b>Private note</b><button type="button" disabled={offline} onClick={() => setEditing(true)}>Edit</button></div><p>{connection.note}</p></div>}
    {!connection.note && !editing && <button className="connection-add-note" type="button" disabled={offline} onClick={() => setEditing(true)}>+ Add private note</button>}
    {editing && <div className="note-editor"><label htmlFor={`note-${connection.id}`}>Private note</label><textarea id={`note-${connection.id}`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Potential supplier — follow up next week" autoFocus /><div><span>{note.length}/500</span><button type="button" className="btn-secondary" onClick={() => { setNote(connection.note); setEditing(false); }}>Cancel</button><button type="button" className="btn-primary" disabled={saving || offline} onClick={saveNote}>{saving ? "Saving…" : "Save note"}</button></div></div>}
    {message && <p className="connection-error" role="alert">{message}</p>}
    <div className="connection-actions">
      <a href={`tel:${connection.phone}`}><CallIcon /> Call</a>
      <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer"><WhatsAppIcon /> WhatsApp</a>
      {connection.linkedInUrl && <a href={connection.linkedInUrl} target="_blank" rel="noreferrer"><LinkedInIcon /> LinkedIn</a>}
    </div>
    <SaveContactButton contact={{ name: connection.name, phone: connection.phone, email: connection.email, company: connection.businessName, note: connection.note || "Met at Evento" }} />
  </article>;
}

function ConnectionState({ title, body, action = false, directoryAction = false }: { title: string; body: string; action?: boolean; directoryAction?: boolean }) {
  return <div className="directory-state"><h2>{title}</h2><p>{body}</p>{action && <Link className="btn-primary connections-empty-action" href="/scan">Scan a code</Link>}{directoryAction && <Link className="btn-primary connections-empty-action" href="/directory">Browse attendees</Link>}</div>;
}

function TableIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h14M7 9l-2 10M17 9l2 10M4 5h16v4H4z" /></svg>;
}

function CallIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 3.5 10 7.8 8.2 10c1.2 2.4 3.3 4.5 5.8 5.7l2.2-1.8 4.3 2.8-.8 3c-.2.7-.9 1.2-1.7 1.2C10 20.4 3.6 14 3.1 6c0-.8.5-1.5 1.2-1.7l2.9-.8Z" /></svg>;
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.3-4.1A8 8 0 1 1 20 11.7Z" /><path d="M8.6 7.8c.5 3.5 3 6 6.5 6.6l1.3-1.5-2.2-1.1-.8.8a6 6 0 0 1-2.2-2.2l.8-.8-1.1-2.2-1.5 1.3" /></svg>;
}
function LinkedInIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v10M5 5.5v.1M10 19v-9M10 13.5c.7-2.2 2-3.5 4-3.5 2.6 0 4 1.7 4 5v4" /></svg>;
}
