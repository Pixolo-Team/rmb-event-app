"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TOOLS = [
  { href: "/admin/import", title: "Attendee Import", desc: "Upload the guest list (CSV / Excel)" },
  { href: "/admin/event", title: "Event Settings", desc: "Venue location & check-in radius" },
  { href: "/admin/checkin", title: "Live Check-In", desc: "Staff QR scan & arrival dashboard" },
  { href: "/admin/badges", title: "Print Badges", desc: "QR badges for the registration desk" },
  { href: "/admin/feed", title: "Photo Moderation", desc: "Review & remove event photos" },
  { href: "/admin/feedback", title: "Feedback", desc: "Ratings & comments analytics" },
];

export default function AdminHome() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.replace("/admin/login");
    }
  }

  return (
    <main className="admin-page admin-hub">
      <div className="admin-hub-head">
        <div>
          <p className="eyebrow">Organizer</p>
          <h1>Admin console</h1>
        </div>
        <button className="btn-secondary" type="button" onClick={signOut} disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      <div className="admin-hub-grid">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="admin-tool-card">
            <b>{tool.title}</b>
            <span>{tool.desc}</span>
            <em aria-hidden="true">›</em>
          </Link>
        ))}
      </div>
    </main>
  );
}
