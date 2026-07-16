"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// The token is single-use, so the verify request must fire exactly once per
// token even if the effect re-runs (React StrictMode remounts, fast refresh) —
// a re-run would consume the token and then see its own retry as "expired".
// Module-level so it survives component remounts within the same page load.
const inFlightVerifications = new Map<string, Promise<Response>>();

function verifyOnce(token: string): Promise<Response> {
  let request = inFlightVerifications.get(token);
  if (!request) {
    request = fetch("/api/auth/magic-link/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include",
    });
    inFlightVerifications.set(token, request);
  }
  return request;
}

export function VerifyStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Captured once on mount, not read reactively: stripping the token from the
  // URL below syncs into useSearchParams (Next 14.2+), and a reactive read
  // would re-run the effect with token=null mid-verification.
  const [token] = useState(() => searchParams.get("token"));

  useEffect(() => {
    if (!token) {
      router.replace("/login?expired=1");
      return;
    }

    // Strip the token from the address bar immediately (PRD Security & Privacy):
    // it's single-use, so once captured in state it has no business lingering in
    // browser history — especially on a shared/family device.
    window.history.replaceState(null, "", "/login/verify");

    let cancelled = false;

    verifyOnce(token)
      .then(async (res) => {
        if (cancelled) return;
        // Body can only be consumed once on a shared Response — clone per reader.
        const body = await res.clone().json();
        if (!res.ok || body.status === "expired") {
          router.replace("/login?expired=1");
          return;
        }
        // Post-login routing per SCREENS.md Screen 2.0: first-timers (no
        // completed profile) go to Profile Setup; returners go to Home.
        if (!body.attendee?.profileCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        router.replace("/home");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login?expired=1");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="card">
      <div className="wordmark">
        <span className="dot" />
        Evento
      </div>
      <div className="center-state">
        <span className="spinner" style={{ borderTopColor: "var(--brand-500)", borderColor: "var(--border)" }} />
        <p>Signing you in&hellip;</p>
      </div>
    </div>
  );
}
