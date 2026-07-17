"use client";

import { useEffect, useState } from "react";
import { distanceMeters } from "../../lib/geo";

const RADIUS_OPTIONS = [100, 250, 500, 1000, 5000];

interface EventSettings {
  id: string;
  name: string;
  venueLat: number | null;
  venueLng: number | null;
  checkinRadiusM: number;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AdminEventSettingsPage() {
  const [event, setEvent] = useState<EventSettings | null>(null);
  const [venueLat, setVenueLat] = useState("");
  const [venueLng, setVenueLng] = useState("");
  const [checkinRadiusM, setCheckinRadiusM] = useState(500);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/event")
      .then((res) => res.json())
      .then((data: EventSettings) => {
        setEvent(data);
        setVenueLat(data.venueLat?.toString() ?? "");
        setVenueLng(data.venueLng?.toString() ?? "");
        setCheckinRadiusM(data.checkinRadiusM);
      });
  }, []);

  const venueConfigured = event?.venueLat != null && event?.venueLng != null;

  async function save(body: Record<string, unknown>) {
    setSaveState("saving");
    setFieldError(null);
    try {
      const res = await fetch("/api/admin/event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      const data: EventSettings = await res.json();
      setEvent(data);
      setVenueLat(data.venueLat?.toString() ?? "");
      setVenueLng(data.venueLng?.toString() ?? "");
      setCheckinRadiusM(data.checkinRadiusM);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }

  function handleSave() {
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
    save({ venueLat: lat, venueLng: lng, checkinRadiusM });
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
      <div className="wordmark">
        <span className="dot" />
        Evento Admin
      </div>
      <h1 className="title">Event settings</h1>
      <p className="copy">
        Configure the venue location and check-in radius. Attendees within this radius auto check in on app open;
        everyone else falls back to manual check-in.
      </p>

      {!venueConfigured && (
        <div className="banner warn" style={{ marginBottom: 18 }}>
          <div>
            <b>Geolocation check-in is disabled</b>
            No venue configured yet — attendees must use manual check-in until you save coordinates below.
          </div>
        </div>
      )}

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
