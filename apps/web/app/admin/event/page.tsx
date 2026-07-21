"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { distanceMeters } from "../../lib/geo";
import { withCsrfHeaders } from "../../lib/csrf";

const RADIUS_OPTIONS = [100, 250, 500, 1000, 5000];

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
}

type SaveState = "idle" | "saving" | "saved" | "error";

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
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/event")
      .then((res) => res.json())
      .then((data: EventSettings) => {
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
      });
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
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
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
    </div>
  );
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
