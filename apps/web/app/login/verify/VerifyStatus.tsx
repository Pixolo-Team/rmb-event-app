"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type VerifyState = "checking" | "ok" | "expired";

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
  const token = searchParams.get("token");

  const [state, setState] = useState<VerifyState>("checking");
  const [attendeeName, setAttendeeName] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.replace("/login?expired=1");
      return;
    }

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
        // completed profile) go to Profile Setup; returners land here.
        if (!body.attendee?.profileCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        setAttendeeName(body.attendee?.name ?? null);
        setState("ok");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login?expired=1");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state === "checking") {
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

  return (
    <div className="card">
      <div className="wordmark">
        <span className="dot" />
        Evento
      </div>
      <div className="center-state">
        <div className="ring ok">✓</div>
        <h2>You&rsquo;re in{attendeeName ? `, ${attendeeName.split(" ")[0]}` : ""}</h2>
        <p>Login is the only feature built so far — the rest of the app lands with the next features.</p>
      </div>
    </div>
  );
}
