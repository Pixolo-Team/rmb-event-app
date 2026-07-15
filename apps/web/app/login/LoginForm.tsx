"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type FlowState = "default" | "sending" | "sent" | "rate_limited";

const RESEND_COOLDOWN_SECONDS = 60;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 21 19.5H3z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r=".2" fill="currentColor" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const showExpiredBanner = searchParams.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [flow, setFlow] = useState<FlowState>("default");
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devLink, setDevLink] = useState<string | null>(null);

  // Ticks the resend cooldown down one second at a time once "sent" starts one.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  // Ticks the rate-limit cooldown down, then drops back to the default form.
  useEffect(() => {
    if (flow !== "rate_limited" || retryAfterSeconds <= 0) return;
    if (retryAfterSeconds === 1) {
      const id = setTimeout(() => {
        setFlow("default");
        setRetryAfterSeconds(0);
      }, 1000);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setRetryAfterSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [flow, retryAfterSeconds]);

  async function submitMagicLinkRequest(targetEmail: string) {
    setFlow("sending");
    setDevLink(null);

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const body = await res.json();

      if (res.status === 429) {
        setRetryAfterSeconds(body.retryAfterSeconds ?? 60);
        setFlow("rate_limited");
        return;
      }

      if (!res.ok) {
        // Unexpected server error — fall back to the same neutral copy rather
        // than a distinct error state that could hint at what went wrong server-side.
        setFlow("sent");
        return;
      }

      setDevLink(body.devLink ?? null);
      setFlow("sent");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setFlow("default");
      setFieldError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setFieldError("Enter a valid email address");
      return;
    }
    setFieldError(null);
    submitMagicLinkRequest(trimmed);
  }

  function handleResend() {
    if (resendCooldown > 0) return;
    submitMagicLinkRequest(email.trim());
  }

  if (flow === "sent") {
    return (
      <div className="card">
        <div className="wordmark">
          <span className="dot" />
          Evento
        </div>
        <div className="center-state">
          <div className="ring ok">
            <MailIcon />
          </div>
          <h2>Check your email</h2>
          <p>If that address is on the guest list, a link is on its way.</p>
          <button className="pill-btn" disabled={resendCooldown > 0} onClick={handleResend}>
            {resendCooldown > 0 ? (
              <>
                <ClockIcon /> <span className="tnum">Resend in {resendCooldown}s</span>
              </>
            ) : (
              "Resend link"
            )}
          </button>
          {devLink && (
            <p style={{ fontSize: ".72rem", wordBreak: "break-all", marginTop: 8 }}>
              <strong>Dev only:</strong>{" "}
              <a href={devLink}>{devLink}</a>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (flow === "rate_limited") {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return (
      <div className="card">
        <div className="wordmark">
          <span className="dot" />
          Evento
        </div>
        <div className="center-state">
          <div className="ring warn">
            <ClockIcon />
          </div>
          <h2>Too many attempts</h2>
          <p>
            Try again in <span className="tnum">{minutes} minute{minutes === 1 ? "" : "s"}</span>.
          </p>
        </div>
      </div>
    );
  }

  const sending = flow === "sending";

  return (
    <div className="card">
      <div className="wordmark">
        <span className="dot" />
        Evento
      </div>

      {showExpiredBanner && (
        <div className="banner warn">
          <AlertIcon />
          <div>
            <b>This link has expired</b>
            Request a new one below.
          </div>
        </div>
      )}

      <h1 className="title">Welcome back</h1>
      <p className="copy">Enter your registered email and we&rsquo;ll send you a fresh access link.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@business.com"
            value={email}
            disabled={sending}
            className={fieldError ? "err" : ""}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(null);
            }}
          />
          {fieldError && <div className="hint err">{fieldError}</div>}
        </div>

        <button className="btn-primary" type="submit" disabled={sending}>
          {sending ? (
            <>
              <span className="spinner" /> Sending&hellip;
            </>
          ) : (
            <>
              <MailIcon /> Send me a link
            </>
          )}
        </button>
      </form>

      <div className="links">
        <span className="link-muted">Ask event staff for help</span>
      </div>
    </div>
  );
}
