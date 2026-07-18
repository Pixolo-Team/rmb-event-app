"use client";

import { FormEvent, KeyboardEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { withCsrfHeaders } from "../../lib/csrf";

type State = "checking" | "idle" | "submitting";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);
  const [capsLock, setCapsLock] = useState(false);

  // Session already active → skip straight to the hub (Screen 3.1 edge case).
  useEffect(() => {
    let active = true;
    fetch("/api/admin/auth/me", { credentials: "include" })
      .then((res) => {
        if (!active) return;
        if (res.ok) router.replace("/admin");
        else setState("idle");
      })
      .catch(() => active && setState("idle"));
    return () => {
      active = false;
    };
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", withCsrfHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      }));
      if (res.ok) {
        router.replace("/admin");
        return;
      }
      setError(
        res.status === 429
          ? "Too many failed attempts. Try again later."
          : "Invalid credentials. Try again.",
      );
      setState("idle");
    } catch {
      setError("Check your connection and try again.");
      setState("idle");
    }
  }

  function trackCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);
  }

  if (state === "checking") {
    return (
      <div className="card">
        <p className="copy" role="status">Checking admin access&hellip;</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="wordmark">
        <span className="dot" />
        Evento Admin
      </div>
      <h1 className="title">Organizer sign-in</h1>
      <p className="copy">Enter the organizer credentials to manage this event.</p>

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="admin-username">Username</label>
          <input
            id="admin-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={trackCapsLock}
            onKeyDown={trackCapsLock}
            required
          />
          {capsLock && <p className="caps-warning">Caps Lock is on</p>}
        </div>

        <button className="btn-primary" disabled={state === "submitting"}>
          {state === "submitting" ? (
            <>
              <span className="spinner" /> Signing in&hellip;
            </>
          ) : (
            "Log in"
          )}
        </button>
      </form>

      {error && (
        <div className="banner warn" style={{ marginTop: 18, marginBottom: 0 }}>
          <div>
            <b>Couldn&apos;t sign in</b>
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
