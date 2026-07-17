"use client";

import { Dispatch, SetStateAction, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { AttendeeMe, DirectoryAttendee } from "./TutorialPage";
import { TEMP_BYPASS_LOGIN } from "./TutorialPage";
import { getInitials } from "./AttendeeCard";
import { EditProfileForm } from "./EditProfileForm";
import { LinkedInIcon, ScanIcon } from "./icons";
import { ScanConnect } from "./ScanConnect";

function TagGroup({ label, values }: { label: string; values: string[] | undefined }) {
  if (!values?.length) return null;
  return (
    <div className="profile-tag-group">
      <p className="profile-tag-label">{label}</p>
      <div className="chip-row">
        {values.map((value) => (
          <span key={`${label}-${value}`} className="chip static">
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProfileView({
  attendee,
  setAttendee,
  directory,
  setDirectory,
  onReplayTutorial,
}: {
  attendee: AttendeeMe;
  setAttendee: Dispatch<SetStateAction<AttendeeMe | null>>;
  directory: DirectoryAttendee[];
  setDirectory: Dispatch<SetStateAction<DirectoryAttendee[]>>;
  onReplayTutorial: () => void;
}) {
  const router = useRouter();
  const [showEditPage, setShowEditPage] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [qrEnlarged, setQrEnlarged] = useState(false);

  const qrValue = attendee.qrToken ?? attendee.id;
  const metaLine = [attendee.businessCategory, attendee.city, attendee.chapterName].filter(Boolean).join(" · ");

  async function handleScanDetected(decoded: string): Promise<string | null> {
    if (TEMP_BYPASS_LOGIN) {
      const target = directory.find((person) => !person.met);
      if (!target) return null;
      setDirectory((current) => current.map((p) => (p.id === target.id ? { ...p, met: true } : p)));
      return `You met ${target.name}.`;
    }

    try {
      const res = await fetch("/api/connections/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ qrToken: decoded }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      const name = body.attendee?.name as string | undefined;
      if (name) {
        setDirectory((current) => current.map((p) => (p.id === body.attendee.id ? { ...p, met: true } : p)));
        return `You met ${name}.`;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function handleLogout() {
    if (!TEMP_BYPASS_LOGIN) {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch {
        // Even if the network call fails, still send the user to the login screen.
      }
    }
    router.push("/login");
  }

  if (showEditPage) {
    return (
      <EditProfileForm
        attendee={attendee}
        onSaved={(patch) => setAttendee((current) => (current ? { ...current, ...patch } : current))}
        onClose={() => setShowEditPage(false)}
      />
    );
  }

  return (
    <main className="app-content">
      <section className="qr-card">
        <p className="qr-card-label">My connect code</p>
        <button type="button" className="qr-frame" onClick={() => setQrEnlarged(true)} aria-label="Enlarge QR code">
          <QRCodeSVG value={qrValue} size={180} bgColor="#ffffff" fgColor="#16233b" level="M" />
        </button>
        <p className="qr-card-hint">Let others scan this to connect with you.</p>
        <button type="button" className="btn-primary scan-cta" onClick={() => setScanOpen(true)}>
          <ScanIcon />
          Scan to connect
        </button>
      </section>

      <section className="business-card profile-card">
        <div className="business-card-top">
          <div className="hero-avatar business-card-avatar" aria-hidden="true">
            {attendee.photoUrl ? <img src={attendee.photoUrl} alt="" /> : getInitials(attendee.name)}
          </div>
          <div className="person-meta">
            <h2 className="person-name">{attendee.name}</h2>
            <p className="person-line">{attendee.businessName ?? "Add your business"}</p>
            {metaLine ? <p className="person-line muted">{metaLine}</p> : null}
            {attendee.tableNumber ? <p className="person-line muted">Table {attendee.tableNumber}</p> : null}
          </div>
        </div>

        {attendee.bio ? <p className="person-bio profile-card-bio">{attendee.bio}</p> : null}

        <TagGroup label="Looking for" values={attendee.lookingFor} />
        <TagGroup label="Offering" values={attendee.offering} />
        <TagGroup label="Goals" values={attendee.goals} />

        <div className="business-card-contact">
          <div>
            <p className="person-line muted">{attendee.phone}</p>
            <p className="person-line muted">{attendee.email}</p>
          </div>
          {attendee.linkedInUrl ? (
            <a className="icon-btn" href={attendee.linkedInUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <LinkedInIcon />
            </a>
          ) : null}
        </div>
        <button type="button" className="btn-secondary" onClick={() => setShowEditPage(true)} style={{ marginTop: 16 }}>
          Edit profile
        </button>
      </section>

      <section className="settings-card">
        <button className="settings-row" type="button" onClick={onReplayTutorial}>
          <span>
            <strong>First-time tutorial</strong>
            <small>Open the 60-second walkthrough again</small>
          </span>
          <span>Open</span>
        </button>
        <button className="settings-row" type="button" onClick={handleLogout}>
          <span>
            <strong>Log out</strong>
            <small>Sign out of this device</small>
          </span>
          <span>Log out</span>
        </button>
      </section>

      {qrEnlarged ? (
        <div className="photo-modal-overlay" role="dialog" aria-modal="true" onClick={() => setQrEnlarged(false)}>
          <div className="qr-enlarged" onClick={(event) => event.stopPropagation()}>
            <QRCodeSVG value={qrValue} size={280} bgColor="#ffffff" fgColor="#16233b" level="M" />
            <p className="person-name" style={{ marginTop: 16, textAlign: "center" }}>
              {attendee.name}
            </p>
            <button className="btn-secondary" type="button" onClick={() => setQrEnlarged(false)} style={{ marginTop: 16 }}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {scanOpen ? <ScanConnect onDetected={handleScanDetected} onClose={() => setScanOpen(false)} /> : null}
    </main>
  );
}
