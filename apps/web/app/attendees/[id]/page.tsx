"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendeePageShell } from "../../components/AttendeePageShell";
import { DirectoryAvatar } from "../../components/DirectoryAvatar";
import { ContactRows } from "../../components/ContactRows";
import { directoryCache, type AttendeeProfile } from "../../lib/directoryCache";
import { SaveContactButton } from "../../components/SaveContactButton";
import { BookmarkButton } from "../../components/BookmarkButton";

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
        setOfflineResult(false);
        setError(false);
      })
      .catch(() => { if (!cached) setError(true); })
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AttendeePageShell>
      <main className="attendee-page profile-page">
        <Link className="back-link" href="/directory">← Back to directory</Link>
        {offlineResult && <div className="banner info"><div><b>Showing saved profile</b>You’re offline. Details may be slightly out of date.</div></div>}
        {loading && <ProfileSkeleton />}
        {!loading && error && !profile && <div className="directory-state"><h1>Can’t load profile</h1><p>Check your connection and try again.</p></div>}
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
        {[0, 1, 2, 3].map((item) => (
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
  const whatsappNumber = profile.phone.replace(/[^\d]/g, "");
  const whatsappText = encodeURIComponent(`Hi ${profile.name}, we connected through Evento.`);

  useEffect(() => setCanShare(typeof navigator.share === "function"), []);

  return (
    <>
      <section className="profile-hero">
        <DirectoryAvatar name={profile.name} photoUrl={profile.photoUrl} large />
        <div>
          <div className="profile-name-line"><h1>{profile.name}</h1>{profile.checkedIn && <span className="badge badge-success">Checked in</span>}</div>
          {profile.businessName && <p className="profile-company">{profile.businessName}</p>}
          <p className="profile-meta">{[profile.businessCategory, profile.city, profile.chapterName].filter(Boolean).join(" · ")}</p>
          {profile.tableNumber && <span className="table-chip">Table {profile.tableNumber}</span>}
        </div>
      </section>

      <div className="profile-actions">
        <BookmarkButton attendeeId={profile.id} initialBookmarked={Boolean(profile.bookmarked)} onChange={(bookmarked) => directoryCache.setProfile(profile.id, { ...profile, bookmarked })} />
        <a className="profile-action call" href={`tel:${profile.phone}`}><PhoneIcon /><span>Call</span></a>
        <a className="profile-action whatsapp" href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`} target="_blank" rel="noreferrer"><WhatsAppIcon /><span>WhatsApp</span></a>
        {canShare && <button className="profile-action share" type="button" onClick={() => navigator.share({ title: profile.name, text: `${profile.name} · ${profile.businessName ?? "Evento attendee"}` })}><ShareIcon /><span>Share</span></button>}
      </div>

      {profile.match && (
        <section className="match-reason" aria-label="Why you're a match">
          <p className="match-reason-eyebrow">Why you’re a match</p>
          <p className="match-reason-headline">{profile.match.headline}</p>
          {profile.match.reasons.length > 1 && (
            <ul className="match-reason-list">
              {profile.match.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          )}
        </section>
      )}

      {profile.bio && <ProfileSection title="About"><p className="profile-bio">{profile.bio}</p></ProfileSection>}
      <div className="profile-details-grid">
        <ProfileSection title="Contact"><ContactRows phone={profile.phone} email={profile.email} tableNumber={profile.tableNumber} /><SaveContactButton contact={{ name: profile.name, phone: profile.phone, email: profile.email, company: profile.businessName, note: "Connected through Evento" }} /></ProfileSection>
        <ProfileSection title="Networking goals"><TagList values={profile.goals} empty="No goals added yet" /></ProfileSection>
        <ProfileSection title="Looking for"><TagList values={profile.lookingFor} empty="Not specified" /></ProfileSection>
        <ProfileSection title="Offering"><TagList values={profile.offering} empty="Not specified" /></ProfileSection>
      </div>
    </>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="profile-section"><h2>{title}</h2>{children}</section>; }
function TagList({ values, empty }: { values: string[]; empty: string }) { return values.length ? <div className="profile-tags">{values.map((value) => <span key={value}>{value}</span>)}</div> : <p className="empty-copy">{empty}</p>; }

function PhoneIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 3.5h3l1.5 4.5-2 1.4a12 12 0 0 0 5.1 5.1l1.4-2 4.5 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" /></svg>; }
function WhatsAppIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 19.5l1.1-4A8 8 0 1 1 20 11.5Z" /><path d="M8.9 8.2c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2 0 .4 0 .5l-.4.5c-.1.2-.3.3-.1.6a5.6 5.6 0 0 0 2.6 2.3c.3.1.4 0 .6-.1l.5-.6c.2-.2.3-.1.5-.1l1.5.8c.2.1.4.2.4.3v.6c-.1.5-.8 1-1.3 1.1-.4.1-1 .1-3-.8a8.4 8.4 0 0 1-3.4-3.3c-.3-.6-.7-1.4-.7-2.2 0-.5.2-.9.4-1.1Z" fill="currentColor" stroke="none" /></svg>; }
function ShareIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.2" /><circle cx="17" cy="6" r="2.2" /><circle cx="17" cy="18" r="2.2" /><path d="M8 11l7-4M8 13l7 4" /></svg>; }
