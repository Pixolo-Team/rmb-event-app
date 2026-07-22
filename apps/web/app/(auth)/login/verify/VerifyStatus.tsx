"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotaryLoader } from "../../../components/RotaryLoader";
import { withCsrfHeaders } from "../../../lib/csrf";
import { profileCache } from "../../../lib/profileCache";

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
        // A magic link may switch attendees on a shared device. Discard cached
        // identity/Home data before routing under the newly issued session.
        profileCache.clear();
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
  }, [router, token]);

  return (
    <div className="center-state">
      <RotaryLoader />
      <p>Signing you in&hellip;</p>
    </div>
  );
}
