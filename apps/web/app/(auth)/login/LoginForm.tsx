"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { withCsrfHeaders, getCsrfToken } from "../../lib/csrf";
import { profileCache } from "../../lib/profileCache";
import { RotaryLoader } from "../../components/RotaryLoader";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [state, setState] = useState<
    "idle" | "sending" | "sent" | "not-registered" | "rate-limited" | "error"
  >("idle");

  // Ensure the CSRF cookie exists before the user's first POST.
  // The cookie is set by API middleware, so we need at least one API round-trip.
  useEffect(() => {
    if (!getCsrfToken()) {
      fetch("/api/attendees/profile-options").catch(() => {});
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cachedProfile = profileCache.get();
    if (cachedProfile) {
      router.replace(cachedProfile.profileCompletedAt ? "/home" : "/onboarding");
      return () => {
        cancelled = true;
      };
    }

    // With no local hint, show Login immediately and verify any cookie session
    // in the background. The server remains authoritative for authentication.
    setCheckingSession(false);
    fetch("/api/attendees/me", { credentials: "include" })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) profileCache.clear();
          return;
        }
        const attendee: { profileCompletedAt?: string | null } = await response.json();
        router.replace(attendee.profileCompletedAt ? "/home" : "/onboarding");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage(null);
    setDevLink(null);

    try {
      const response = await fetch("/api/auth/magic-link", withCsrfHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }));

      const body = await response.json();
      const bodyMessage = Array.isArray(body.message) ? body.message.join(" ") : body.message;

      if (response.status === 429) {
        setState("rate-limited");
        setMessage(bodyMessage ?? "Too many attempts. Try again in a few minutes.");
        return;
      }

      if (response.status === 404 && body.status === "not_registered") {
        setState("not-registered");
        setMessage(
          bodyMessage ??
            "We couldn't find this email. Try the email used during registration, or contact the event organizer.",
        );
        return;
      }

      if (!response.ok) {
        setState("error");
        setMessage(bodyMessage ?? "Something went wrong. Please try again.");
        return;
      }

      setState("sent");
      setMessage(bodyMessage ?? "Check your email. If that address is on the guest list, a link is on its way.");
      if (body.devLink) setDevLink(body.devLink);
    } catch {
      setState("error");
      setMessage("Couldn't reach the server. Please try again.");
    }
  }

  if (checkingSession) {
    return (
      <div className="center-state">
        <RotaryLoader />
        <p>Checking your session&hellip;</p>
      </div>
    );
  }

  return (
    <div className="card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/rmb-fellowship-logo.png"
        alt="Rotary Means Business Fellowship"
        className="login-brand"
        width={72}
        height={72}
      />
      <div className="wordmark">
        <span className="dot" />
        RMBF Evento
      </div>
      <h1 className="title">Get your access link</h1>
      <p className="copy">Enter the email you registered with. We&apos;ll send you a secure magic link.</p>

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <button className="btn-primary" disabled={state === "sending"}>
          {state === "sending" ? (
            <>
              <span className="spinner" /> Sending link&hellip;
            </>
          ) : (
            "Send me a link"
          )}
        </button>
      </form>

      {message ? (
        <div className={`banner ${state === "sent" ? "ok" : "warn"}`} style={{ marginTop: 18, marginBottom: 0 }}>
          <div>
            <b>
              {state === "rate-limited"
                ? "Slow down"
                : state === "not-registered"
                  ? "Email not registered"
                  : state === "error"
                    ? "Couldn't send it"
                    : "Check your email"}
            </b>
            {message}
            {devLink ? (
              <>
                <br />
                <a href={devLink} style={{ color: "inherit", fontWeight: 700 }}>
                  Open dev magic link
                </a>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

    </div>
  );
}
