"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "rate-limited">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage(null);
    setDevLink(null);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const body = await response.json();
      if (response.status === 429) {
        setState("rate-limited");
        setMessage(body.message ?? "Too many attempts. Try again in a few minutes.");
        return;
      }

      setState("sent");
      setMessage(body.message ?? "Check your email. If that address is on the guest list, a link is on its way.");
      if (body.devLink) setDevLink(body.devLink);
    } catch {
      setState("idle");
      setMessage("Couldn't reach the server. Please try again.");
    }
  }

  return (
    <div className="card">
      <div className="wordmark">
        <span className="dot" />
        Evento
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
        <div className={`banner ${state === "rate-limited" ? "warn" : "ok"}`} style={{ marginTop: 18, marginBottom: 0 }}>
          <div>
            <b>{state === "rate-limited" ? "Slow down" : "Check your email"}</b>
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
