"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { ContactRows } from "../components/ContactRows";
import { PersonalStats } from "../components/PersonalStats";
import { PhotoUploadModal } from "../components/PhotoUploadModal";
import { profileCache, type MyProfile } from "../lib/profileCache";
import { ProfileSkeleton } from "./ProfileSkeleton";

export default function ProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);
  const [offline, setOffline] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/attendees/me/photo", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json() as { status: string; photoUrl: string };
      setProfile((prev) => (prev ? { ...prev, photoUrl: data.photoUrl } : null));
      profileCache.set({
        ...profile!,
        photoUrl: data.photoUrl,
      });
    } catch (error) {
      console.error("Photo upload error:", error);
      throw error;
    } finally {
      setPhotoUploading(false);
    }
  };

  // Cache-first so the screen (and QR) appear instantly and work offline, then
  // refresh from the network when reachable.
  useEffect(() => {
    const cached = profileCache.get();
    if (cached) {
      setProfile(cached);
      setOffline(!navigator.onLine);
    }
    fetch("/api/attendees/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("unavailable");
        const me = (await res.json()) as MyProfile;
        profileCache.set(me);
        setProfile(me);
        setOffline(false);
      })
      .catch(() => setOffline(!navigator.onLine));
  }, []);

  // Generate the QR image entirely client-side from the signed token — no
  // network call, so it renders offline (PRD US4.1A).
  useEffect(() => {
    if (!profile?.qrToken) return;
    QRCode.toDataURL(profile.qrToken, { margin: 1, width: 512, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [profile?.qrToken]);

  // "Show My QR" from the menu deep-links here with ?qr=1 to open the enlarged
  // view directly, without hunting through the screen.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("qr") === "1") setEnlarged(true);
  }, []);

  useEffect(() => {
    if (!enlarged) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEnlarged(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enlarged]);

  return (
    <AttendeePageShell>
      <main className="attendee-page profile-page">
        {!profile ? (
          <ProfileSkeleton />
        ) : (
          <>
            {offline && (
              <div className="banner info">
                <div><b>Offline</b>Showing your saved profile. Your QR still works.</div>
              </div>
            )}

            <section className="qr-card">
              <p className="qr-eyebrow">Your business card</p>
              <div className="qr-card-container">
                <div className="qr-with-photo">
                  {profile.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.photoUrl} alt={profile.name} className="profile-photo" />
                  )}
                  {!profile.photoUrl && <div className="profile-photo-placeholder">{getInitials(profile.name)}</div>}
                  <button
                    className="photo-add-button"
                    type="button"
                    onClick={() => setPhotoModalOpen(true)}
                    aria-label="Add or change photo"
                    title="Add or change photo"
                  >
                    +
                  </button>
                </div>
                {qrDataUrl ? (
                  <button className="qr-frame" type="button" onClick={() => setEnlarged(true)} aria-label="Enlarge your QR code">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Your personal QR code" />
                  </button>
                ) : (
                  <div className="qr-frame qr-frame-placeholder" role="status">Preparing your QR…</div>
                )}
              </div>
              <p className="qr-name">{profile.name}</p>
              {profile.businessName && <p className="qr-sub">{profile.businessName}</p>}
              <p className="qr-hint">Tap the code to enlarge it for scanning</p>
            </section>

            <PersonalStats />

            <div className="profile-details-grid">
              <ProfileSection title="Contact">
                <ContactRows phone={profile.phone} email={profile.email} tableNumber={profile.tableNumber} />
              </ProfileSection>
              <ProfileSection title="Business">
                <dl className="profile-contact">
                  {profile.businessCategory && <div><dt>Category</dt><dd>{profile.businessCategory}</dd></div>}
                  {profile.city && <div><dt>City</dt><dd>{profile.city}</dd></div>}
                  {profile.chapterName && <div><dt>Chapter</dt><dd>{profile.chapterName}</dd></div>}
                  {!profile.businessCategory && !profile.city && !profile.chapterName && (
                    <p className="empty-copy">No business details on file</p>
                  )}
                </dl>
              </ProfileSection>
            </div>

            {profile.bio && (
              <ProfileSection title="About"><p className="profile-bio">{profile.bio}</p></ProfileSection>
            )}
            <ProfileSection title="Looking for"><TagList values={profile.lookingFor} empty="Not specified" /></ProfileSection>
            <ProfileSection title="Offering"><TagList values={profile.offering} empty="Not specified" /></ProfileSection>
            <ProfileSection title="Networking goals"><TagList values={profile.goals} empty="No goals added yet" /></ProfileSection>

            <p className="profile-readonly-note">
              Registered details are read-only. Contact the event organizer to change your name, phone, or email.
            </p>
          </>
        )}
      </main>

      {enlarged && qrDataUrl && profile && (
        <div className="qr-fullscreen" role="dialog" aria-modal="true" aria-label="Your QR code" onClick={() => setEnlarged(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="Your personal QR code, enlarged" />
          <p className="qr-fullscreen-name">{profile.name}</p>
          <button className="qr-fullscreen-close" type="button" aria-label="Close">Tap anywhere to close</button>
        </div>
      )}

      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onPhotoUpload={handlePhotoUpload}
        isLoading={photoUploading}
      />
    </AttendeePageShell>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "EV";
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="profile-section"><h2>{title}</h2>{children}</section>;
}
function TagList({ values, empty }: { values: string[]; empty: string }) {
  return values.length
    ? <div className="profile-tags">{values.map((v) => <span key={v}>{v}</span>)}</div>
    : <p className="empty-copy">{empty}</p>;
}
