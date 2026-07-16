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
        {loading && <div className="profile-skeleton" role="status">Loading profile…</div>}
        {!loading && error && !profile && <div className="directory-state"><h1>Can’t load profile</h1><p>Check your connection and try again.</p></div>}
        {profile && <ProfileContent profile={profile} />}
      </main>
    </AttendeePageShell>
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
        <a className="profile-action primary" href={`tel:${profile.phone}`}>Call</a>
        <a className="profile-action" href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`} target="_blank" rel="noreferrer">WhatsApp</a>
        {canShare && <button className="profile-action" type="button" onClick={() => navigator.share({ title: profile.name, text: `${profile.name} · ${profile.businessName ?? "Evento attendee"}` })}>Share</button>}
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
