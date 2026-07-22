"use client";

import { useEffect, useState } from "react";
import { EditProfileForm } from "../(app)/tutorial/EditProfileForm";
import type { AttendeeMe } from "../(app)/tutorial/TutorialPage";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { ContactRows } from "../components/ContactRows";
import { PersonalStats } from "../components/PersonalStats";
import { PhotoUploadModal } from "../components/PhotoUploadModal";
import { PoweredByFooter } from "../components/PoweredByFooter";
import { withCsrfHeaders } from "../lib/csrf";
import { loadMyProfile, profileCache, type MyProfile } from "../lib/profileCache";
import { ProfileSkeleton } from "./ProfileSkeleton";

export default function ProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [enlarged, setEnlarged] = useState(false);
  const [offline, setOffline] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [websiteEditing, setWebsiteEditing] = useState(false);
  const [websiteSaving, setWebsiteSaving] = useState(false);
  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [linkedInDraft, setLinkedInDraft] = useState("");
  const [linkedInEditing, setLinkedInEditing] = useState(false);
  const [linkedInSaving, setLinkedInSaving] = useState(false);
  const [linkedInError, setLinkedInError] = useState<string | null>(null);

  function syncProfile(nextProfile: MyProfile) {
    setProfile(nextProfile);
    profileCache.set(nextProfile);
    setWebsiteDraft(nextProfile.websiteUrl ?? "");
    setLinkedInDraft(nextProfile.linkedInUrl ?? "");
  }

  const updateProfilePhoto = (photoUrl: string | null) => {
    setProfile((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, photoUrl };
      profileCache.set(updated);
      return updated;
    });
  };

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true);
    try {
      const contentType = file.type as "image/jpeg" | "image/png" | "image/webp";

      const urlRes = await fetch("/api/uploads/upload-url", withCsrfHeaders({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "profile", contentType }),
      }));

      if (!urlRes.ok) {
        const body = await urlRes.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? "Could not prepare the upload");
      }

      const { upload } = await urlRes.json() as {
        upload: { uploadUrl: string; objectPath: string; requiredHeaders: Record<string, string> };
      };

      const putRes = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.requiredHeaders,
        body: file,
      });

      if (!putRes.ok) {
        throw new Error("Upload to storage failed");
      }

      const saveRes = await fetch("/api/attendees/me/photo", withCsrfHeaders({
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: upload.objectPath }),
      }));

      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? "Upload failed");
      }

      const data = await saveRes.json() as { status: string; photoUrl: string };
      updateProfilePhoto(data.photoUrl);
    } catch (error) {
      console.error("Photo upload error:", error);
      throw error;
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoRemove = async () => {
    setPhotoUploading(true);
    try {
      const res = await fetch("/api/attendees/me/photo/remove", withCsrfHeaders({
        method: "PATCH",
        credentials: "include",
      }));

      if (!res.ok) throw new Error("Remove failed");

      updateProfilePhoto(null);
    } catch (error) {
      console.error("Photo remove error:", error);
      throw error;
    } finally {
      setPhotoUploading(false);
    }
  };

  // Cache-first so the screen (and QR) appear instantly and work offline, then
  // refresh from the network when reachable. loadMyProfile is shared with
  // AttendeePageShell's own header fetch — this used to be an independent
  // fetch("/api/attendees/me") duplicating the shell's request on every
  // Profile load; now it dedupes/throttles onto the same in-flight or
  // recently-cached result instead of a second DB round trip.
  useEffect(() => {
    const cached = profileCache.get();
    if (cached) {
      setProfile(cached);
      setWebsiteDraft(cached.websiteUrl ?? "");
      setLinkedInDraft(cached.linkedInUrl ?? "");
      setOffline(!navigator.onLine);
    }
    loadMyProfile()
      .then(({ profile: me }) => {
        if (!me) throw new Error("unavailable");
        setProfile(me);
        setWebsiteDraft(me.websiteUrl ?? "");
        setLinkedInDraft(me.linkedInUrl ?? "");
        setOffline(false);
      })
      .catch(() => setOffline(!navigator.onLine));
  }, []);

  useEffect(() => {
    const qrToken = profile?.qrToken;
    if (!qrToken) return;
    // Dynamically imported: qrcode is a meaningfully-sized library only this
    // effect needs, so it shouldn't sit in Profile's initial JS bundle.
    let cancelled = false;
    import("qrcode").then(({ default: QRCode }) =>
      QRCode.toDataURL(qrToken, { margin: 1, width: 512, errorCorrectionLevel: "M" }),
    )
      .then((url) => { if (!cancelled) setQrDataUrl(url); })
      .catch(() => { if (!cancelled) setQrDataUrl(null); });
    return () => { cancelled = true; };
  }, [profile?.qrToken]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("qr") === "1") setEnlarged(true);
  }, []);

  useEffect(() => {
    if (!enlarged) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEnlarged(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enlarged]);

  async function saveWebsite() {
    if (!profile) return;
    const normalizedWebsiteUrl = normalizeWebsiteUrl(websiteDraft);
    if (websiteDraft.trim() && !normalizedWebsiteUrl) {
      setWebsiteError("Enter a valid website link.");
      return;
    }

    setWebsiteSaving(true);
    setWebsiteError(null);
    try {
      const res = await fetch("/api/attendees/me/links", withCsrfHeaders({
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: normalizedWebsiteUrl || null,
        }),
      }));

      if (!res.ok) {
        setWebsiteError("Couldn't save your website right now.");
        return;
      }

      syncProfile({ ...profile, websiteUrl: normalizedWebsiteUrl || null });
      setWebsiteEditing(false);
    } catch {
      setWebsiteError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setWebsiteSaving(false);
    }
  }

  async function saveLinkedIn() {
    if (!profile) return;
    const normalizedLinkedInUrl = normalizeLinkedInUrl(linkedInDraft);
    if (linkedInDraft.trim() && !normalizedLinkedInUrl) {
      setLinkedInError("Enter a valid LinkedIn profile URL.");
      return;
    }

    setLinkedInSaving(true);
    setLinkedInError(null);
    try {
      const res = await fetch("/api/attendees/me/links", withCsrfHeaders({
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedInUrl: normalizedLinkedInUrl || null,
        }),
      }));

      if (!res.ok) {
        setLinkedInError("Couldn't save your LinkedIn right now.");
        return;
      }

      syncProfile({ ...profile, linkedInUrl: normalizedLinkedInUrl || null });
      setLinkedInEditing(false);
    } catch {
      setLinkedInError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLinkedInSaving(false);
    }
  }

  function toEditProfileAttendee(value: MyProfile): AttendeeMe {
    return {
      id: value.id,
      name: value.name,
      email: value.email,
      phone: value.phone,
      businessName: value.businessName,
      chapterName: value.chapterName,
      tableNumber: value.tableNumber,
      city: value.city,
      businessCategory: value.businessCategory,
      photoUrl: value.photoUrl,
      lookingFor: value.lookingFor,
      offering: value.offering,
      goals: value.goals,
      bio: value.bio,
      linkedInUrl: value.linkedInUrl ?? null,
      websiteUrl: value.websiteUrl ?? null,
      qrToken: value.qrToken,
      profileCompletedAt: value.profileCompletedAt,
    };
  }

  const hasNetworkingInfo = Boolean(
    profile && (profile.lookingFor.length > 0 || profile.offering.length > 0 || profile.goals.length > 0),
  );

  return (
    <AttendeePageShell showFooter={false} showTabs={!editingProfile}>
      {editingProfile && profile ? (
        <EditProfileForm
          attendee={toEditProfileAttendee(profile)}
          onSaved={(patch) => syncProfile({ ...profile, ...patch })}
          onClose={() => setEditingProfile(false)}
        />
      ) : (
        <>
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
                  <p className="qr-eyebrow">Scan to connect</p>
                  <div className="qr-card-container">
                    {qrDataUrl ? (
                      <button className="qr-frame" type="button" onClick={() => setEnlarged(true)} aria-label="Enlarge your QR code">
                        <img src={qrDataUrl} alt="Your personal QR code" />
                      </button>
                    ) : (
                      <div className="qr-frame qr-frame-placeholder" role="status">Preparing your QR...</div>
                    )}
                  </div>
                  <p className="qr-hint">Tap the code to enlarge it for scanning</p>

                  <div className="qr-card-divider" aria-hidden="true" />

                  <div className="qr-photo-row">
                    <div className="qr-with-photo">
                      {profile.photoUrl && (
                        <img src={profile.photoUrl} alt={profile.name} className="profile-photo" />
                      )}
                      {!profile.photoUrl && <div className="profile-photo-placeholder">{getInitials(profile.name)}</div>}
                      <button
                        className="photo-add-button"
                        type="button"
                        onClick={() => setPhotoModalOpen(true)}
                        aria-label="Edit photo"
                        title="Edit photo"
                      >
                        <PencilIcon />
                      </button>
                    </div>
                    <div className="qr-identity-text">
                      <p className="qr-identity-name">{profile.name}</p>
                      {profile.businessName && <p className="qr-identity-business">{profile.businessName}</p>}
                    </div>
                  </div>

                  <button className="btn-secondary profile-edit-button" type="button" onClick={() => setEditingProfile(true)}>
                    Edit profile
                  </button>
                </section>

                <PersonalStats />

                <div className="profile-details-grid">
                  <ProfileSection title="Contact">
                    <ContactRows phone={profile.phone} email={profile.email} tableNumber={profile.tableNumber} interactive={false} />
                    <div className="profile-website-panel">
                      <div className="profile-website-header">
                        <span className="contact-row-label">Website</span>
                        {!websiteEditing ? (
                          <button className="profile-inline-action" type="button" onClick={() => {
                            setWebsiteDraft(profile.websiteUrl ?? "");
                            setWebsiteError(null);
                            setWebsiteEditing(true);
                          }}>
                            {profile.websiteUrl ? "Edit link" : "Add link"}
                          </button>
                        ) : null}
                      </div>

                      {!websiteEditing ? (
                        profile.websiteUrl ? (
                          <a className="profile-link-row" href={profile.websiteUrl} target="_blank" rel="noreferrer">
                            <WebsiteIcon />
                            <span>{formatProfileLinkLabel(profile.websiteUrl, "website")}</span>
                          </a>
                        ) : (
                          <p className="empty-copy">No website added yet</p>
                        )
                      ) : (
                        <div className="profile-inline-form">
                          <input
                            type="text"
                            inputMode="url"
                            value={websiteDraft}
                            onChange={(event) => setWebsiteDraft(event.target.value)}
                            placeholder="yourwebsite.com"
                          />
                          <div className="profile-inline-form-actions">
                            <button className="btn-secondary" type="button" disabled={websiteSaving} onClick={() => {
                              setWebsiteDraft(profile.websiteUrl ?? "");
                              setWebsiteError(null);
                              setWebsiteEditing(false);
                            }}>
                              Cancel
                            </button>
                            <button className="btn-primary" type="button" disabled={websiteSaving} onClick={saveWebsite}>
                              {websiteSaving ? "Saving..." : "Save link"}
                            </button>
                          </div>
                          {websiteError ? <p className="hint err">{websiteError}</p> : null}
                        </div>
                      )}
                    </div>

                    <div className="profile-website-panel">
                      <div className="profile-website-header">
                        <span className="contact-row-label">LinkedIn</span>
                        {!linkedInEditing ? (
                          <button className="profile-inline-action" type="button" onClick={() => {
                            setLinkedInDraft(profile.linkedInUrl ?? "");
                            setLinkedInError(null);
                            setLinkedInEditing(true);
                          }}>
                            {profile.linkedInUrl ? "Edit link" : "Add link"}
                          </button>
                        ) : null}
                      </div>

                      {!linkedInEditing ? (
                        profile.linkedInUrl ? (
                          <a className="profile-link-row" href={profile.linkedInUrl} target="_blank" rel="noreferrer">
                            <LinkedInIcon />
                            <span>{formatProfileLinkLabel(profile.linkedInUrl, "linkedin")}</span>
                          </a>
                        ) : (
                          <p className="empty-copy">No LinkedIn added yet</p>
                        )
                      ) : (
                        <div className="profile-inline-form">
                          <input
                            type="text"
                            inputMode="url"
                            value={linkedInDraft}
                            onChange={(event) => setLinkedInDraft(event.target.value)}
                            placeholder="linkedin.com/in/you"
                          />
                          <div className="profile-inline-form-actions">
                            <button className="btn-secondary" type="button" disabled={linkedInSaving} onClick={() => {
                              setLinkedInDraft(profile.linkedInUrl ?? "");
                              setLinkedInError(null);
                              setLinkedInEditing(false);
                            }}>
                              Cancel
                            </button>
                            <button className="btn-primary" type="button" disabled={linkedInSaving} onClick={saveLinkedIn}>
                              {linkedInSaving ? "Saving..." : "Save link"}
                            </button>
                          </div>
                          {linkedInError ? <p className="hint err">{linkedInError}</p> : null}
                        </div>
                      )}
                    </div>
                  </ProfileSection>
                  <ProfileSection title="Business">
                    <dl className="profile-contact">
                      {profile.businessName && <div><dt>Company</dt><dd>{profile.businessName}</dd></div>}
                      {profile.businessCategory && <div><dt>Category</dt><dd>{profile.businessCategory}</dd></div>}
                      {profile.city && <div><dt>City</dt><dd>{profile.city}</dd></div>}
                      {profile.chapterName && <div><dt>Chapter</dt><dd>{profile.chapterName}</dd></div>}
                      {!profile.businessName && !profile.businessCategory && !profile.city && !profile.chapterName && (
                        <p className="empty-copy">No business details on file</p>
                      )}
                    </dl>
                  </ProfileSection>
                </div>

                {profile.bio && (
                  <ProfileSection title="About"><p className="profile-bio">{profile.bio}</p></ProfileSection>
                )}
                {hasNetworkingInfo ? (
                  <ProfileSection title="Networking profile">
                    {profile.lookingFor.length > 0 ? <TagGroup title="Looking for" values={profile.lookingFor} /> : null}
                    {profile.offering.length > 0 ? <TagGroup title="Offering" values={profile.offering} /> : null}
                    {profile.goals.length > 0 ? <TagGroup title="Networking goals" values={profile.goals} /> : null}
                  </ProfileSection>
                ) : null}

                <PoweredByFooter />
              </>
            )}
          </main>

          {enlarged && qrDataUrl && profile && (
            <div className="qr-fullscreen" role="dialog" aria-modal="true" aria-label="Your QR code" onClick={() => setEnlarged(false)}>
              <img src={qrDataUrl} alt="Your personal QR code, enlarged" />
              <p className="qr-fullscreen-name">{profile.name}</p>
              <button className="qr-fullscreen-close" type="button" aria-label="Close">Tap anywhere to close</button>
            </div>
          )}

          <PhotoUploadModal
            isOpen={photoModalOpen}
            onClose={() => setPhotoModalOpen(false)}
            onPhotoUpload={handlePhotoUpload}
            hasExistingPhoto={Boolean(profile?.photoUrl)}
            onPhotoRemove={handlePhotoRemove}
            isLoading={photoUploading}
          />
        </>
      )}
    </AttendeePageShell>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "EV";
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

function normalizeLinkedInUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:" || !url.hostname.includes("linkedin.")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function formatProfileLinkLabel(value: string, kind: "website" | "linkedin") {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./i, "");
    const path = url.pathname.replace(/\/+$/, "");

    if (kind === "linkedin") {
      const compactPath = path.length > 24 ? `${path.slice(0, 24)}...` : path;
      return compactPath ? `${host}${compactPath}` : host;
    }

    return path && path !== "/" ? `${host}${path}` : host;
  } catch {
    return value;
  }
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="profile-section"><h2>{title}</h2>{children}</section>;
}

function TagList({ values, empty }: { values: string[]; empty: string }) {
  return values.length
    ? <div className="profile-tags">{values.map((v) => <span key={v}>{v}</span>)}</div>
    : <p className="empty-copy">{empty}</p>;
}

function TagGroup({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="profile-tag-group">
      <h3>{title}</h3>
      <div className="profile-tags">{values.map((value) => <span key={`${title}-${value}`}>{value}</span>)}</div>
    </div>
  );
}

function PencilIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m12.5 7.5 4 4" /></svg>;
}

function WebsiteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.1" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function LinkedInIcon() {
  return <svg className="brand-glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5ZM3 9.5h4v11H3v-11Zm6 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95C20.3 9.05 21 11 21 14.1v6.4h-4v-5.7c0-1.36-.02-3.1-1.9-3.1-1.9 0-2.2 1.48-2.2 3v5.8H9v-11Z" /></svg>;
}
