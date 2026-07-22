"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PhotoUploadModal } from "../../components/PhotoUploadModal";
import { distanceMeters } from "../../lib/geo";
import { withCsrfHeaders } from "../../lib/csrf";

const RADIUS_OPTIONS = [100, 250, 500, 1000, 5000];

interface AgendaItem {
  startTime: string;
  endTime: string;
  title: string;
  note?: string | null;
}

interface EventSettings {
  id: string;
  name: string;
  startAt: string | null;
  endAt: string | null;
  venueLat: number | null;
  venueLng: number | null;
  venueAddress: string | null;
  checkinRadiusM: number;
  contactName: string | null;
  contactPhone: string | null;
  subtitle: string | null;
  chairName: string | null;
  chairTitle: string | null;
  chairPhotoUrl: string | null;
  registrationUrl: string | null;
  registrationPricing: string | null;
  agenda: AgendaItem[] | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function emptyAgendaItem(): AgendaItem {
  return { startTime: "", endTime: "", title: "", note: "" };
}

export default function AdminEventSettingsPage() {
  const [event, setEvent] = useState<EventSettings | null>(null);
  const [eventName, setEventName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [venueLat, setVenueLat] = useState("");
  const [venueLng, setVenueLng] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [checkinRadiusM, setCheckinRadiusM] = useState(500);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [chairName, setChairName] = useState("");
  const [chairTitle, setChairTitle] = useState("");
  const [chairPhotoUrl, setChairPhotoUrl] = useState("");
  const [chairPhotoModalOpen, setChairPhotoModalOpen] = useState(false);
  const [chairPhotoUploading, setChairPhotoUploading] = useState(false);
  const [registrationUrl, setRegistrationUrl] = useState("");
  const [registrationPricing, setRegistrationPricing] = useState("");
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [testResult, setTestResult] = useState<string | null>(null);

  function hydrate(data: EventSettings) {
    setEvent(data);
    setEventName(data.name);
    setStartAt(toDatetimeLocalValue(data.startAt));
    setEndAt(toDatetimeLocalValue(data.endAt));
    setVenueLat(data.venueLat?.toString() ?? "");
    setVenueLng(data.venueLng?.toString() ?? "");
    setVenueAddress(data.venueAddress ?? "");
    setCheckinRadiusM(data.checkinRadiusM);
    setContactName(data.contactName ?? "");
    setContactPhone(data.contactPhone ?? "");
    setSubtitle(data.subtitle ?? "");
    setChairName(data.chairName ?? "");
    setChairTitle(data.chairTitle ?? "");
    setChairPhotoUrl(data.chairPhotoUrl ?? "");
    setRegistrationUrl(data.registrationUrl ?? "");
    setRegistrationPricing(data.registrationPricing ?? "");
    setAgenda(
      (data.agenda ?? []).map((item) => ({
        startTime: item.startTime ?? "",
        endTime: item.endTime ?? "",
        title: item.title,
        note: item.note ?? "",
      })),
    );
  }

  useEffect(() => {
    fetch("/api/admin/event")
      .then((res) => res.json())
      .then(hydrate);
  }, []);

  const venueConfigured = event?.venueLat != null && event?.venueLng != null;

  async function save(body: Record<string, unknown>) {
    setSaveState("saving");
    setFieldError(null);
    try {
      const res = await fetch("/api/admin/event", withCsrfHeaders({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      const data: EventSettings = await res.json();
      hydrate(data);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }

  async function handleChairPhotoUpload(file: File) {
    setChairPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/admin/event/chair-photo", withCsrfHeaders({
        method: "POST",
        credentials: "include",
        body: formData,
      }));
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? "Upload failed");
      }
      const data = await res.json() as { chairPhotoUrl: string };
      setChairPhotoUrl(data.chairPhotoUrl);
    } finally {
      setChairPhotoUploading(false);
    }
  }

  async function handleChairPhotoRemove() {
    setChairPhotoUploading(true);
    try {
      const res = await fetch("/api/admin/event/chair-photo/remove", withCsrfHeaders({
        method: "PATCH",
        credentials: "include",
      }));
      if (!res.ok) throw new Error("Remove failed");
      setChairPhotoUrl("");
    } finally {
      setChairPhotoUploading(false);
    }
  }

  function addAgendaRow() {
    setAgenda((current) => [...current, emptyAgendaItem()]);
  }

  function removeAgendaRow(index: number) {
    setAgenda((current) => current.filter((_, i) => i !== index));
  }

  function moveAgendaRow(index: number, direction: -1 | 1) {
    setAgenda((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateAgendaRow(index: number, patch: Partial<AgendaItem>) {
    setAgenda((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function handleSave() {
    const trimmedName = eventName.trim();
    if (!trimmedName) {
      setFieldError("Event name is required.");
      return;
    }
    if (startAt && endAt && new Date(startAt).getTime() >= new Date(endAt).getTime()) {
      setFieldError("End time must be after start time.");
      return;
    }
    const lat = Number(venueLat);
    const lng = Number(venueLng);
    if (venueLat.trim() === "" || Number.isNaN(lat) || lat < -90 || lat > 90) {
      setFieldError("Invalid coordinates — latitude must be between -90 and 90.");
      return;
    }
    if (venueLng.trim() === "" || Number.isNaN(lng) || lng < -180 || lng > 180) {
      setFieldError("Invalid coordinates — longitude must be between -180 and 180.");
      return;
    }
    const cleanAgenda = agenda
      .map((item) => ({
        startTime: item.startTime,
        endTime: item.endTime || undefined,
        title: item.title.trim(),
        note: item.note?.trim() || undefined,
      }))
      .filter((item) => item.startTime && item.title);
    if (agenda.some((item) => (item.startTime || item.title.trim()) && (!item.startTime || !item.title.trim()))) {
      setFieldError("Each agenda row needs a start time and a title (or remove the row).");
      return;
    }
    save({
      name: trimmedName,
      startAt: toIsoValue(startAt),
      endAt: toIsoValue(endAt),
      venueLat: lat,
      venueLng: lng,
      venueAddress: venueAddress.trim() || null,
      checkinRadiusM,
      contactName: contactName.trim() || null,
      contactPhone: contactPhone.trim() || null,
      subtitle: subtitle.trim() || null,
      chairName: chairName.trim() || null,
      chairTitle: chairTitle.trim() || null,
      chairPhotoUrl: chairPhotoUrl.trim() || null,
      registrationUrl: registrationUrl.trim() || null,
      registrationPricing: registrationPricing.trim() || null,
      agenda: cleanAgenda,
    });
  }

  function handleTestGeolocation() {
    setTestResult(null);
    if (!navigator.geolocation) {
      setTestResult("This device doesn't support geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(venueLat);
        const lng = Number(venueLng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          setTestResult("Enter venue coordinates above before testing.");
          return;
        }
        const distanceM = distanceMeters(pos.coords.latitude, pos.coords.longitude, lat, lng);
        const inside = distanceM <= checkinRadiusM;
        setTestResult(
          `You're ${Math.round(distanceM)}m from the venue — ${inside ? "inside" : "outside"} the ${checkinRadiusM}m radius.`,
        );
      },
      () => setTestResult("Turn on location to test."),
      { timeout: 5000 },
    );
  }

  return (
    <div className="admin-page" style={{ maxWidth: 560 }}>
      <h1 className="title">Event settings</h1>
      <p className="copy">
        Configure the event details, venue location, and check-in radius. The event timing controls the attendee
        home screen before, during, and after the event.
      </p>
      <Link className="btn-secondary" href="/admin/attendees" style={{ marginBottom: 18 }}>
        Manage attendees
      </Link>

      {!venueConfigured && (
        <div className="banner warn" style={{ marginBottom: 18 }}>
          <div>
            <b>Geolocation check-in is disabled</b>
            No venue configured yet — attendees must use manual check-in until you save coordinates below.
          </div>
        </div>
      )}

      <div className="field">
        <label htmlFor="eventName">Event name</label>
        <input
          id="eventName"
          placeholder="e.g. RMB Business Conclave 2026"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="subtitle">Subtitle</label>
        <input
          id="subtitle"
          placeholder="e.g. Cross Chapter Meeting"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
        />
        <div className="hint">Shown as a badge under the event name.</div>
      </div>

      <div className="field">
        <label htmlFor="startAt">Start at</label>
        <input
          id="startAt"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="endAt">End at</label>
        <input
          id="endAt"
          type="datetime-local"
          value={endAt}
          onChange={(e) => setEndAt(e.target.value)}
        />
        <div className="hint">Leave start or end blank if the schedule is not confirmed yet.</div>
      </div>

      <div className="field">
        <label htmlFor="venueLat">Venue latitude</label>
        <input
          id="venueLat"
          inputMode="decimal"
          placeholder="e.g. 28.6139"
          value={venueLat}
          onChange={(e) => setVenueLat(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="venueLng">Venue longitude</label>
        <input
          id="venueLng"
          inputMode="decimal"
          placeholder="e.g. 77.2090"
          value={venueLng}
          onChange={(e) => setVenueLng(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="venueAddress">Venue address</label>
        <input
          id="venueAddress"
          placeholder="e.g. Taj Palace, 2 Sardar Patel Marg, New Delhi"
          value={venueAddress}
          onChange={(e) => setVenueAddress(e.target.value)}
        />
        <div className="hint">Shown to attendees on the Event Details page.</div>
      </div>

      <div className="field">
        <label htmlFor="contactName">Contact person name</label>
        <input
          id="contactName"
          placeholder="e.g. Priya Sharma"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="contactPhone">Contact person phone</label>
        <input
          id="contactPhone"
          type="tel"
          placeholder="e.g. +91 98765 43210"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
        <div className="hint">Attendees can tap to call this number from the Event Details page.</div>
      </div>

      <h2 className="title" style={{ fontSize: "1.1rem", marginTop: 28 }}>Chair</h2>
      <p className="copy">Featured host shown with the agenda on the Event Details page.</p>

      <div className="field">
        <label htmlFor="chairName">Chair name</label>
        <input
          id="chairName"
          placeholder="e.g. Rtn. Arvind Batra"
          value={chairName}
          onChange={(e) => setChairName(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="chairTitle">Chair title</label>
        <input
          id="chairTitle"
          placeholder="e.g. Chair RMBF"
          value={chairTitle}
          onChange={(e) => setChairTitle(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Chair photo</label>
        <div className="admin-chair-photo-picker">
          <div className="admin-chair-photo-preview" aria-hidden="true">
            {chairPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chairPhotoUrl} alt="" />
            ) : (
              <span>{getInitials(chairName || "Chair")}</span>
            )}
          </div>
          <div className="admin-chair-photo-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setChairPhotoModalOpen(true)}
              disabled={chairPhotoUploading}
            >
              {chairPhotoUrl ? "Change photo" : "Upload photo"}
            </button>
            {chairPhotoUrl ? (
              <button
                type="button"
                className="btn-danger-soft"
                onClick={handleChairPhotoRemove}
                disabled={chairPhotoUploading}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
        <div className="hint">Shown on the attendee Event Details page.</div>
      </div>

      <h2 className="title" style={{ fontSize: "1.1rem", marginTop: 28 }}>Agenda</h2>
      <p className="copy">Shown as a schedule on the Event Details page, in this order.</p>

      <div className="agenda-editor">
        {agenda.length === 0 && (
          <p className="agenda-editor-empty">No agenda items yet. Add the first one below.</p>
        )}
        {agenda.map((item, index) => (
          <div key={index} className="agenda-editor-row">
            <div className="agenda-editor-row-head">
              <span className="agenda-editor-index">Item {index + 1}</span>
              <div className="agenda-editor-actions">
                <button type="button" className="agenda-editor-btn" aria-label="Move up" disabled={index === 0} onClick={() => moveAgendaRow(index, -1)}>↑</button>
                <button type="button" className="agenda-editor-btn" aria-label="Move down" disabled={index === agenda.length - 1} onClick={() => moveAgendaRow(index, 1)}>↓</button>
                <button type="button" className="agenda-editor-btn danger" aria-label="Remove item" onClick={() => removeAgendaRow(index)}>✕</button>
              </div>
            </div>
            <div className="agenda-editor-fields">
              <div className="agenda-editor-time-row">
                <div className="field">
                  <label htmlFor={`agenda-start-${index}`}>Start time</label>
                  <input
                    id={`agenda-start-${index}`}
                    type="time"
                    value={item.startTime}
                    onChange={(e) => updateAgendaRow(index, { startTime: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`agenda-end-${index}`}>End time</label>
                  <input
                    id={`agenda-end-${index}`}
                    type="time"
                    value={item.endTime}
                    onChange={(e) => updateAgendaRow(index, { endTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor={`agenda-title-${index}`}>Title</label>
                <input
                  id={`agenda-title-${index}`}
                  placeholder="e.g. Chapter Leaders Training"
                  value={item.title}
                  onChange={(e) => updateAgendaRow(index, { title: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor={`agenda-note-${index}`}>Note (optional)</label>
                <input
                  id={`agenda-note-${index}`}
                  placeholder="e.g. Mandatory for President, Secretary and Treasurer"
                  value={item.note ?? ""}
                  onChange={(e) => updateAgendaRow(index, { note: e.target.value })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn-secondary agenda-editor-add" onClick={addAgendaRow}>
        + Add agenda item
      </button>

      <h2 className="title" style={{ fontSize: "1.1rem", marginTop: 4 }}>Registration</h2>
      <p className="copy">Attendees see a "Scan to register" QR generated from this link.</p>

      <div className="field">
        <label htmlFor="registrationUrl">Registration link</label>
        <input
          id="registrationUrl"
          placeholder="https://..."
          value={registrationUrl}
          onChange={(e) => setRegistrationUrl(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="registrationPricing">Registration pricing</label>
        <input
          id="registrationPricing"
          placeholder="e.g. Early bird ₹3000/- till 30th Jun 2026"
          value={registrationPricing}
          onChange={(e) => setRegistrationPricing(e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="radius">Check-in radius</label>
        <select id="radius" value={checkinRadiusM} onChange={(e) => setCheckinRadiusM(Number(e.target.value))}>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}m
            </option>
          ))}
        </select>
        <div className="hint">~500m = 5 min walk. Attendees outside this radius must check in manually.</div>
      </div>

      {fieldError && <div className="banner warn" style={{ marginBottom: 16 }}><div>{fieldError}</div></div>}
      {saveState === "error" && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          <div>Can&rsquo;t save settings. Try again.</div>
        </div>
      )}

      <button className="btn-primary" onClick={handleSave} disabled={saveState === "saving"}>
        {saveState === "saving" ? (
          <>
            <span className="spinner" /> Saving&hellip;
          </>
        ) : saveState === "saved" ? (
          "Settings saved ✓"
        ) : (
          "Save"
        )}
      </button>

      <button className="btn-secondary" onClick={handleTestGeolocation} type="button">
        Test geolocation
      </button>

      {testResult && (
        <div className="hint" style={{ marginTop: 10, textAlign: "center" }}>
          {testResult}
        </div>
      )}

      <button
        className="link-muted"
        style={{ display: "block", margin: "20px auto 0" }}
        onClick={() => save({ clearVenue: true })}
      >
        Clear location
      </button>

      <PhotoUploadModal
        isOpen={chairPhotoModalOpen}
        onClose={() => setChairPhotoModalOpen(false)}
        onPhotoUpload={handleChairPhotoUpload}
        hasExistingPhoto={Boolean(chairPhotoUrl)}
        onPhotoRemove={handleChairPhotoRemove}
        isLoading={chairPhotoUploading}
      />
    </div>
  );
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "CH";
}

function toDatetimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoValue(value: string) {
  if (!value) return null;
  return new Date(value).toISOString();
}
