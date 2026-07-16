"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { distanceMeters } from "../lib/geo";
import {
  cacheVenueConfig,
  enqueueWrite,
  getCachedVenueConfig,
  useOfflineSync,
  type QueueKind,
} from "../lib/offlineQueue";

// Full-page flow (no floating card — see globals.css .full-page*): detect
// proximity to the venue, then the attendee taps to confirm rather than
// checking in silently. That tap-then-show moment matters because the
// resulting "checked in" screen is what they hand to the registration desk.
type Step =
  | "loading"
  | "locating"
  | "arrived"
  | "confirming_arrival"
  | "need_manual"
  | "confirming_manual"
  | "checked_in";

type CheckinMethod = "GEOLOCATION" | "MANUAL" | "STAFF_QR";

interface Attendee {
  name: string;
  businessName: string | null;
}

interface CheckinStatus {
  checkedIn: boolean;
  checkedInAt: string | null;
  method: CheckinMethod | null;
}

interface VenueConfig {
  venueLat: number | null;
  venueLng: number | null;
  checkinRadiusM: number;
}

const METHOD_LABEL: Record<CheckinMethod, string> = {
  GEOLOCATION: "via location",
  MANUAL: "manual",
  STAFF_QR: "staff scan",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [checkin, setCheckin] = useState<CheckinStatus | null>(null);
  const [pendingSync, setPendingSync] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOffline, setConfirmOffline] = useState(false);
  const coords = useRef<{ lat: number; lng: number } | null>(null);
  const venueConfig = useRef<VenueConfig | null>(null);

  const { online } = useOfflineSync((kind: QueueKind, response) => {
    if (kind === "checkin-geolocation" || kind === "checkin-manual") {
      const outcome = response as { checkedInAt?: string; method?: CheckinMethod } | null;
      if (outcome?.checkedInAt && outcome.method) {
        setCheckin({ checkedIn: true, checkedInAt: outcome.checkedInAt, method: outcome.method });
      }
      setPendingSync(false);
    }
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/attendees/me", { credentials: "include" }),
      fetch("/api/checkin/me", { credentials: "include" }),
      fetch("/api/event")
        .then((res) => res.json())
        .catch(() => null),
    ])
      .then(async ([meRes, checkinRes, eventConfig]) => {
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }
        const me = await meRes.json();
        if (!me.profileCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        setAttendee({ name: me.name, businessName: me.businessName });

        if (eventConfig) {
          venueConfig.current = eventConfig;
          cacheVenueConfig(eventConfig);
        } else {
          venueConfig.current = await getCachedVenueConfig();
        }

        const status: CheckinStatus = await checkinRes.json();
        setCheckin(status);
        setStep(status.checkedIn ? "checked_in" : "locating");
      })
      .catch(() => router.replace("/login"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "locating") return;

    if (!navigator.geolocation) {
      setReason("Location services off");
      setStep("need_manual");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        coords.current = { lat, lng };

        const config = venueConfig.current;
        if (!config || config.venueLat == null || config.venueLng == null) {
          setReason("Venue location isn't set up yet");
          setStep("need_manual");
          return;
        }

        const distanceM = distanceMeters(lat, lng, config.venueLat, config.venueLng);
        if (distanceM > config.checkinRadiusM) {
          setReason("Outside venue area");
          setStep("need_manual");
          return;
        }

        setStep("arrived");
      },
      () => {
        setReason("Geolocation failed");
        setStep("need_manual");
      },
      { timeout: 5000 },
    );
  }, [step]);

  async function confirmCheckIn(kind: "geolocation" | "manual") {
    setStep(kind === "geolocation" ? "confirming_arrival" : "confirming_manual");
    setSubmitError(null);
    setConfirmOffline(false);

    const queueKind: QueueKind = kind === "geolocation" ? "checkin-geolocation" : "checkin-manual";
    const url = kind === "geolocation" ? "/api/checkin/geolocation" : "/api/checkin/manual";
    const body = kind === "geolocation" && coords.current ? coords.current : {};

    if (!navigator.onLine) {
      await enqueueWrite(queueKind, url, body);
      setCheckin({ checkedIn: true, checkedInAt: new Date().toISOString(), method: kind === "geolocation" ? "GEOLOCATION" : "MANUAL" });
      setPendingSync(true);
      setConfirmOffline(true);
      setStep("checked_in");
      return;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const outcome = await res.json();
      if (outcome.status === "checked_in" || outcome.status === "already_checked_in") {
        setCheckin({ checkedIn: true, checkedInAt: outcome.checkedInAt, method: outcome.method });
        setStep("checked_in");
      } else {
        setSubmitError("Can't check in. Try again or ask staff to scan your QR.");
        setStep(kind === "geolocation" ? "arrived" : "confirming_manual");
      }
    } catch {
      // Network dropped mid-submit — queue it rather than surfacing an error.
      await enqueueWrite(queueKind, url, body);
      setCheckin({ checkedIn: true, checkedInAt: new Date().toISOString(), method: kind === "geolocation" ? "GEOLOCATION" : "MANUAL" });
      setPendingSync(true);
      setConfirmOffline(true);
      setStep("checked_in");
    }
  }

  const firstName = attendee ? attendee.name.split(" ")[0] : "";

  if (step === "loading" || step === "locating") {
    return (
      <div className="full-page">
        <PageHeader />
        <div className="full-page-band tone-info">
          <span className="ring info lg">📍</span>
          <h1>{step === "locating" ? "Finding the venue…" : "Loading…"}</h1>
        </div>
        <div className="full-page-body">
          <p className="copy" style={{ textAlign: "center" }}>
            {step === "locating" ? "Hold on while we check your location." : ""}
          </p>
        </div>
      </div>
    );
  }

  if (step === "arrived" || step === "confirming_arrival") {
    return (
      <div className="full-page">
        <PageHeader />
        <div className="full-page-band tone-success">
          <span className="ring ok lg">📍</span>
          <h1>You&rsquo;ve arrived</h1>
        </div>
        <div className="full-page-body">
          <p className="copy">
            Hey{firstName ? `, ${firstName}` : ""} — you&rsquo;re near the venue. Check yourself in to start
            networking.
          </p>
          {submitError && (
            <div className="banner warn">
              <div>{submitError}</div>
            </div>
          )}
          <button className="btn-primary" disabled={step === "confirming_arrival"} onClick={() => confirmCheckIn("geolocation")}>
            {step === "confirming_arrival" ? (
              <>
                <span className="spinner" /> Checking you in&hellip;
              </>
            ) : (
              "Check in"
            )}
          </button>
          <button className="link-muted" disabled={step === "confirming_arrival"} onClick={() => setStep("need_manual")}>
            Not at the venue yet?
          </button>
        </div>
      </div>
    );
  }

  if (step === "need_manual" || step === "confirming_manual") {
    return (
      <div className="full-page">
        <PageHeader />
        <div className="full-page-band tone-warning">
          <span className="ring warn lg">!</span>
          <h1>Not checked in</h1>
        </div>
        <div className="full-page-body">
          <p className="copy">{reason ?? "Confirm you're at the venue to start networking."}</p>
          {submitError && (
            <div className="banner warn">
              <div>{submitError}</div>
            </div>
          )}
          <button className="btn-warning" disabled={step === "confirming_manual"} onClick={() => confirmCheckIn("manual")}>
            {step === "confirming_manual" ? (
              <>
                <span className="spinner" /> Marking you present&hellip;
              </>
            ) : (
              "Check in manually"
            )}
          </button>
        </div>
      </div>
    );
  }

  // step === "checked_in" — this screen is the one attendees show at the registration desk.
  return (
    <div className="full-page">
      <PageHeader />
      <div className="full-page-band tone-success">
        <span className="ring ok lg">✓</span>
        <h1>Checked in{checkin?.checkedInAt ? ` · ${formatTime(checkin.checkedInAt)}` : ""}</h1>
      </div>
      <div className="full-page-body">
        {!online && (
          <div className="banner info">
            <div>
              <b>You&rsquo;re offline</b>
              This will sync once you&rsquo;re back online.
            </div>
          </div>
        )}
        {confirmOffline && (
          <div className="banner info">
            <div>
              <b>Saved offline</b>
              Will confirm with the server once you&rsquo;re back online.
            </div>
          </div>
        )}

        <div className="field" style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: "1.05rem", margin: "0 0 4px" }}>{attendee?.name}</p>
          {attendee?.businessName && <p style={{ color: "var(--ink-muted)", margin: 0 }}>{attendee.businessName}</p>}
        </div>

        <div className="banner ok" style={{ textAlign: "center" }}>
          <div>
            <b>Show this screen at the registration counter</b>
            {checkin?.method && `Checked in ${METHOD_LABEL[checkin.method]}${pendingSync ? " · syncing…" : ""}`}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="full-page-header">
      <div className="wordmark">
        <span className="dot" />
        Evento
      </div>
    </div>
  );
}
