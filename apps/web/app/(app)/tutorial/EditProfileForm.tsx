"use client";
import { withCsrfHeaders } from "../../lib/csrf";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { AttendeeMe } from "./TutorialPage";
import { TEMP_BYPASS_LOGIN } from "./TutorialPage";
import { PoweredByFooter } from "./PoweredByFooter";
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
  offering: string[];
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
  offering: ["Wholesale", "Logistics", "Consulting", "Manufacturing", "Retail space", "Financing"],
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

export function EditProfileForm({
  attendee,
  onSaved,
  onClose,
}: {
  attendee: AttendeeMe;
  onSaved: (patch: Partial<AttendeeMe>) => void;
  onClose: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<ProfileOptions>(DEMO_OPTIONS);
  const [isOffline, setIsOffline] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(attendee.photoUrl ?? null);
  const [businessCategory, setBusinessCategory] = useState(attendee.businessCategory ?? "");
  const [city, setCity] = useState(attendee.city ?? "");
  const [lookingFor, setLookingFor] = useState<string[]>(attendee.lookingFor ?? []);
  const [offering, setOffering] = useState<string[]>(attendee.offering ?? []);
  const [goals, setGoals] = useState<string[]>(attendee.goals ?? []);
  const [bio, setBio] = useState(attendee.bio ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(attendee.linkedInUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readOnlyHint, setReadOnlyHint] = useState<string | null>(null);

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
    if (TEMP_BYPASS_LOGIN) return;
    fetch("/api/attendees/profile-options", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setOptions({
            businessCategories: data.businessCategories ?? [],
            cities: data.cities ?? [],
            lookingFor: data.lookingFor ?? [],
            offering: data.offering ?? [],
            goals: data.goals ?? [],
          });
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const knownCities = useMemo(() => {
    const values = new Set(options.cities.map((option) => option.value));
    if (attendee.city) values.add(attendee.city);
    return [...values];
  }, [attendee.city, options.cities]);

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        businessCategory: attendee.businessCategory ?? "",
        city: attendee.city ?? "",
        lookingFor: attendee.lookingFor ?? [],
        offering: attendee.offering ?? [],
        goals: attendee.goals ?? [],
        bio: attendee.bio ?? "",
        linkedInUrl: attendee.linkedInUrl ?? "",
        photoUrl: attendee.photoUrl ?? null,
      }),
    [attendee],
  );

  const currentSnapshot = JSON.stringify({
    businessCategory,
    city,
    lookingFor,
    offering,
    goals,
    bio,
    linkedInUrl,
    photoUrl: photoPreview,
  });
  const isDirty = initialSnapshot !== currentSnapshot;

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (photoPreview && photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : attendee.photoUrl ?? null);
  }

  function handleAttemptClose() {
    if (isDirty && typeof window !== "undefined" && !window.confirm("Discard your profile changes?")) {
      return;
    }
    onClose();
  }

  async function handleSave() {
    setError(null);
    setReadOnlyHint(null);

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

    if (TEMP_BYPASS_LOGIN) {
      onSaved({
        businessCategory,
        city: city.trim(),
        lookingFor,
        offering,
        goals,
        bio: bio.trim() || null,
        linkedInUrl: linkedInUrl.trim() || null,
        photoUrl: photoPreview,
      });
      onClose();
      return;
    }

    setSaving(true);
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
          bio: bio.trim() || undefined,
          linkedInUrl: linkedInUrl.trim() || undefined,
        }),
      }));
      if (!res.ok) {
        setError("Couldn't save your profile. Please try again.");
        return;
      }

      let photoUrl = attendee.photoUrl ?? null;
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        const photoRes = await fetch("/api/attendees/me/photo", withCsrfHeaders({
          method: "POST",
          credentials: "include",
          body: formData,
        }));
        if (!photoRes.ok) {
          setError("Your profile saved, but the photo upload failed. Try the photo again.");
          onSaved({
            businessCategory,
            city: city.trim(),
            lookingFor,
            offering,
            goals,
            bio: bio.trim() || null,
            linkedInUrl: linkedInUrl.trim() || null,
          });
          return;
        }
        const body = await photoRes.json();
        photoUrl = body.photoUrl ?? photoUrl;
      } else if (!photoPreview && attendee.photoUrl) {
        const removeRes = await fetch("/api/attendees/me/photo/remove", withCsrfHeaders({
          method: "PATCH",
          credentials: "include",
        }));
        if (!removeRes.ok) {
          setError("Your profile saved, but the photo could not be removed. Try again.");
          onSaved({
            businessCategory,
            city: city.trim(),
            lookingFor,
            offering,
            goals,
            bio: bio.trim() || null,
            linkedInUrl: linkedInUrl.trim() || null,
          });
          return;
        }
        photoUrl = null;
      }

      onSaved({
        businessCategory,
        city: city.trim(),
        lookingFor,
        offering,
        goals,
        bio: bio.trim() || null,
        linkedInUrl: linkedInUrl.trim() || null,
        photoUrl,
      });
      onClose();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-content">
      <section className="settings-card profile-edit-shell">
        <div className="profile-edit-header">
          <div>
            <p className="photo-modal-eyebrow">Edit profile</p>
            <h1 className="settings-title">Update your attendee card</h1>
            <p className="settings-copy">Change the fields you set during onboarding. Registered details stay organizer-controlled.</p>
          </div>
          <button className="btn-secondary profile-edit-close" type="button" onClick={handleAttemptClose}>
            Cancel
          </button>
        </div>

        {isOffline ? (
          <div className="banner warn app-banner">
            <div>
              <b>Offline</b>
              You&apos;re offline — reconnect to save changes.
            </div>
          </div>
        ) : null}

        <div className="field profile-edit-photo-field">
          <label htmlFor="edit-photo">Photo</label>
          <label htmlFor="edit-photo" className="profile-edit-photo-picker" aria-label="Change profile photo">
            {photoPreview && (
              <img src={photoPreview} alt="Profile preview" />
            )}
            <span className="profile-edit-photo-badge" aria-hidden="true">
              +
            </span>
          </label>
          <input
            id="edit-photo"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="sr-only"
          />
        </div>

        <section className="profile-edit-readonly">
          <h2 className="profile-edit-section-title">Registered details</h2>
          <p className="settings-copy">These are controlled by the event organizer.</p>
          <div className="profile-readonly-grid">
            <ReadOnlyField label="Name" value={readOnlyValue(attendee.name)} onTap={() => setReadOnlyHint("Contact the event organizer to change your registered details.")} />
            <ReadOnlyField label="Company" value={readOnlyValue(attendee.businessName)} onTap={() => setReadOnlyHint("Contact the event organizer to change your registered details.")} />
            <ReadOnlyField label="Phone" value={readOnlyValue(attendee.phone)} onTap={() => setReadOnlyHint("Contact the event organizer to change your registered details.")} />
            <ReadOnlyField label="Email" value={readOnlyValue(attendee.email)} onTap={() => setReadOnlyHint("Contact the event organizer to change your registered details.")} />
            <ReadOnlyField label="Chapter" value={readOnlyValue(attendee.chapterName)} onTap={() => setReadOnlyHint("Contact the event organizer to change your registered details.")} />
            <ReadOnlyField label="Table number" value={readOnlyValue(attendee.tableNumber)} onTap={() => setReadOnlyHint("Contact the event organizer to change your registered details.")} />
          </div>
          {readOnlyHint ? <p className="profile-readonly-hint">{readOnlyHint}</p> : null}
        </section>

        <section className="profile-edit-section">
          <h2 className="profile-edit-section-title">Card details</h2>

          <SingleSelectDropdown
            id="edit-category"
            label="Business category"
            options={options.businessCategories}
            value={businessCategory}
            placeholder="Select your category"
            onChange={setBusinessCategory}
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

          <ChipField label="Looking for" options={options.lookingFor} selected={lookingFor} onToggle={(v) => setLookingFor((s) => toggle(s, v))} />
          <ChipField label="Offering" options={options.offering} selected={offering} onToggle={(v) => setOffering((s) => toggle(s, v))} />
          <ChipField label="Goals" options={options.goals} selected={goals} onToggle={(v) => setGoals((s) => toggle(s, v))} />

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

function ReadOnlyField({ label, value, onTap }: { label: string; value: string; onTap: () => void }) {
  return (
    <button type="button" className="profile-readonly-card" onClick={onTap}>
      <span className="profile-readonly-label">{label}</span>
      <strong>{value}</strong>
      <small>Contact the event organizer to change this</small>
    </button>
  );
}

function ChipField({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="chip-row">
        {options.map((opt) => (
          <button key={opt} type="button" className={`chip${selected.includes(opt) ? " on" : ""}`} onClick={() => onToggle(opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
