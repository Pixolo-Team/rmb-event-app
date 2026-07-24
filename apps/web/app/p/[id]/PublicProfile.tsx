"use client";

import { useEffect, useState } from "react";
import { SaveContactButton } from "../../components/SaveContactButton";

type PublicProfileData = {
  id: string;
  name: string;
  businessName: string | null;
  chapterName: string | null;
  city: string | null;
  businessCategory: string | null;
  bio: string | null;
  phone: string;
  email: string;
  photoUrl: string | null;
  linkedInUrl: string | null;
  websiteUrl?: string | null;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "EV";
}

export function PublicProfile({ id }: { id: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [profile, setProfile] = useState<PublicProfileData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/attendees/public/${id}`);
        if (!res.ok) {
          if (!cancelled) setState("error");
          return;
        }
        const data = (await res.json()) as PublicProfileData;
        if (cancelled) return;
        setProfile(data);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <div className="screen app-shell-screen">
        <div className="card">
          <div className="wordmark">
            <span className="dot" />
            Evento
          </div>
          <div className="center-state">
            <span className="spinner" style={{ borderTopColor: "var(--brand-500)", borderColor: "var(--border)" }} />
            <p>Loading profile&hellip;</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "error" || !profile) {
    return (
      <div className="screen app-shell-screen">
        <div className="card">
          <div className="wordmark">
            <span className="dot" />
            Evento
          </div>
          <div className="center-state">
            <div className="ring warn">!</div>
            <h2>Profile unavailable</h2>
            <p>This profile link is invalid or has expired.</p>
          </div>
        </div>
      </div>
    );
  }

  const tags = [profile.businessCategory, profile.city, profile.chapterName].filter(Boolean);

  return (
    <div className="screen app-shell-screen public-profile-screen">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="public-profile-logo" src="/images/rotary-rmb-lockup.jpg" alt="Rotary Means Business Fellowship" />

      <div className="card public-profile-card">
        <div className="public-profile-hero">
          <div className="public-profile-avatar" aria-hidden="true">
            {profile.photoUrl ? <img src={profile.photoUrl} alt="" /> : getInitials(profile.name)}
          </div>
          <h1 className="public-profile-name">{profile.name}</h1>
          {profile.businessName ? <p className="public-profile-company">{profile.businessName}</p> : null}
        </div>

        {tags.length > 0 ? (
          <div className="chip-row" style={{ marginTop: 14, justifyContent: "center" }}>
            {tags.map((tag) => (
              <span key={tag} className="chip static">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {profile.bio ? <p className="person-bio" style={{ marginTop: 14, textAlign: "center" }}>{profile.bio}</p> : null}

        <div className="public-profile-actions">
          <SaveContactButton
            contact={{
              name: profile.name,
              phone: profile.phone,
              email: profile.email,
              company: profile.businessName,
              note: "Connected through Evento",
            }}
          />
          <a className="btn-primary" href={`tel:${profile.phone}`} style={{ marginTop: 0 }}>
            Call {profile.phone}
          </a>
          <a className="btn-secondary" href={`mailto:${profile.email}`}>
            Email {profile.email}
          </a>
          {profile.websiteUrl ? (
            <a className="btn-secondary" href={profile.websiteUrl} target="_blank" rel="noopener noreferrer">
              Visit Website
            </a>
          ) : null}
          {profile.linkedInUrl ? (
            <a className="btn-secondary" href={profile.linkedInUrl} target="_blank" rel="noopener noreferrer">
              View LinkedIn
            </a>
          ) : null}
        </div>

        <p className="public-profile-footer">Shared via Evento</p>
      </div>
    </div>
  );
}
