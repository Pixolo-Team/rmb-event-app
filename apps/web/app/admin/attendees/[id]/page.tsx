"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ContactRows } from "../../../components/ContactRows";
import { DirectoryAvatar } from "../../../components/DirectoryAvatar";

type AdminAttendeeProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string | null;
  businessCategory: string | null;
  city: string | null;
  tableNumber: string | null;
  photoUrl: string | null;
  chapterName: string | null;
  lookingFor: string[];
  offering: string[];
  goals: string[];
  bio: string | null;
  linkedInUrl: string | null;
  websiteUrl: string | null;
  profileCompletedAt: string | null;
  deletedAt: string | null;
  checkedInAt: string | null;
  checkInMethod: "GEOLOCATION" | "MANUAL" | "STAFF_QR" | "VENUE_QR" | null;
};

export default function AdminAttendeeProfilePage({ params }: { params: { id: string } }) {
  const [profile, setProfile] = useState<AdminAttendeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/attendees/manage/${params.id}`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("profile unavailable");
        setProfile((await response.json()) as AdminAttendeeProfile);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <main className="admin-page admin-overview admin-attendee-profile-page">
      <Link className="back-link" href="/admin/attendees">
        <BackArrowIcon />
        <span>Back to attendees</span>
      </Link>

      {loading && (
        <div className="directory-state">
          <h2>Loading profile</h2>
          <p>The attendee profile will appear here in a moment.</p>
        </div>
      )}

      {!loading && error && !profile && (
        <div className="directory-state">
          <h2>Can&apos;t load profile</h2>
          <p>Refresh the page to try again.</p>
        </div>
      )}

      {profile && <ProfileContent profile={profile} />}
    </main>
  );
}

function ProfileContent({ profile }: { profile: AdminAttendeeProfile }) {
  const statusDetails = compactDetails([
    profile.profileCompletedAt ? `Profile completed ${formatDate(profile.profileCompletedAt)}` : "Profile pending",
    profile.checkedInAt ? `Checked in ${formatDate(profile.checkedInAt)}` : "Not checked in",
    profile.deletedAt ? `Deleted ${formatDate(profile.deletedAt)}` : null,
  ]);
  const status = profile.deletedAt
    ? { label: "Deleted", className: "badge-danger" }
    : profile.checkedInAt
      ? { label: "Present", className: "badge-success" }
      : !profile.profileCompletedAt
        ? { label: "Onboarding pending", className: "badge-warning" }
        : { label: "Active", className: "badge-neutral" };

  return (
    <>
      <section className="profile-hero admin-attendee-profile-hero">
        <DirectoryAvatar name={profile.name} photoUrl={profile.photoUrl} large />
        <div>
          <div className="profile-name-line">
            <h1>{profile.name}</h1>
            <span className={`badge ${status.className}`}>{status.label}</span>
          </div>
          {profile.businessName && <p className="profile-company">{profile.businessName}</p>}
          <p className="profile-meta">{compactDetails([profile.businessCategory, profile.city, profile.chapterName])}</p>
          {profile.tableNumber && <span className="table-chip">Table {profile.tableNumber}</span>}
          <p className="admin-attendee-profile-status">{statusDetails}</p>
        </div>
      </section>

      {profile.bio && <ProfileSection title="About"><p className="profile-bio">{profile.bio}</p></ProfileSection>}

      <div className="profile-details-grid">
        <ProfileSection title="Contact">
          <ContactRows phone={profile.phone} email={profile.email} tableNumber={profile.tableNumber} />
          {profile.linkedInUrl ? <ExternalLink href={profile.linkedInUrl} label="LinkedIn" /> : null}
          {profile.websiteUrl ? <ExternalLink href={profile.websiteUrl} label="Website" /> : null}
        </ProfileSection>
        <ProfileSection title="Networking goals"><TagList values={profile.goals} empty="No goals added yet" /></ProfileSection>
        <ProfileSection title="Looking for"><TagList values={profile.lookingFor} empty="Not specified" /></ProfileSection>
        <ProfileSection title="Offering"><TagList values={profile.offering} empty="Not specified" /></ProfileSection>
      </div>
    </>
  );
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="profile-section"><h2>{title}</h2>{children}</section>;
}

function TagList({ values, empty }: { values: string[]; empty: string }) {
  return values.length ? <div className="profile-tags">{values.map((value) => <span key={value}>{value}</span>)}</div> : <p className="empty-copy">{empty}</p>;
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return <a className="profile-link-row" href={href} target="_blank" rel="noreferrer"><span>{label}</span><small>{href}</small></a>;
}

function compactDetails(values: Array<string | null>) {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" · ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function BackArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6 9 12l6 6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
