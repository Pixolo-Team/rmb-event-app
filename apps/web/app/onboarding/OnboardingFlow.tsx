"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePwaInstall } from "./usePwaInstall";

type Step = "loading" | "form" | "install" | "thanks";

interface AttendeePrefill {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string | null;
  chapterName: string | null;
  city: string | null;
  businessCategory: string | null;
  profileCompletedAt: string | null;
}

interface ProfileOptions {
  industries: readonly string[];
  businessCategories: readonly string[];
  lookingFor: readonly string[];
  offering: readonly string[];
  goals: readonly string[];
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function OnboardingFlow() {
  const router = useRouter();
  const { canInstall, promptInstall } = usePwaInstall();

  const [step, setStep] = useState<Step>("loading");
  const [attendee, setAttendee] = useState<AttendeePrefill | null>(null);
  const [options, setOptions] = useState<ProfileOptions | null>(null);

  const [industry, setIndustry] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [city, setCity] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [offering, setOffering] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Session-based (SCREENS.md Screen 1.1 "Comes from: Login 2.0") — the
  // attendee arrives already authenticated by their magic link. No session →
  // back to Login; this page never handles tokens itself.
  useEffect(() => {
    Promise.all([
      fetch("/api/attendees/me", { credentials: "include" }),
      fetch("/api/attendees/profile-options"),
    ])
      .then(async ([meRes, optionsRes]) => {
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }
        const me: AttendeePrefill = await meRes.json();
        setAttendee(me);
        if (me.city) setCity(me.city);
        if (me.businessCategory) setBusinessCategory(me.businessCategory);
        setOptions(await optionsRes.json());
        setStep("form");
      })
      .catch(() => router.replace("/login"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitProfile() {
    const errors: Record<string, string> = {};
    if (!industry) errors.industry = "Choose your industry";
    if (!businessCategory) errors.businessCategory = "Choose your business category";
    if (!city.trim()) errors.city = "Enter your city";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/attendees/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          industry,
          businessCategory,
          city: city.trim(),
          lookingFor,
          offering,
          goals,
          bio: bio || undefined,
        }),
      });
      if (!res.ok) {
        setSubmitError("Couldn't save your profile. Please try again.");
        return;
      }
      setStep("install");
    } catch {
      setSubmitError("Couldn't reach the server. Check your connection and try again.");
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
          <p>Loading your profile&hellip;</p>
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
            See you at the event — keep an eye on the group for updates. Matches and the rest of the app land with the
            next features.
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
            setFieldErrors(({ industry: _drop, ...rest }) => rest);
          }}
        >
          <option value="">Select your industry</option>
          {options?.industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        {fieldErrors.industry && <div className="hint err">{fieldErrors.industry}</div>}
      </div>

      <div className="field">
        <label htmlFor="businessCategory">Business category</label>
        <select
          id="businessCategory"
          value={businessCategory}
          onChange={(e) => {
            setBusinessCategory(e.target.value);
            setFieldErrors(({ businessCategory: _drop, ...rest }) => rest);
          }}
        >
          <option value="">Select your category</option>
          {options?.businessCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {fieldErrors.businessCategory && <div className="hint err">{fieldErrors.businessCategory}</div>}
      </div>

      <div className="field">
        <label htmlFor="city">City</label>
        <input
          id="city"
          maxLength={100}
          placeholder="e.g. Ahmedabad"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            setFieldErrors(({ city: _drop, ...rest }) => rest);
          }}
        />
        {fieldErrors.city && <div className="hint err">{fieldErrors.city}</div>}
      </div>

      <TagField label="Looking for" options={options?.lookingFor ?? []} selected={lookingFor} onToggle={(v) => setLookingFor((s) => toggle(s, v))} />
      <TagField label="Offering" options={options?.offering ?? []} selected={offering} onToggle={(v) => setOffering((s) => toggle(s, v))} />
      <TagField label="Goals" options={options?.goals ?? []} selected={goals} onToggle={(v) => setGoals((s) => toggle(s, v))} />

      <div className="field">
        <label htmlFor="bio">Bio (optional)</label>
        <textarea id="bio" maxLength={200} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>

      {submitError && (
        <div className="banner warn" style={{ marginBottom: 12 }}>
          <div>
            <b>Save failed</b>
            {submitError}
          </div>
        </div>
      )}

      <button className="btn-primary" disabled={submitting} onClick={submitProfile}>
        {submitting ? (
          <>
            <span className="spinner" /> Saving&hellip;
          </>
        ) : (
          "Continue"
        )}
      </button>
      <div className="links">
        <button className="link-muted" disabled={submitting} onClick={() => setStep("install")}>
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
