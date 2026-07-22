"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendeePageShell } from "../../components/AttendeePageShell";
import { BookmarkButton } from "../../components/BookmarkButton";
import { ContactRows } from "../../components/ContactRows";
import { DirectoryAvatar } from "../../components/DirectoryAvatar";
import { SaveContactButton } from "../../components/SaveContactButton";
import { trackEvent } from "../../lib/gtag";
import { directoryCache, type AttendeeProfile } from "../../lib/directoryCache";
import { getCachedVenueConfig } from "../../lib/offlineQueue";

export default function AttendeeProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<AttendeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineResult, setOfflineResult] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const cached = directoryCache.getProfile(params.id);
    if (cached) {
      setProfile(cached);
      setOfflineResult(!navigator.onLine);
      setLoading(false);
    }

    fetch(`/api/attendees/${params.id}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("profile unavailable");
        const result = (await response.json()) as AttendeeProfile;
        directoryCache.setProfile(params.id, result);
        setProfile(result);
        trackEvent("profile_viewed", {
          feature: "attendee_profile",
          target_type: "attendee",
          success: true,
        });
        setOfflineResult(false);
        setError(false);
      })
      .catch(() => {
        if (!cached) setError(true);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AttendeePageShell>
      <main className="attendee-page profile-page attendee-profile-page">
        <div className="back-link-row">
          <span className="back-link-icon" aria-hidden="true">
            <BackArrowIcon />
          </span>
          <Link className="back-link" href="/directory">
            <span>Back to Directory</span>
          </Link>
        </div>
        {offlineResult && (
          <div className="banner info">
            <div>
              <b>Showing saved profile</b>
              You are offline. Details may be slightly out of date.
            </div>
          </div>
        )}
        {loading && <ProfileSkeleton />}
        {!loading && error && !profile && (
          <div className="directory-state">
            <h1>Can&apos;t load profile</h1>
            <p>Check your connection and try again.</p>
          </div>
        )}
        {profile && <ProfileContent profile={profile} />}
      </main>
    </AttendeePageShell>
  );
}

function ProfileSkeleton() {
  return (
    <div className="profile-skeleton" role="status" aria-label="Loading profile" aria-busy="true">
      <section className="profile-hero">
        <span className="skeleton-block profile-skeleton-avatar" />
        <div className="profile-skeleton-hero-lines">
          <span className="skeleton-block profile-skeleton-title" />
          <span className="skeleton-block profile-skeleton-line" />
          <span className="skeleton-block profile-skeleton-line short" />
        </div>
      </section>
      <div className="profile-actions">
        <span className="skeleton-block profile-skeleton-action" />
        <span className="skeleton-block profile-skeleton-action" />
        <span className="skeleton-block profile-skeleton-action" />
      </div>
      <div className="profile-details-grid">
        {[0, 1, 2].map((item) => (
          <section className="profile-section" key={item}>
            <span className="skeleton-block profile-skeleton-heading" />
            <span className="skeleton-block profile-skeleton-line" />
            <span className="skeleton-block profile-skeleton-line short" />
          </section>
        ))}
      </div>
    </div>
  );
}

function ProfileContent({ profile }: { profile: AttendeeProfile }) {
  const [canShare, setCanShare] = useState(false);
  const [eventName, setEventName] = useState<string | null>(null);
  const whatsappNumber = profile.phone.replace(/[^\d]/g, "");
  const hasMeta = [profile.businessCategory, profile.city, profile.chapterName].filter(Boolean).length > 0;
  const hasNetworkingInfo =
    profile.goals.length > 0 || profile.lookingFor.length > 0 || profile.offering.length > 0;
  const whatsappText = encodeURIComponent(
    eventName ? `Hi ${profile.name}, we met at the ${eventName}.` : `Hi ${profile.name}, we met at the event.`,
  );

  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  useEffect(() => {
    getCachedVenueConfig().then((cached) => {
      if (cached?.name) setEventName(cached.name);
    });
    fetch("/api/event")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { name?: string } | null) => {
        if (data?.name) setEventName(data.name);
      })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <section className="profile-hero">
        <DirectoryAvatar name={profile.name} photoUrl={profile.photoUrl} large />
        <div>
          <div className="profile-name-line">
            <h1>{profile.name}</h1>
            {profile.checkedIn && <span className="badge badge-success">Checked in</span>}
          </div>
          {profile.businessName && <p className="profile-company">{profile.businessName}</p>}
          {hasMeta ? (
            <p className="profile-meta">
              {[profile.businessCategory, profile.city, profile.chapterName].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {profile.tableNumber && <span className="table-chip">Table {profile.tableNumber}</span>}
        </div>
      </section>

      <div className="profile-actions">
        {profile.met ? (
          <div className="profile-action already-met" aria-label="Already met">
            <CheckIcon />
            <span>Already met</span>
          </div>
        ) : (
          <BookmarkButton
            attendeeId={profile.id}
            initialBookmarked={Boolean(profile.bookmarked)}
            onChange={(bookmarked) => directoryCache.setProfile(profile.id, { ...profile, bookmarked })}
          />
        )}
        <a
          className="profile-action icon-only call"
          href={`tel:${profile.phone}`}
          aria-label={`Call ${profile.name}`}
          title="Call"
        >
          <PhoneIcon />
          <span className="sr-only">Call</span>
        </a>
        <a
          className="profile-action icon-only whatsapp"
          href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`WhatsApp ${profile.name}`}
          title="WhatsApp"
        >
          <WhatsAppIcon />
          <span className="sr-only">WhatsApp</span>
        </a>
        {profile.linkedInUrl && (
          <a
            className="profile-action icon-only linkedin"
            href={profile.linkedInUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${profile.name} on LinkedIn`}
            title="LinkedIn"
          >
            <LinkedInIcon />
            <span className="sr-only">LinkedIn</span>
          </a>
        )}
        {profile.websiteUrl && (
          <a
            className="profile-action icon-only website"
            href={profile.websiteUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`${profile.name} website`}
            title="Website"
          >
            <WebsiteIcon />
            <span className="sr-only">Website</span>
          </a>
        )}
        {canShare && (
          <button
            className="profile-action icon-only share"
            type="button"
            aria-label={`Share ${profile.name}`}
            title="Share"
            onClick={() =>
              navigator.share({
                title: profile.name,
                text: `${profile.name} · ${profile.businessName ?? "Evento attendee"}`,
              })
            }
          >
            <ShareIcon />
            <span className="sr-only">Share</span>
          </button>
        )}
      </div>

      {profile.match && (
        <section className="match-reason" aria-label="Why you're a match">
          <p className="match-reason-eyebrow">Why you&apos;re a match</p>
          <p className="match-reason-headline">{profile.match.headline}</p>
          {profile.match.reasons.length > 1 && (
            <ul className="match-reason-list">
              {profile.match.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {profile.bio && (
        <ProfileSection title="About">
          <p className="profile-bio">{profile.bio}</p>
        </ProfileSection>
      )}
      <div className="profile-details-grid">
        <ProfileSection title="Contact">
          <ContactRows phone={profile.phone} email={profile.email} tableNumber={profile.tableNumber} showChevron />
          {profile.websiteUrl ? (
            <a className="profile-link-row" href={profile.websiteUrl} target="_blank" rel="noreferrer">
              <WebsiteIcon />
              <span>{profile.websiteUrl}</span>
            </a>
          ) : null}
          <SaveContactButton
            contact={{
              name: profile.name,
              phone: profile.phone,
              email: profile.email,
              company: profile.businessName,
              note: "Connected through Evento",
            }}
          />
        </ProfileSection>
        {hasNetworkingInfo ? (
          <ProfileSection title="Networking profile">
            {profile.lookingFor.length > 0 ? <TagGroup title="Looking for" values={profile.lookingFor} /> : null}
            {profile.offering.length > 0 ? <TagGroup title="Offering" values={profile.offering} /> : null}
            {profile.goals.length > 0 ? <TagGroup title="Networking goals" values={profile.goals} /> : null}
          </ProfileSection>
        ) : null}
      </div>
    </>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="profile-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function TagGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="profile-tag-group">
      <h3>{title}</h3>
      <div className="profile-tags">
        {values.map((value) => (
          <span key={`${title}-${value}`}>{value}</span>
        ))}
      </div>
    </div>
  );
}

function PhoneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path opacity="0.1" d="M3 6.5C3 14.5081 9.49187 21 17.5 21C18.166 21 18.8216 20.9551 19.4637 20.8682C20.3747 20.7448 21 19.9292 21 19.01V16.4415C21 15.5807 20.4491 14.8164 19.6325 14.5442L16.4841 13.4947C15.6836 13.2279 14.8252 13.699 14.6206 14.5177C14.3475 15.6102 12.987 15.987 12.1907 15.1907L8.80926 11.8093C8.01301 11.013 8.38984 9.65254 9.48229 9.37943C10.301 9.17476 10.7721 8.31644 10.5053 7.51586L9.45585 4.36754C9.18362 3.55086 8.41934 3 7.55848 3H4.99004C4.0708 3 3.25518 3.62533 3.13185 4.53627C3.0449 5.17845 3 5.83398 3 6.5Z" fill="currentColor" /><path d="M3 6.5C3 14.5081 9.49187 21 17.5 21C18.166 21 18.8216 20.9551 19.4637 20.8682C20.3747 20.7448 21 19.9292 21 19.01V16.4415C21 15.5807 20.4491 14.8164 19.6325 14.5442L16.4841 13.4947C15.6836 13.2279 14.8252 13.699 14.6206 14.5177C14.3475 15.6102 12.987 15.987 12.1907 15.1907L8.80926 11.8093C8.01301 11.013 8.38984 9.65254 9.48229 9.37943C10.301 9.17476 10.7721 8.31644 10.5053 7.51586L9.45585 4.36754C9.18362 3.55086 8.41934 3 7.55848 3H4.99004C4.0708 3 3.25518 3.62533 3.13185 4.53627C3.0449 5.17845 3 5.83398 3 6.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7" /></svg>;
}

function WhatsAppIcon() {
  return <svg className="brand-glyph" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M26.576 5.363c-2.69-2.69-6.406-4.354-10.511-4.354-8.209 0-14.865 6.655-14.865 14.865 0 2.732 0.737 5.291 2.022 7.491l-0.038-0.070-2.109 7.702 7.879-2.067c2.051 1.139 4.498 1.809 7.102 1.809h0.006c8.209-0.003 14.862-6.659 14.862-14.868 0-4.103-1.662-7.817-4.349-10.507l0 0zM16.062 28.228h-0.005c-0 0-0.001 0-0.001 0-2.319 0-4.489-0.64-6.342-1.753l0.056 0.031-0.451-0.267-4.675 1.227 1.247-4.559-0.294-0.467c-1.185-1.862-1.889-4.131-1.889-6.565 0-6.822 5.531-12.353 12.353-12.353s12.353 5.531 12.353 12.353c0 6.822-5.53 12.353-12.353 12.353h-0zM22.838 18.977c-0.371-0.186-2.197-1.083-2.537-1.208-0.341-0.124-0.589-0.185-0.837 0.187-0.246 0.371-0.958 1.207-1.175 1.455-0.216 0.249-0.434 0.279-0.805 0.094-1.15-0.466-2.138-1.087-2.997-1.852l0.010 0.009c-0.799-0.74-1.484-1.587-2.037-2.521l-0.028-0.052c-0.216-0.371-0.023-0.572 0.162-0.757 0.167-0.166 0.372-0.434 0.557-0.65 0.146-0.179 0.271-0.384 0.366-0.604l0.006-0.017c0.043-0.087 0.068-0.188 0.068-0.296 0-0.131-0.037-0.253-0.101-0.357l0.002 0.003c-0.094-0.186-0.836-2.014-1.145-2.758-0.302-0.724-0.609-0.625-0.836-0.637-0.216-0.010-0.464-0.012-0.712-0.012-0.395 0.010-0.746 0.188-0.988 0.463l-0.001 0.002c-0.802 0.761-1.3 1.834-1.3 3.023 0 0.026 0 0.053 0.001 0.079l-0-0.004c0.131 1.467 0.681 2.784 1.527 3.857l-0.012-0.015c1.604 2.379 3.742 4.282 6.251 5.564l0.094 0.043c0.548 0.248 1.25 0.513 1.968 0.74l0.149 0.041c0.442 0.14 0.951 0.221 1.479 0.221 0.303 0 0.601-0.027 0.889-0.078l-0.031 0.004c1.069-0.223 1.956-0.868 2.497-1.749l0.009-0.017c0.165-0.366 0.261-0.793 0.261-1.242 0-0.185-0.016-0.366-0.047-0.542l0.003 0.019c-0.092-0.155-0.34-0.247-0.712-0.434z" /></svg>;
}

function WebsiteIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" /></svg>;
}

function LinkedInIcon() {
  return <svg className="brand-glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.5h4v11H3v-11Zm6 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95C20.3 9.05 21 11 21 14.1v6.4h-4v-5.7c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8H9v-11Z" /></svg>;
}

function ShareIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="M8 11l7-4M8 13l7 4" /></svg>;
}

function BackArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
