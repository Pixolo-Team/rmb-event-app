"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { DirectoryAvatar } from "../components/DirectoryAvatar";
import { BookmarkConnection, Connection, ConnectionsResponse, connectionsCache } from "../lib/connectionsCache";
import { SaveContactButton } from "../components/SaveContactButton";
import { BookmarkButton } from "../components/BookmarkButton";

type SortOption = "recent" | "name";

const PREVIEW_DATA: ConnectionsResponse = { connections: [
  { id: "preview-1", name: "Aarav Mehta", phone: "+919810012345", email: "aarav@example.com", businessName: "Mehta Packaging Solutions", businessCategory: "Manufacturing", bio: "Helping growing brands switch to sustainable packaging without increasing production costs.", tableNumber: "12", photoUrl: null, linkedInUrl: "https://www.linkedin.com/in/aarav-mehta", met: true, metAt: "2026-07-16T09:42:00.000Z", note: "Interested in eco-friendly packaging. Follow up next week." },
  { id: "preview-2", name: "Neha Kapoor", phone: "+919820067890", email: "neha@example.com", businessName: "Kapoor Digital", businessCategory: "Marketing & Advertising", bio: "Performance marketing and brand strategy for founder-led businesses.", tableNumber: "7", photoUrl: null, linkedInUrl: null, met: true, metAt: "2026-07-16T08:25:00.000Z", note: "" },
  { id: "preview-3", name: "Vikram Shah", phone: "+919930054321", email: "vikram@example.com", businessName: "Shah Industrial Systems", businessCategory: "Engineering", bio: null, tableNumber: "18", photoUrl: null, linkedInUrl: null, met: true, metAt: "2026-07-16T07:50:00.000Z", note: "Met near registration desk." },
], bookmarks: [{ id: "preview-4", name: "Priya Nair", phone: "+919840011223", email: "priya@example.com", businessName: "Nair Advisory", businessCategory: "Consulting", bio: "Growth and operations advisor for family businesses.", tableNumber: "5", photoUrl: null, linkedInUrl: "https://www.linkedin.com/in/priya-nair", met: false, bookmarkedAt: "2026-07-16T09:55:00.000Z", bookmarked: true, chapterName: "Mumbai Central", city: "Mumbai" }] };

export default function ConnectionsPage() {
  const [data, setData] = useState<ConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortOption>("recent");
  const [tab, setTab] = useState<"met" | "want">("met");

  useEffect(() => {
    const preview = process.env.NODE_ENV !== "production" && new URLSearchParams(window.location.search).get("preview") === "1";
    if (preview) {
      setData(PREVIEW_DATA);
      setLoading(false);
      return;
    }
    const cached = connectionsCache.get();
    if (cached) {
      setData(cached);
      setOffline(!navigator.onLine);
      setLoading(false);
    }
    Promise.all([fetch("/api/attendees/me/connections", { credentials: "include" }), fetch("/api/bookmarks", { credentials: "include" })])
      .then(async ([connectionsResponse, bookmarksResponse]) => {
        if (!connectionsResponse.ok || !bookmarksResponse.ok) throw new Error("connections unavailable");
        const result = { ...(await connectionsResponse.json()), bookmarks: await bookmarksResponse.json() } as ConnectionsResponse;
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
  const bookmarks = useMemo(() => [...(data?.bookmarks ?? [])].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : Date.parse(b.bookmarkedAt) - Date.parse(a.bookmarkedAt)), [data, sort]);

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
        <div className="page-heading-row">
          <div><p className="eyebrow">Networking</p><h1>My Connections</h1><p>People whose QR code you’ve scanned.</p></div>
          <span className="connections-count">{tab === "met" ? connections.length : bookmarks.length}</span>
        </div>

        {offline && <div className="banner info"><div><b>Showing saved connections</b>You’re offline. Notes and removals need a connection.</div></div>}

        <div className="connections-tabs" role="tablist" aria-label="Connection type">
          <button type="button" role="tab" aria-selected={tab === "met"} onClick={() => setTab("met")}>Already met <span>{connections.length}</span></button>
          <button type="button" role="tab" aria-selected={tab === "want"} onClick={() => setTab("want")}>Want to meet <span>{bookmarks.length}</span></button>
        </div>

        {(tab === "met" ? connections.length : bookmarks.length) > 1 && <label className="connections-sort"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}><option value="recent">Most recent</option><option value="name">Name</option></select></label>}

        {loading && <div className="directory-loading" role="status">Loading connections…</div>}
        {!loading && error && !data && <ConnectionState title="Can’t load connections" body="Check your connection and try again." />}
        {!loading && data && tab === "met" && connections.length === 0 && <ConnectionState title="You haven’t met anyone yet" body="Scan someone’s QR code to exchange details and they’ll appear here." action />}
        {!loading && data && tab === "want" && bookmarks.length === 0 && <ConnectionState title="Your Want to Meet list is empty" body="Save attendees from the directory and they’ll appear here." directoryAction />}
        {tab === "met" && connections.length > 0 && <div className="connections-list">{connections.map((connection) => <ConnectionCard key={connection.id} connection={connection} offline={offline} onNote={(note) => updateConnection(connection.id, { note })} onRemove={() => removeConnection(connection.id)} />)}</div>}
        {tab === "want" && bookmarks.length > 0 && <div className="connections-list">{bookmarks.map((person) => <BookmarkCard key={person.id} person={person} onRemove={() => { if (!data) return; const next = { ...data, bookmarks: data.bookmarks.filter((item) => item.id !== person.id) }; setData(next); connectionsCache.set(next); }} />)}</div>}
      </main>
    </AttendeePageShell>
  );
}

function BookmarkCard({ person, onRemove }: { person: BookmarkConnection; onRemove: () => void }) {
  function sharePerson() {
    const url = `${window.location.origin}/p/${person.id}`;
    if (navigator.share) {
      navigator.share({ title: person.name, url }).catch(() => undefined);
      return;
    }
    navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  return <article className="connection-card bookmark-card">
    <Link className="connection-person" href={`/attendees/${person.id}`}><DirectoryAvatar name={person.name} photoUrl={person.photoUrl} /><div><h2>{person.name}{person.met && <span className="met-badge">Met</span>}</h2>{person.businessName && <p>{person.businessName}</p>}<div className="connection-meta-line"><span>Saved {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(person.bookmarkedAt))}</span>{person.tableNumber && <span className="connection-table"><TableIcon /> Table {person.tableNumber}</span>}</div></div></Link>
    <div className="connection-details">{person.businessCategory && <span>{person.businessCategory}</span>}{person.bio && <p>{person.bio}</p>}</div>
    <div className="card-icon-actions" aria-label={`Actions for ${person.name}`}>
      <BookmarkButton attendeeId={person.id} initialBookmarked onChange={(value) => { if (!value) onRemove(); }} compact />
      <a className="icon-btn" href={`tel:${person.phone}`} aria-label={`Call ${person.name}`} title="Call"><CallIcon /></a>
      {person.linkedInUrl && <a className="icon-btn" href={person.linkedInUrl} target="_blank" rel="noreferrer" aria-label={`${person.name} on LinkedIn`} title="LinkedIn"><LinkedInIcon /></a>}
      <button className="icon-btn" type="button" onClick={sharePerson} aria-label={`Share ${person.name}`} title="Share"><ShareIcon /></button>
    </div>
  </article>;
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
      const response = await fetch(`/api/attendees/me/connections/${connection.id}/note`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
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
      const response = await fetch(`/api/attendees/me/connections/${connection.id}`, { method: "DELETE", credentials: "include" });
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
      {connection.bio && <p>{connection.bio}</p>}
    </div>
    {connection.note && !editing && <div className="connection-note"><div><b>Private note</b><button type="button" disabled={offline} onClick={() => setEditing(true)}>Edit</button></div><p>{connection.note}</p></div>}
    {!connection.note && !editing && <button className="connection-add-note" type="button" disabled={offline} onClick={() => setEditing(true)}>+ Add private note</button>}
    {editing && <div className="note-editor"><label htmlFor={`note-${connection.id}`}>Private note</label><textarea id={`note-${connection.id}`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Potential supplier — follow up next week" autoFocus /><div><span>{note.length}/500</span><button type="button" className="btn-secondary" onClick={() => { setNote(connection.note); setEditing(false); }}>Cancel</button><button type="button" className="btn-primary" disabled={saving || offline} onClick={saveNote}>{saving ? "Saving…" : "Save note"}</button></div></div>}
    {message && <p className="connection-error" role="alert">{message}</p>}
    <div className="connection-actions">
      <a href={`tel:${connection.phone}`}><CallIcon /> Call</a>
      <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer"><WhatsAppIcon /> WhatsApp</a>
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
function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="M8 11l7-4M8 13l7 4" /></svg>;
}
