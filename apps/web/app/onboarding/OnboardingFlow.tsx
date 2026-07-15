"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePwaInstall } from "./usePwaInstall";

type Step = "loading" | "expired" | "form" | "install" | "thanks";

interface AttendeePrefill {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string | null;
  chapterName: string | null;
}

interface ProfileOptions {
  industries: readonly string[];
  lookingFor: readonly string[];
  offering: readonly string[];
  goals: readonly string[];
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function OnboardingFlow() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { canInstall, promptInstall } = usePwaInstall();

  const [step, setStep] = useState<Step>("loading");
  const [attendee, setAttendee] = useState<AttendeePrefill | null>(null);
  const [options, setOptions] = useState<ProfileOptions | null>(null);

  const [industry, setIndustry] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [offering, setOffering] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [industryError, setIndustryError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStep("expired");
      return;
    }

    Promise.all([
      fetch("/api/attendees/onboarding/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "include",
      }).then((r) => r.json().then((body) => ({ ok: r.ok, body }))),
      fetch("/api/attendees/profile-options").then((r) => r.json()),
    ])
      .then(([resolveResult, profileOptions]) => {
        if (!resolveResult.ok || resolveResult.body.status === "expired") {
          setStep("expired");
          return;
        }
        setAttendee(resolveResult.body.attendee);
        setOptions(profileOptions);
        setStep("form");
      })
      .catch(() => setStep("expired"));
  }, [token]);

  async function submitProfile(skip: boolean) {
    if (!skip && !industry) {
      setIndustryError("Choose your industry");
      return;
    }
    setSubmitting(true);
    try {
      await fetch("/api/attendees/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          industry: industry || "Other",
          lookingFor,
          offering,
          goals,
          bio: bio || undefined,
        }),
      });
      setStep("install");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "loading") {
    return (
      <div className="card">
        <div className="wordmark">
          <span className="dot" />
          Evento
        </div>
        <div className="center-state">
          <span className="spinner" style={{ borderTopColor: "var(--brand-500)", borderColor: "var(--border)" }} />
          <p>Loading your invite&hellip;</p>
        </div>
      </div>
    );
  }

  if (step === "expired") {
    return (
      <div className="card">
        <div className="wordmark">
          <span className="dot" />
          Evento
        </div>
        <div className="center-state">
          <div className="ring warn">!</div>
          <h2>This invite link has expired</h2>
          <p>Ask the event organizer to resend your invite.</p>
        </div>
      </div>
    );
  }

  if (step === "install") {
    return (
      <div className="card">
        <div className="wordmark">
          <span className="dot" />
          Evento
        </div>
        <div className="center-state">
          <div className="ring ok">📲</div>
          <h2>Install Evento</h2>
          <p>Add Evento to your home screen so it works offline and you don&rsquo;t have to hunt for a browser tab at the event.</p>
          {canInstall ? (
            <button className="btn-primary" style={{ width: "auto", padding: "0 24px" }} onClick={() => promptInstall().finally(() => setStep("thanks"))}>
              Install now
            </button>
          ) : (
            <p style={{ fontSize: ".78rem" }}>
              Your browser doesn&rsquo;t support one-tap install here — use &ldquo;Add to Home Screen&rdquo; from your browser menu instead.
            </p>
          )}
          <button className="link-muted" onClick={() => setStep("thanks")}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  if (step === "thanks") {
    return (
      <div className="card">
        <div className="wordmark">
          <span className="dot" />
          Evento
        </div>
        <div className="center-state">
          <div className="ring ok">✓</div>
          <h2>Your profile is set up!</h2>
          <p>
            We&rsquo;ll text you on WhatsApp before the event. Matches and the rest of the app land with the next
            features — Login and onboarding are what&rsquo;s built so far.
          </p>
        </div>
      </div>
    );
  }

  // step === "form"
  return (
    <div className="card" style={{ maxWidth: 440 }}>
      <div className="wordmark">
        <span className="dot" />
        Evento
      </div>
      <h1 className="title">Complete your profile</h1>
      <p className="copy">A few quick questions so we can suggest people worth meeting.</p>

      <div className="field">
        <label>Name</label>
        <input value={attendee?.name ?? ""} disabled />
      </div>
      <div className="field">
        <label>Business / profession</label>
        <input value={attendee?.businessName ?? ""} disabled />
      </div>
      {attendee?.chapterName && (
        <div className="field">
          <label>RMB Chapter</label>
          <input value={attendee.chapterName} disabled />
        </div>
      )}

      <div className="field" style={{ marginTop: 16 }}>
        <label htmlFor="industry">Industry</label>
        <select
          id="industry"
          value={industry}
          onChange={(e) => {
            setIndustry(e.target.value);
            setIndustryError(null);
          }}
        >
          <option value="">Select your industry</option>
          {options?.industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        {industryError && <div className="hint err">{industryError}</div>}
      </div>

      <TagField label="Looking for" options={options?.lookingFor ?? []} selected={lookingFor} onToggle={(v) => setLookingFor((s) => toggle(s, v))} />
      <TagField label="Offering" options={options?.offering ?? []} selected={offering} onToggle={(v) => setOffering((s) => toggle(s, v))} />
      <TagField label="Goals" options={options?.goals ?? []} selected={goals} onToggle={(v) => setGoals((s) => toggle(s, v))} />

      <div className="field">
        <label htmlFor="bio">Bio (optional)</label>
        <textarea id="bio" maxLength={200} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>

      <button className="btn-primary" disabled={submitting} onClick={() => submitProfile(false)}>
        {submitting ? (
          <>
            <span className="spinner" /> Saving&hellip;
          </>
        ) : (
          "Continue"
        )}
      </button>
      <div className="links">
        <button className="link-muted" disabled={submitting} onClick={() => submitProfile(true)}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

function TagField({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="chip-row">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            className={`chip${selected.includes(opt) ? " on" : ""}`}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
