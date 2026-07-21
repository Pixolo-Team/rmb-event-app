"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { withCsrfHeaders } from "../lib/csrf";

// F3.7 — deep-link target encoded in the venue attendance QR
// (`/checkin?venue=<token>`). The in-app scanner posts the token directly, but if
// an attendee scans the QR with their phone's native camera they land here, so we
// complete the check-in and bounce them to Home.
type Phase = "working" | "invalid" | "unauthenticated";

export default function VenueCheckinPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("working");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("venue");
    if (!token) {
      setPhase("invalid");
      return;
    }

    fetch("/api/checkin/venue-qr", withCsrfHeaders({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    }))
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          setPhase("unauthenticated");
          return;
        }
        const outcome = await res.json().catch(() => null);
        if (outcome?.status === "checked_in" || outcome?.status === "already_checked_in") {
          router.replace("/home");
          return;
        }
        setPhase("invalid");
      })
      .catch(() => setPhase("invalid"));
  }, [router]);

  return (
    <main className="attendee-page" style={{ display: "grid", placeItems: "center", minHeight: "60vh", textAlign: "center", gap: 16 }}>
      {phase === "working" && (
        <div className="directory-loading" role="status">
          <span className="spinner" />
          Checking you in…
        </div>
      )}
      {phase === "unauthenticated" && (
        <div className="directory-state">
          <h1>Sign in to check in</h1>
          <p>Open the app and sign in, then scan the venue QR again.</p>
          <Link className="btn-primary" href="/login">Go to sign in</Link>
        </div>
      )}
      {phase === "invalid" && (
        <div className="directory-state">
          <h1>Couldn&rsquo;t check you in</h1>
          <p>That QR isn&rsquo;t valid for this event. Ask a staff member for help.</p>
          <Link className="btn-primary" href="/home">Back to Home</Link>
        </div>
      )}
    </main>
  );
}
