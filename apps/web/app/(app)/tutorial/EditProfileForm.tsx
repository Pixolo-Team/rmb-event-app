"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { AttendeeMe } from "./TutorialPage";
import { TEMP_BYPASS_LOGIN } from "./TutorialPage";

type ProfileOptions = {
  businessCategories: string[];
  lookingFor: string[];
  offering: string[];
  goals: string[];
};

const DEMO_OPTIONS: ProfileOptions = {
  businessCategories: ["Manufacturer", "Trader/Distributor", "Service Provider", "Retailer", "Consultant"],
  lookingFor: ["Distributors", "Suppliers", "Clients", "Investors", "Partners", "Mentors"],
  offering: ["Wholesale", "Logistics", "Consulting", "Manufacturing", "Retail space", "Financing"],
  goals: ["Grow network", "Find partners", "Generate leads", "Learn", "Hire"],
};

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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

  useEffect(() => {
    if (TEMP_BYPASS_LOGIN) return;
    fetch("/api/attendees/profile-options")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOptions(data);
      })
      .catch(() => undefined);
  }, []);

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (photoPreview && photoFile) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : attendee.photoUrl ?? null);
  }

  async function handleSave() {
    setError(null);
    if (!businessCategory) {
      setError("Choose your business category.");
      return;
    }
    if (!city.trim()) {
      setError("Enter your city.");
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
      const res = await fetch("/api/attendees/me/profile", {
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
      });
      if (!res.ok) {
        setError("Couldn't save your profile. Please try again.");
        return;
      }

      let photoUrl = attendee.photoUrl ?? null;
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        const photoRes = await fetch("/api/attendees/me/photo", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (photoRes.ok) {
          const body = await photoRes.json();
          photoUrl = body.photoUrl ?? photoUrl;
        }
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
    <div className="photo-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="photo-modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="icon-action" type="button" onClick={onClose} style={{ marginBottom: 12 }}>
          Close
        </button>

        <h1 className="settings-title">Edit profile</h1>
        <p className="settings-copy">Update your card and photo.</p>

        <div className="field" style={{ marginTop: 16 }}>
          <label htmlFor="edit-photo">Photo</label>
          <label htmlFor="edit-photo" className="photo-picker photo-picker-round">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile preview" />
            ) : (
              <span className="photo-picker-placeholder">
                <span className="photo-picker-icon" aria-hidden="true">
                  +
                </span>
                Add photo
              </span>
            )}
          </label>
          <input
            id="edit-photo"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="visually-hidden"
          />
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="edit-category">Business category</label>
          <select id="edit-category" value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)}>
            <option value="">Select your category</option>
            {options.businessCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="edit-city">City</label>
          <input id="edit-city" maxLength={100} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Ahmedabad" />
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
          <textarea id="edit-bio" maxLength={200} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          <small className="person-line muted">{bio.length}/200</small>
        </div>

        {error ? (
          <div className="banner warn app-banner" style={{ marginTop: 4 }}>
            <div>
              <b>Check the form</b>
              {error}
            </div>
          </div>
        ) : null}

        <button className="btn-primary" type="button" disabled={saving} onClick={handleSave} style={{ marginTop: 8 }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
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
