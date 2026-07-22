"use client";
import { withCsrfHeaders } from "../../lib/csrf";
import { useEffect, useMemo, useState } from "react";
import type { AttendeeMe } from "./TutorialPage";
import { PoweredByFooter } from "./PoweredByFooter";
import { MultiSelectDropdown } from "../../components/MultiSelectDropdown";
import { SingleSelectDropdown } from "../../components/SingleSelectDropdown";

type CityOption = {
  name: string;
  stateOrUt: string;
  value: string;
};

type ProfileOptions = {
  businessCategories: string[];
  cities: CityOption[];
  lookingFor: string[];
  offeringsByCategory: Record<string, string[]>;
  goals: string[];
};

const DEMO_OPTIONS: ProfileOptions = {
  businessCategories: ["Manufacturer", "Trader/Distributor", "Service Provider", "Retailer", "Consultant"],
  cities: [
    { name: "Ahmedabad", stateOrUt: "Gujarat", value: "Ahmedabad, Gujarat" },
    { name: "Surat", stateOrUt: "Gujarat", value: "Surat, Gujarat" },
    { name: "Vadodara", stateOrUt: "Gujarat", value: "Vadodara, Gujarat" },
    { name: "Rajkot", stateOrUt: "Gujarat", value: "Rajkot, Gujarat" },
  ],
  lookingFor: ["Distributors", "Suppliers", "Clients", "Investors", "Partners", "Mentors"],
  offeringsByCategory: {
    Manufacturer: ["Manufacturing", "Wholesale"],
    "Trader/Distributor": ["Wholesale", "Logistics"],
    "Service Provider": ["Consulting", "Logistics"],
    Retailer: ["Retail space", "Wholesale"],
    Consultant: ["Consulting", "Financing"],
  },
  goals: ["Grow network", "Find partners", "Generate leads", "Learn", "Hire"],
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function isValidLinkedInUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes("linkedin.");
  } catch {
    return false;
  }
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

function readOnlyValue(value: string | null | undefined, fallback = "Not available") {
  return value && value.trim() ? value : fallback;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function uniqueValues(values: readonly string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function EditProfileForm({
  attendee,
  onSaved,
  onClose,
}: {
  attendee: AttendeeMe;
  onSaved: (patch: Partial<AttendeeMe>) => void;
  onClose: () => void;
}) {
  const [options, setOptions] = useState<ProfileOptions>(DEMO_OPTIONS);
  const [isOffline, setIsOffline] = useState(false);
  const [businessName, setBusinessName] = useState(attendee.businessName ?? "");
  const [businessCategory, setBusinessCategory] = useState(attendee.businessCategory ?? "");
  const [city, setCity] = useState(attendee.city ?? "");
  const [lookingFor, setLookingFor] = useState<string[]>(attendee.lookingFor ?? []);
  const [offering, setOffering] = useState<string[]>(attendee.offering ?? []);
  const [goals, setGoals] = useState<string[]>(attendee.goals ?? []);
  const [bio, setBio] = useState(attendee.bio ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(attendee.linkedInUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(attendee.websiteUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    fetch("/api/attendees/profile-options", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setOptions({
            businessCategories: data.businessCategories ?? [],
            cities: data.cities ?? [],
            lookingFor: data.lookingFor ?? [],
            offeringsByCategory: data.offeringsByCategory ?? {},
            goals: data.goals ?? [],
          });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setBusinessCategory(attendee.businessCategory ?? "");
    setBusinessName(attendee.businessName ?? "");
    setCity(attendee.city ?? "");
    setLookingFor(attendee.lookingFor ?? []);
    setOffering(attendee.offering ?? []);
    setGoals(attendee.goals ?? []);
    setBio(attendee.bio ?? "");
    setLinkedInUrl(attendee.linkedInUrl ?? "");
    setWebsiteUrl(attendee.websiteUrl ?? "");
    setError(null);
  }, [attendee]);

  const knownCities = useMemo(() => {
    const values = new Set(options.cities.map((option) => option.value));
    if (attendee.city) values.add(attendee.city);
    return [...values];
  }, [attendee.city, options.cities]);
  const availableOfferings = useMemo(
    () => uniqueValues([
      ...(options.offeringsByCategory[businessCategory] ?? []),
      ...offering,
      ...(attendee.offering ?? []),
    ]),
    [attendee.offering, businessCategory, offering, options.offeringsByCategory],
  );
  const availableLookingFor = useMemo(
    () => uniqueValues([
      ...(options.lookingFor ?? []),
      ...lookingFor,
      ...(attendee.lookingFor ?? []),
    ]),
    [attendee.lookingFor, lookingFor, options.lookingFor],
  );
  const availableGoals = useMemo(
    () => uniqueValues([
      ...(options.goals ?? []),
      ...goals,
      ...(attendee.goals ?? []),
    ]),
    [attendee.goals, goals, options.goals],
  );

  useEffect(() => {
    if (availableLookingFor.length === 0) return;
    setLookingFor((current) => current.filter((item) => availableLookingFor.includes(item)));
  }, [availableLookingFor]);

  useEffect(() => {
    if (availableOfferings.length === 0) return;
    setOffering((current) => current.filter((item) => availableOfferings.includes(item)));
  }, [availableOfferings]);

  useEffect(() => {
    if (availableGoals.length === 0) return;
    setGoals((current) => current.filter((item) => availableGoals.includes(item)));
  }, [availableGoals]);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        businessCategory: attendee.businessCategory ?? "",
        businessName: attendee.businessName ?? "",
        city: attendee.city ?? "",
        lookingFor: attendee.lookingFor ?? [],
        offering: attendee.offering ?? [],
        goals: attendee.goals ?? [],
        bio: attendee.bio ?? "",
        linkedInUrl: attendee.linkedInUrl ?? "",
        websiteUrl: attendee.websiteUrl ?? "",
      }),
    [attendee],
  );

  const currentSnapshot = JSON.stringify({
    businessCategory,
    businessName,
    city,
    lookingFor,
    offering,
    goals,
    bio,
    linkedInUrl,
    websiteUrl,
  });
  const isDirty = initialSnapshot !== currentSnapshot;

  function handleAttemptClose() {
    if (isDirty && typeof window !== "undefined" && !window.confirm("Discard your profile changes?")) {
      return;
    }
    onClose();
  }

  async function handleSave() {
    setError(null);

    if (isOffline) {
      setError("You're offline — reconnect to save.");
      return;
    }
    if (!businessCategory) {
      setError("Choose your business category.");
      return;
    }
    if (!city.trim()) {
      setError("Choose your city.");
      return;
    }
    if (options.cities.length > 0 && !knownCities.includes(city.trim())) {
      setError("Choose a city from the active list.");
      return;
    }
    if (linkedInUrl.trim() && !isValidLinkedInUrl(linkedInUrl.trim())) {
      setError("Enter a valid LinkedIn profile URL.");
      return;
    }
    const normalizedWebsiteUrl = normalizeWebsiteUrl(websiteUrl);
    if (websiteUrl.trim() && !normalizedWebsiteUrl) {
      setError("Enter a valid website link.");
      return;
    }

    const sanitizedLookingFor = lookingFor.filter((item) => (options.lookingFor ?? []).includes(item));
    const sanitizedOffering = offering.filter((item) => (options.offeringsByCategory[businessCategory] ?? []).includes(item));
    const sanitizedGoals = goals.filter((item) => (options.goals ?? []).includes(item));


    setSaving(true);
    try {
      const res = await fetch("/api/attendees/me/profile", withCsrfHeaders({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          businessName: businessName.trim() || null,
          businessCategory,
          city: city.trim(),
          lookingFor: sanitizedLookingFor,
          offering: sanitizedOffering,
          goals: sanitizedGoals,
          bio: bio.trim() || undefined,
          linkedInUrl: linkedInUrl.trim() || undefined,
          websiteUrl: normalizedWebsiteUrl || undefined,
        }),
      }));
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { message?: string } | null;
        setError(body?.message ?? "Couldn't save your profile. Please try again.");
        return;
      }

      onSaved({
        businessName: businessName.trim() || null,
        businessCategory,
        city: city.trim(),
        lookingFor: sanitizedLookingFor,
        offering: sanitizedOffering,
        goals: sanitizedGoals,
        bio: bio.trim() || null,
        linkedInUrl: linkedInUrl.trim() || null,
        websiteUrl: normalizedWebsiteUrl || null,
      });
      onClose();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-content attendee-page profile-edit-page">
      <section className="settings-card profile-edit-shell">
        <div className="profile-edit-header">
          <div>
            <p className="photo-modal-eyebrow">Edit profile</p>
            <h1 className="settings-title">Update your attendee card</h1>
          </div>
        </div>

        {isOffline ? (
          <div className="banner warn app-banner">
            <div>
              <b>Offline</b>
              You&apos;re offline — reconnect to save changes.
            </div>
          </div>
        ) : null}

        <section className="profile-edit-readonly">
          <h2 className="profile-edit-section-title">Registered details</h2>
          <p className="settings-copy">These are controlled by the event organizer.</p>
          <div className="profile-readonly-grid">
            <ReadOnlyField label="Name" value={readOnlyValue(attendee.name)} />
            <ReadOnlyField label="Phone" value={readOnlyValue(attendee.phone)} />
            <ReadOnlyField label="Email" value={readOnlyValue(attendee.email)} />
            <ReadOnlyField label="Chapter" value={readOnlyValue(attendee.chapterName)} />
            <ReadOnlyField label="Table number" value={readOnlyValue(attendee.tableNumber)} />
          </div>
          <p className="profile-readonly-hint">Contact the event organizer to update these details.</p>
        </section>

        <section className="profile-edit-section">
          <h2 className="profile-edit-section-title">Card details</h2>

          <div className="field">
            <label htmlFor="edit-company-name">Company name</label>
            <input
              id="edit-company-name"
              type="text"
              maxLength={160}
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Enter your company name"
            />
          </div>

          <SingleSelectDropdown
            id="edit-category"
            label="Business category"
            options={options.businessCategories}
            value={businessCategory}
            placeholder="Select your category"
            onChange={(nextCategory) => {
              const compatibleOfferings = options.offeringsByCategory[nextCategory] ?? [];
              setBusinessCategory(nextCategory);
              setOffering((current) => current.filter((item) => compatibleOfferings.includes(item)));
              setError(null);
            }}
          />

          <MultiSelectDropdown
            label="Offering"
            options={availableOfferings}
            selected={offering}
            onToggle={(v) => setOffering((s) => toggle(s, v))}
            disabled={!businessCategory}
            placeholder={businessCategory ? "Select offerings" : "Select a business category first"}
          />

          <div className="field">
            <label htmlFor="edit-city">City</label>
            <input
              id="edit-city"
              list="city-options"
              maxLength={100}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Search your city"
            />
            <datalist id="city-options">
              {knownCities.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <MultiSelectDropdown label="Looking for" options={options.lookingFor} selected={lookingFor} onToggle={(v) => setLookingFor((s) => toggle(s, v))} />
          <MultiSelectDropdown label="Goals" options={options.goals} selected={goals} onToggle={(v) => setGoals((s) => toggle(s, v))} />

          <div className="field">
            <label htmlFor="edit-linkedin">LinkedIn URL</label>
            <input
              id="edit-linkedin"
              type="url"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/you"
            />
          </div>

          <div className="field">
            <label htmlFor="edit-website">Website link</label>
            <input
              id="edit-website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourwebsite.com"
            />
          </div>

          <div className="field">
            <label htmlFor="edit-bio">Bio</label>
            <textarea id="edit-bio" maxLength={200} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            <small className="person-line muted">{bio.length}/200</small>
          </div>
        </section>

        {error ? (
          <div className="banner warn app-banner">
            <div>
              <b>Check the form</b>
              {error}
            </div>
          </div>
        ) : null}

        <div className="profile-edit-actions">
          <button className="btn-secondary" type="button" onClick={handleAttemptClose}>
            Back
          </button>
          <button className="btn-primary" type="button" disabled={saving || isOffline || !isDirty} onClick={handleSave}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </section>

      <PoweredByFooter />
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="profile-readonly-card">
      <span className="profile-readonly-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

