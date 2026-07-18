"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { withCsrfHeaders } from "../../../lib/csrf";

const inFlightVerifications = new Map<string, Promise<Response>>();

function verifyOnce(token: string): Promise<Response> {
  let request = inFlightVerifications.get(token);
  if (!request) {
    request = fetch("/api/auth/magic-link/verify", withCsrfHeaders({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include",
    }));
    inFlightVerifications.set(token, request);
  }
  return request;
}

export function VerifyStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      router.replace("/login?expired=1");
      return;
    }

    let cancelled = false;

    verifyOnce(token)
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.clone().json();
        if (!res.ok || body.status === "expired") {
          router.replace("/login?expired=1");
          return;
        }
        if (!body.attendee?.profileCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        router.replace("/tutorial");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login?expired=1");
      });

    return () => {
      cancelled = true;
    };
  }, [router, token]);

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
