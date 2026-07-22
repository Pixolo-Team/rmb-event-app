"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePwaInstall } from "../../components/PwaInstallProvider";
import { PWA_BANNER_DISMISSED_KEY } from "../../components/InstallBanner";
import { RotaryLoader } from "../../components/RotaryLoader";
import { ChevronDownIcon, SingleSelectDropdown } from "../../components/SingleSelectDropdown";
import { MultiSelectDropdown } from "../../components/MultiSelectDropdown";
import { withCsrfHeaders } from "../../lib/csrf";

type Step = "loading" | "form" | "install" | "thanks";
type FormStep = 1 | 2 | 3;

interface AttendeePrefill {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string | null;
  chapterName: string | null;
  city: string | null;
  businessCategory: string | null;
  websiteUrl?: string | null;
  profileCompletedAt: string | null;
}

interface ProfileOptions {
  businessCategories: readonly string[];
  offeringsByCategory: Readonly<Record<string, readonly string[]>>;
  cities: readonly { value: string; name: string; stateOrUt: string }[];
  chapters: readonly string[];
  lookingFor: readonly string[];
  offering: readonly string[];
  goals: readonly string[];
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function OnboardingFlow() {
  const router = useRouter();
  const { canInstall, isInstalled, promptInstall } = usePwaInstall();

  const [step, setStep] = useState<Step>("loading");
  const [formStep, setFormStep] = useState<FormStep>(1);
  const [attendee, setAttendee] = useState<AttendeePrefill | null>(null);
  const [options, setOptions] = useState<ProfileOptions | null>(null);

  const [businessCategory, setBusinessCategory] = useState("");
  const [city, setCity] = useState("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [offering, setOffering] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        if (me.profileCompletedAt) {
          router.replace("/home");
          return;
        }
        setAttendee(me);
        if (me.city) setCity(me.city);
        if (me.businessCategory) setBusinessCategory(me.businessCategory);
        if (me.websiteUrl) setWebsiteUrl(me.websiteUrl);
        setOptions(await optionsRes.json());
        setStep("form");
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function submitProfile() {
    const errors: Record<string, string> = {};
    if (!businessCategory) errors.businessCategory = "Choose your business category";
    if (!city.trim() || !options?.cities.some((option) => option.value === city.trim())) {
      errors.city = "Choose a city from the list";
    }
    const normalizedWebsiteUrl = normalizeWebsiteUrl(websiteUrl);
    if (websiteUrl.trim() && !normalizedWebsiteUrl) {
      errors.websiteUrl = "Enter a valid website link";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/attendees/me/profile", withCsrfHeaders({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessCategory,
          city: city.trim(),
          lookingFor,
          offering,
          goals,
          bio: bio || undefined,
          websiteUrl: normalizedWebsiteUrl || undefined,
        }),
      }));
      if (!res.ok) {
        setSubmitError("Couldn't save your profile. Please try again.");
        return;
      }
      // Onboarding already offers install (the "install"/"thanks" steps below), so
      // suppress the shell's auto-banner — it would just repeat the same prompt.
      try {
        localStorage.setItem(PWA_BANNER_DISMISSED_KEY, "1");
      } catch {
        // Storage unavailable — the banner will simply show; not worth failing over.
      }
      setStep(isInstalled ? "thanks" : "install");
    } catch {
      setSubmitError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function continueForm() {
    if (formStep === 1) {
      if (!city.trim() || !options?.cities.some((option) => option.value === city.trim())) {
        setFieldErrors((current) => ({ ...current, city: "Choose a city from the list" }));
        return;
      }
      setFormStep(2);
      return;
    }

    if (formStep === 2) {
      if (!businessCategory) {
        setFieldErrors((current) => ({ ...current, businessCategory: "Choose your business category" }));
        return;
      }
      setFormStep(3);
    }
  }

  if (step === "loading") {
    return (
      <div className="card onboarding-card onboarding-card-center">
        <div className="center-state">
          <RotaryLoader />
          <p>Loading your profile&hellip;</p>
        </div>
      </div>
    );
  }

  if (step === "install") {
    return (
      <div className="onboarding-install-overlay" role="presentation">
        <div className="onboarding-install-dialog" role="dialog" aria-modal="true" aria-labelledby="install-evento-title">
          <div className="onboarding-install-icon" aria-hidden="true">📲</div>
          <div className="onboarding-install-copy">
            <span className="onboarding-install-kicker">Profile complete</span>
            <h2 id="install-evento-title">Install Evento</h2>
            <p>Keep Evento one tap away and access essential event information even when connectivity is unreliable.</p>
          </div>
          {canInstall ? (
            <button className="btn-primary" onClick={() => promptInstall().finally(() => setStep("thanks"))}>
              Install now
            </button>
          ) : (
            <div className="onboarding-install-help">
              Open your browser menu and choose <strong>Add to Home Screen</strong> to install Evento.
            </div>
          )}
          <button className="onboarding-install-later" onClick={() => setStep("thanks")}>
            Continue without installing
          </button>
        </div>
      </div>
    );
  }

  if (step === "thanks") {
    return (
      <div className="card onboarding-card onboarding-success-card">
        <div className="wordmark">
          <span className="dot" />
          Evento
        </div>
        <div className="onboarding-success-content">
          <div className="onboarding-success-tick" aria-hidden="true">
            <svg viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="31" />
              <path d="m22 36 9 9 19-21" />
            </svg>
          </div>
          <span className="onboarding-success-kicker">All done</span>
          <h1>Your profile is set up</h1>
          <p>Your profile is ready. Start discovering people worth meeting.</p>

          <div className="onboarding-success-actions">
            {isInstalled ? (
              <button className="btn-primary" onClick={() => router.push("/home")}>
                Open app
              </button>
            ) : (
              <>
                <button className="btn-primary" onClick={() => setStep("install")}>
                  Install Evento
                </button>
                <button className="onboarding-success-browser" onClick={() => router.push("/home")}>
                  Continue in browser
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card onboarding-card" style={{ maxWidth: 440 }}>
      <div className="wordmark">
        <span className="dot" />
        Evento
      </div>
      <h1 className="title">Complete your profile</h1>
      <p className="copy">A few quick questions so we can suggest people worth meeting.</p>

      <div className="onboarding-progress" aria-label={`Step ${formStep} of 3`}>
        {[1, 2, 3].map((number) => (
          <span key={number} className={number <= formStep ? "active" : ""} />
        ))}
      </div>
      <div className="onboarding-step-label">Step {formStep} of 3</div>

      {formStep === 1 && (
        <section className="onboarding-step" aria-labelledby="onboarding-about-title">
          <h2 id="onboarding-about-title">About you</h2>
          <p>Confirm your registration details and tell us where you&rsquo;re based.</p>

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

          <CityCombobox
            options={options?.cities ?? []}
            value={city}
            error={fieldErrors.city}
            onChange={(nextCity) => {
              setCity(nextCity);
              setFieldErrors(({ city: _drop, ...rest }) => rest);
            }}
          />
        </section>
      )}

      {formStep === 2 && (
        <section className="onboarding-step" aria-labelledby="onboarding-business-title">
          <h2 id="onboarding-business-title">Your business</h2>
          <p>Choose your category, then describe what you offer.</p>

          <SingleSelectDropdown
            label="Business category"
            options={options?.businessCategories ?? []}
            value={businessCategory}
            placeholder="Select your category"
            onChange={(nextCategory) => {
              const compatibleOfferings = options?.offeringsByCategory?.[nextCategory] ?? [];
              const hasIncompatibleSelections = offering.some((item) => !compatibleOfferings.includes(item));
              if (
                hasIncompatibleSelections &&
                !window.confirm("Changing category will clear offerings that do not belong to the new category. Continue?")
              ) {
                return;
              }
              setBusinessCategory(nextCategory);
              setOffering((current) => current.filter((item) => compatibleOfferings.includes(item)));
              setFieldErrors(({ businessCategory: _drop, ...rest }) => rest);
            }}
          />
          {fieldErrors.businessCategory && <div className="hint err">{fieldErrors.businessCategory}</div>}

          <MultiSelectDropdown
            label="Offering"
            options={options?.offeringsByCategory?.[businessCategory] ?? []}
            selected={offering}
            onToggle={(v) => setOffering((s) => toggle(s, v))}
            disabled={!businessCategory}
            placeholder={businessCategory ? "Select offerings" : "Select a business category first"}
          />
        </section>
      )}

      {formStep === 3 && (
        <section className="onboarding-step" aria-labelledby="onboarding-goals-title">
          <h2 id="onboarding-goals-title">Networking goals</h2>
          <p>Tell us who you want to meet and what you hope to achieve.</p>

          <MultiSelectDropdown
            label="Looking for"
            options={options?.lookingFor ?? []}
            selected={lookingFor}
            onToggle={(v) => setLookingFor((s) => toggle(s, v))}
          />
          <MultiSelectDropdown
            label="Goals"
            options={options?.goals ?? []}
            selected={goals}
            onToggle={(v) => setGoals((s) => toggle(s, v))}
          />

          <div className="field">
            <label htmlFor="bio">Bio (optional)</label>
            <textarea id="bio" maxLength={200} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="websiteUrl">Website link (optional)</label>
            <input
              id="websiteUrl"
              type="text"
              inputMode="url"
              value={websiteUrl}
              onChange={(e) => {
                setWebsiteUrl(e.target.value);
                setFieldErrors(({ websiteUrl: _drop, ...rest }) => rest);
              }}
              placeholder="yourwebsite.com"
            />
            {fieldErrors.websiteUrl && <div className="hint err">{fieldErrors.websiteUrl}</div>}
          </div>
        </section>
      )}

      {formStep === 3 && submitError && (
        <div className="banner warn" style={{ marginBottom: 12 }}>
          <div>
            <b>Save failed</b>
            {submitError}
          </div>
        </div>
      )}

      <div className="onboarding-actions">
        {formStep > 1 && (
          <button className="onboarding-back" disabled={submitting} onClick={() => setFormStep((formStep - 1) as FormStep)}>
            <svg className="back-icon" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" />
            </svg>
            <span>Back</span>
          </button>
        )}
        {formStep < 3 ? (
          <button className="btn-primary" onClick={continueForm}>
            Continue
          </button>
        ) : (
          <button className="btn-primary" disabled={submitting} onClick={submitProfile}>
            {submitting ? (
              <>
                <span className="spinner" /> Saving&hellip;
              </>
            ) : (
              "Save profile"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function CityCombobox({
  options,
  value,
  error,
  onChange,
}: {
  options: readonly { value: string; name: string; stateOrUt: string }[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = value.trim().toLowerCase();
  const selectedKnownCity = options.some((candidate) => candidate.value === value);
  const visibleOptions = options.filter((option) => {
    if (!normalizedQuery || selectedKnownCity) return true;
    return `${option.name} ${option.stateOrUt}`.toLowerCase().includes(normalizedQuery);
  });

  function chooseCity(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setActiveIndex(0);
  }

  return (
    <div className="field city-combobox" style={{ marginTop: 16 }}>
      <label htmlFor="city">City</label>
      <div className="city-combobox-control">
        <input
          id="city"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="city-combobox-options"
          aria-activedescendant={open && visibleOptions[activeIndex] ? `city-option-${activeIndex}` : undefined}
          maxLength={100}
          placeholder="Search city or state/UT"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) => Math.min(current + 1, Math.max(visibleOptions.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === "Enter" && open && visibleOptions[activeIndex]) {
              event.preventDefault();
              chooseCity(visibleOptions[activeIndex].value);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          className={`city-combobox-toggle${open ? " open" : ""}`}
          aria-label={open ? "Close city options" : "Open city options"}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDownIcon />
        </button>
      </div>

      {open && (
        <>
          <button className="city-combobox-backdrop" type="button" aria-label="Close city options" onClick={() => setOpen(false)} />
          <div id="city-combobox-options" className="city-combobox-panel" role="listbox">
            {visibleOptions.map((option, index) => (
              <button
                id={`city-option-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`city-combobox-option${index === activeIndex ? " active" : ""}`}
                key={`${option.name}-${option.stateOrUt}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseCity(option.value)}
              >
                <span>{option.name}</span>
                <small>{option.stateOrUt}</small>
              </button>
            ))}
            {visibleOptions.length === 0 && <div className="city-combobox-empty">No matching city found</div>}
          </div>
        </>
      )}
      {error && <div className="hint err">{error}</div>}
    </div>
  );
}

