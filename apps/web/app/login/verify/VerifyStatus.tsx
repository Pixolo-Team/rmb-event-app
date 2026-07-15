"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type VerifyState = "checking" | "ok" | "expired";

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

    fetch("/api/auth/magic-link/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include",
    })
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.json();
        if (!res.ok || body.status === "expired") {
          router.replace("/login?expired=1");
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
