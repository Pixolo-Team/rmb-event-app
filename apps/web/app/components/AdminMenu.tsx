"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { withCsrfHeaders } from "../lib/csrf";

type AdminMenuItem = {
  label: string;
  href: string;
  icon: () => React.ReactNode;
};

const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { href: "/admin", label: "Analytics", icon: AnalyticsIcon },
  { href: "/admin/import", label: "Attendee Import", icon: ImportIcon },
  { href: "/admin/attendees", label: "Manage Attendees", icon: PeopleIcon },
  { href: "/admin/event", label: "Event Settings", icon: SettingsIcon },
  { href: "/admin/checkin", label: "Live Check-In", icon: CheckinIcon },
  { href: "/admin/badges", label: "Print Badges", icon: BadgeIcon },
  { href: "/admin/feed", label: "Gallery Photos", icon: PhotoIcon },
  { href: "/admin/feedback", label: "Feedback", icon: FeedbackIcon },
];

export function AdminMenu({ title }: { title?: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const timeout = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(timeout);
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/admin/auth/logout", withCsrfHeaders({ method: "POST", credentials: "include" }));
    } finally {
      router.replace("/admin/login");
    }
  }

  const nav = (
    <nav className="admin-menu-nav" aria-label="Admin navigation">
      {ADMIN_MENU_ITEMS.map((item) => {
        const Icon = item.icon;
        const active =
            item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`admin-menu-link${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="admin-mobile-topbar">
        <button
          ref={triggerRef}
          className="menu-trigger admin-menu-trigger"
          type="button"
          aria-label="Open admin menu"
          aria-expanded={open}
          aria-controls="admin-menu-drawer"
          onClick={() => setOpen(true)}
        >
          <MenuIcon />
        </button>
        <span className="admin-mobile-topbar-title">{title ?? "Evento Admin"}</span>
        <span aria-hidden="true" />
      </div>

      <aside className="admin-sidebar">
        <div className="wordmark">
          <span className="dot" />
          Evento Admin
        </div>
        {nav}
        <div className="admin-sidebar-bottom">
          <button className="admin-menu-link admin-menu-signout" type="button" disabled={signingOut} onClick={signOut}>
            <SignOutIcon />
            <span>{signingOut ? "Signing out…" : "Sign out"}</span>
          </button>
        </div>
      </aside>

      {mounted && (
        <div className={`menu-layer${open ? "" : " closing"}`}>
          <button className="menu-backdrop" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside
            ref={drawerRef}
            id="admin-menu-drawer"
            className="attendee-menu admin-menu-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="menu-topbar">
              <span id={titleId} className="menu-title">Admin menu</span>
              <button className="menu-close" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            {nav}
            <div className="menu-bottom">
              <div className="menu-account">
                <button className="menu-link menu-signout" type="button" disabled={signingOut} onClick={signOut}>
                  <SignOutIcon />
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function SignOutIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" /></svg>;
}

function AnalyticsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7M3 20h18" /></svg>;
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 19c.4-3.5 2.4-5.2 6-5.2s5.6 1.7 6 5.2M17 7h4M17 11h4M17 15h4" /></svg>;
}

function SettingsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.6" /></svg>;
}

function CheckinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" /></svg>;
}

function BadgeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-4v-2h-2" /></svg>;
}

function ImportIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></svg>;
}

function PhotoIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h4l1.5-2h5L16 6h4v14H4V6Z" /><circle cx="12" cy="13" r="4" /></svg>;
}

function FeedbackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>;
}
