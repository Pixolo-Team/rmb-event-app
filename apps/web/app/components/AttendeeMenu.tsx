"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { withCsrfHeaders } from "../lib/csrf";

export interface MenuAttendee {
  name: string;
  businessName: string | null;
  chapterName: string | null;
  photoUrl: string | null;
}

type MenuItem = {
  label: string;
  href?: string;
  icon: () => React.ReactNode;
  available: boolean;
  activePrefixes?: string[];
};

const DRAWER_ITEMS: MenuItem[] = [
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon, available: true },
  { href: "/summary", label: "Event Summary", icon: SummaryIcon, available: true },
  { href: "/feedback", label: "Give Feedback", icon: FeedbackIcon, available: true },
  { href: "/feed", label: "Feed", icon: PhotoIcon, available: true },
  { href: "/gallery", label: "Gallery", icon: PhotoIcon, available: true },
  { href: "/profile?qr=1", label: "Show My QR", icon: QrIcon, available: true },
];

const TAB_ITEMS: MenuItem[] = [
  { href: "/home", label: "Home", icon: HomeIcon, available: true },
  { href: "/directory", label: "People", icon: DirectoryIcon, available: true, activePrefixes: ["/attendees/"] },
  { href: "/matches", label: "Want to Meet", icon: SparkIcon, available: true },
  { href: "/profile", label: "Profile", icon: ProfileIcon, available: true },
];

const SHOW_PLANNED_ITEMS = process.env.NODE_ENV !== "production";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AttendeeMenu({ attendee }: { attendee: MenuAttendee }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  function removeMenuHistoryMarker() {
    if (!window.history.state?.eventoAttendeeMenu) return;
    const nextState = { ...window.history.state };
    delete nextState.eventoAttendeeMenu;
    window.history.replaceState(nextState, "");
  }

  function closeMenu() {
    if (window.history.state?.eventoAttendeeMenu) {
      window.history.back();
    } else {
      setOpen(false);
    }
  }

  function openMenu() {
    window.history.pushState({ ...window.history.state, eventoAttendeeMenu: true }, "");
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
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
    if (!open) return;
    const onPopState = () => setOpen(false);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", withCsrfHeaders({ method: "POST", credentials: "include" }));
    } finally {
      removeMenuHistoryMarker();
      setOpen(false);
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="menu-trigger"
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="attendee-menu"
        onClick={openMenu}
      >
        <MenuIcon />
      </button>

      {open && (
        <div className="menu-layer">
          <button className="menu-backdrop" type="button" aria-label="Close menu" onClick={closeMenu} />
          <aside
            ref={drawerRef}
            id="attendee-menu"
            className="attendee-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="menu-topbar">
              <span id={titleId} className="menu-title">Menu</span>
              <button className="menu-close" type="button" aria-label="Close menu" onClick={closeMenu}>
                <CloseIcon />
              </button>
            </div>

            <div className="menu-identity">
              {attendee.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="menu-avatar" src={attendee.photoUrl} alt="" />
              ) : (
                <span className="menu-avatar menu-avatar-fallback" aria-hidden="true">{initials(attendee.name)}</span>
              )}
              <div className="menu-person">
                <strong>{attendee.name}</strong>
                {attendee.businessName && <span>{attendee.businessName}</span>}
                {attendee.chapterName && <span className="menu-chapter">{attendee.chapterName}</span>}
              </div>
            </div>

            <nav className="menu-nav" aria-label="Attendee navigation">
              {DRAWER_ITEMS.filter((item) => item.available || SHOW_PLANNED_ITEMS).map((item) => {
                if (!item.available) return <DisabledMenuItem key={item.label} item={item} />;

                const Icon = item.icon;
                const active = Boolean(
                  item.href &&
                  !item.href.includes("?") &&
                  (pathname === item.href || item.activePrefixes?.some((prefix) => pathname.startsWith(prefix))),
                );
                return (
                  <Link
                    key={item.label}
                    href={item.href!}
                    className={`menu-link${active ? " active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => {
                      removeMenuHistoryMarker();
                      setOpen(false);
                    }}
                  >
                    <Icon />
                    <span className="menu-link-label">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="menu-account">
              <button className="menu-link menu-signout" type="button" disabled={signingOut} onClick={signOut}>
                <SignOutIcon />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function AttendeeBottomTabs() {
  const pathname = usePathname();
  const scanActive = pathname === "/scan";

  return (
    <nav className="attendee-tabs" aria-label="Primary attendee navigation">
      <div className="attendee-tabs-track">
        {TAB_ITEMS.slice(0, 2).map((item) => <TabLink key={item.label} item={item} pathname={pathname} />)}
        <Link className={`attendee-scan-fab${scanActive ? " active" : ""}`} href="/scan" aria-label="Scan QR code" aria-current={scanActive ? "page" : undefined}>
          <ScanIcon />
        </Link>
        {TAB_ITEMS.slice(2).map((item) => <TabLink key={item.label} item={item} pathname={pathname} />)}
      </div>
    </nav>
  );
}

function TabLink({ item, pathname }: { item: MenuItem; pathname: string }) {
  const Icon = item.icon;
  const active = pathname === item.href || Boolean(item.activePrefixes?.some((prefix) => pathname.startsWith(prefix)));

  return (
    <Link className={`attendee-tab${active ? " active" : ""}`} href={item.href!} aria-current={active ? "page" : undefined}>
      <Icon />
      <span>{item.label}</span>
    </Link>
  );
}

function DisabledMenuItem({ item }: { item: MenuItem }) {
  const Icon = item.icon;
  return (
    <button className="menu-link menu-link-disabled" type="button" aria-disabled="true" disabled>
      <Icon />
      <span className="menu-link-label">{item.label}</span>
      <span className="menu-soon">Soon</span>
    </button>
  );
}

function MenuIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H7v-7h10v7" /></svg>;
}

function SignOutIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9" /></svg>;
}

function ProfileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" /><path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6" /></svg>;
}

function QrIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-4v-2h-2" /></svg>;
}

function ScanIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16" /></svg>;
}

function SparkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3ZM18.5 15l.7 2.1L21 18l-1.8.9-.7 2.1-.7-2.1L16 18l1.8-.9.7-2.1Z" /></svg>;
}

function DirectoryIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><path d="M3 19c.4-3.5 2.4-5.2 6-5.2s5.6 1.7 6 5.2M17 7h4M17 11h4M17 15h4" /></svg>;
}

function ConnectionsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.5 20c.5-4 2.3-6 5.5-6s5 2 5.5 6M14 15c3.7-.8 6.2.8 7 4" /></svg>;
}

function TrophyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4c0 3-1.3 5-4 6-2.7-1-4-3-4-6V4ZM8 6H4v2c0 2 1.3 3 4 3M16 6h4v2c0 2-1.3 3-4 3M12 14v4M8 20h8" /></svg>;
}

function PhotoIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h4l1.5-2h5L16 6h4v14H4V6Z" /><circle cx="12" cy="13" r="4" /></svg>;
}
function SummaryIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7M3 20h18" /></svg>; }
function FeedbackIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>; }
