"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AttendeeCard } from "./AttendeeCard";
import { FullProfileModal } from "./FullProfileModal";
import { ProfileView } from "./ProfileView";
import { PoweredByFooter } from "./PoweredByFooter";
import { RotaryLoader } from "../../components/RotaryLoader";
import { BookmarkTabIcon, HomeIcon, PeopleIcon, ProfileIcon, ScanIcon } from "./icons";
import { withCsrfHeaders } from "../../lib/csrf";

type AppView = "home" | "people" | "wantToMeet" | "profile";

type TutorialCard = {
  eyebrow: string;
  title: string;
  body: string;
};

export type AttendeeMe = {
  id: string;
  name: string;
  email: string;
  phone: string;
  businessName: string | null;
  chapterName: string | null;
  tableNumber?: string | null;
  city: string | null;
  businessCategory: string | null;
  photoUrl?: string | null;
  lookingFor?: string[];
  offering?: string[];
  goals?: string[];
  bio?: string | null;
  linkedInUrl?: string | null;
  qrToken?: string | null;
  profileCompletedAt: string | null;
};

export type DirectoryAttendee = {
  id: string;
  name: string;
  businessName: string | null;
  chapterName: string | null;
  city: string | null;
  businessCategory: string | null;
  bio: string | null;
  phone: string;
  photoUrl: string | null;
  linkedInUrl: string | null;
  bookmarked: boolean;
  met: boolean;
};

export type FeedCommentData = {
  id: string;
  name: string;
  message: string;
  createdAt: string;
};

export type FeedPhotoData = {
  id: string;
  url: string | null;
  urls?: string[];
  caption: string | null;
  createdAt: string;
  attendeeId: string;
  attendeeName: string;
  attendeeBusinessName: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  comments: FeedCommentData[];
};

const TUTORIAL_STORAGE_KEY = "evento:first-time-tutorial-seen";
export const TEMP_BYPASS_LOGIN = true;

const DEMO_ATTENDEE: AttendeeMe = {
  id: "demo-attendee",
  name: "Radha Sharma",
  email: "radha@example.com",
  phone: "+91 98765 43210",
  businessName: "Sharma Trading Co.",
  chapterName: "RMB Ahmedabad",
  tableNumber: "A-12",
  city: "Ahmedabad",
  businessCategory: "Trader/Distributor",
  photoUrl: null,
  lookingFor: ["Distributors", "Suppliers"],
  offering: ["Wholesale", "Logistics"],
  goals: ["Grow network", "Find partners"],
  bio: "Third-generation trading business, expanding across west India.",
  linkedInUrl: "https://www.linkedin.com/in/radha-sharma",
  qrToken: "demo-qr-token-radha-sharma",
  profileCompletedAt: new Date().toISOString(),
};

const DEMO_DIRECTORY: DirectoryAttendee[] = [
  {
    id: "demo-1",
    name: "Deepak Patel",
    businessName: "Patel Pipes",
    chapterName: "RMB Surat",
    city: "Surat",
    businessCategory: "Manufacturer",
    bio: "Looking for distributors across Gujarat and Rajasthan.",
    phone: "+91 90000 00001",
    photoUrl: null,
    linkedInUrl: "https://www.linkedin.com/in/deepak-patel",
    bookmarked: false,
    met: true,
  },
  {
    id: "demo-2",
    name: "Neha Shah",
    businessName: "Shah Interiors",
    chapterName: "RMB Ahmedabad",
    city: "Ahmedabad",
    businessCategory: "Service Provider",
    bio: "Interior design studio working with builders and retail brands.",
    phone: "+91 90000 00002",
    photoUrl: null,
    linkedInUrl: null,
    bookmarked: true,
    met: false,
  },
  {
    id: "demo-3",
    name: "Amit Mehta",
    businessName: "Mehta Distributors",
    chapterName: null,
    city: "Vadodara",
    businessCategory: "Trader/Distributor",
    bio: "Interested in new supplier tie-ups and logistics partners.",
    phone: "+91 90000 00003",
    photoUrl: null,
    linkedInUrl: "https://www.linkedin.com/in/amit-mehta",
    bookmarked: false,
    met: false,
  },
];

const TUTORIAL_CARDS: readonly TutorialCard[] = [
  {
    eyebrow: "Welcome",
    title: "This is your event app",
    body: "Use RMBF Evento to get event-ready, find the right people, and keep the contacts you make in one place.",
  },
  {
    eyebrow: "Event Day",
    title: "Check in fast",
    body: "Open the app when you arrive. RMBF Evento will try location check-in first and gives you a manual fallback if needed.",
  },
  {
    eyebrow: "Networking",
    title: "Scan and connect",
    body: "Show your QR, scan someone else's QR, and keep a clean list of people you've already met.",
  },
  {
    eyebrow: "Bookmarks",
    title: "Save people you want to meet",
    body: "Tap the bookmark on any attendee card. Your Want to Meet list updates right away in My Connections.",
  },
];

export function TutorialPage() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attendee, setAttendee] = useState<AttendeeMe | null>(null);
  const [directory, setDirectory] = useState<DirectoryAttendee[]>([]);
  const [view, setView] = useState<AppView>("home");
  const [search, setSearch] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingBookmarks, setPendingBookmarks] = useState<string[]>([]);
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [profileEditing, setProfileEditing] = useState(false);

  useEffect(() => {
    if (TEMP_BYPASS_LOGIN) {
      setAttendee(DEMO_ATTENDEE);
      setDirectory(DEMO_DIRECTORY);
      setState("ready");
      setTutorialOpen(true);
      return;
    }

    async function load() {
      try {
        const meRes = await fetch("/api/attendees/me", { credentials: "include" });
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }

        const me = (await meRes.json()) as AttendeeMe;
        if (!me.profileCompletedAt) {
          router.replace("/onboarding");
          return;
        }

        const directoryRes = await fetch("/api/attendees/directory", { credentials: "include" });
        if (!directoryRes.ok) {
          setState("error");
          return;
        }

        const directoryData = (await directoryRes.json()) as DirectoryAttendee[];
        setAttendee(me);
        setDirectory(directoryData);
        setState("ready");
        if (typeof window !== "undefined" && !window.localStorage.getItem(TUTORIAL_STORAGE_KEY)) {
          setTutorialOpen(true);
          return;
        }
        router.replace("/home");
      } catch {
        setState("error");
      }
    }

    load();
  }, [router]);

  const tutorialStep = useMemo(() => TUTORIAL_CARDS[tutorialIndex], [tutorialIndex]);
  const wantToMeet = useMemo(
    () => directory.filter((person) => person.bookmarked),
    [directory],
  );
  const filteredDirectory = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return directory;
    return directory.filter((person) =>
      [person.name, person.businessName ?? "", person.chapterName ?? "", person.city ?? "", person.businessCategory ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [directory, search]);

  function closeTutorial(markSeen = true, destination = "/home") {
    if (markSeen && typeof window !== "undefined") {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, new Date().toISOString());
    }
    setTutorialOpen(false);
    setTutorialIndex(0);
    if (!TEMP_BYPASS_LOGIN) {
      router.replace(destination);
    }
  }

  function restartTutorial() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
    setTutorialIndex(0);
    setTutorialOpen(true);
  }

  async function toggleBookmark(personId: string) {
    if (TEMP_BYPASS_LOGIN) {
      setDirectory((current) =>
        current.map((person) =>
          person.id === personId ? { ...person, bookmarked: !person.bookmarked } : person,
        ),
      );
      return;
    }

    setPendingBookmarks((current) => [...current, personId]);
    setActionError(null);

    const previousDirectory = directory;
    const nextDirectory = directory.map((person) =>
      person.id === personId ? { ...person, bookmarked: !person.bookmarked } : person,
    );
    setDirectory(nextDirectory);

    try {
      const response = await fetch("/api/bookmarks", withCsrfHeaders({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendeeId: personId }),
      }));
      if (!response.ok) {
        setDirectory(previousDirectory);
        setActionError("Bookmark update failed. Try again.");
      }
    } catch {
      setDirectory(previousDirectory);
      setActionError("Bookmark update failed. Check your connection and try again.");
    } finally {
      setPendingBookmarks((current) => current.filter((id) => id !== personId));
    }
  }

  if (state === "loading") {
    return (
      <div className="screen app-shell-screen">
        <div className="card">
          <div className="wordmark">
            <span className="dot" />
            RMBF Evento
          </div>
          <div className="center-state">
            <RotaryLoader />
            <p>Loading your app&hellip;</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === "error" || !attendee) {
    return (
      <div className="screen app-shell-screen">
        <div className="card">
          <div className="wordmark">
            <span className="dot" />
            RMBF Evento
          </div>
          <div className="center-state">
            <div className="ring warn">!</div>
            <h2>Couldn&apos;t load the attendee app</h2>
            <p>Please go back to login and try again.</p>
          </div>
        </div>
      </div>
    );
  }

  const openProfile = directory.find((person) => person.id === openProfileId) ?? null;

  return (
    <div className={`app-shell-screen${profileEditing ? " is-editing-profile" : " has-bottom-nav"}`}>
      <div className="app-shell">
        {!profileEditing ? <header className="app-topbar">
          <div>
            <div className="wordmark app-wordmark">
              <span className="dot" />
              RMBF Evento
            </div>
            <p className="app-kicker">
              {view === "home" && "Tutorial"}
              {view === "profile" && "Profile"}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/rmb-fellowship-logo.png"
            alt="Rotary Means Business Fellowship"
            className="app-topbar-brand"
            width={50}
            height={50}
          />
        </header> : null}

        {actionError ? (
          <div className="banner warn app-banner">
            <div>
              <b>Bookmark issue</b>
              {actionError}
            </div>
          </div>
        ) : null}

        {view === "home" ? (
          <main className="app-content">
            <section className="feature-card">
              <p className="feature-title">Welcome to RMBF Evento</p>
              <p className="feature-copy">Finish the quick walkthrough and we&apos;ll take you into the real Home page.</p>
              <button className="btn-primary" type="button" onClick={restartTutorial}>Replay walkthrough</button>
            </section>
            <PoweredByFooter />
          </main>
        ) : null}

        {view === "people" ? (
          <main className="app-content">
            <section className="page-heading">
              <h1 className="settings-title">People</h1>
              <p className="settings-copy">Browse attendees, bookmark, and connect.</p>
            </section>
            <div className="field">
              <label htmlFor="directory-search">Search attendees</label>
              <input
                id="directory-search"
                placeholder="Name, city, company, chapter"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {filteredDirectory.length === 0 ? (
              <section className="feature-card">
                <p className="feature-title">No attendees found</p>
                <p className="feature-copy">Try a different search or import more attendee profiles.</p>
              </section>
            ) : (
              filteredDirectory.map((person) => (
                <AttendeeCard
                  key={person.id}
                  person={person}
                  busy={pendingBookmarks.includes(person.id)}
                  onToggleBookmark={() => toggleBookmark(person.id)}
                  onOpen={() => setOpenProfileId(person.id)}
                />
              ))
            )}

            <PoweredByFooter />
          </main>
        ) : null}

        {view === "wantToMeet" ? (
          <main className="app-content">
            <section className="page-heading">
              <h1 className="settings-title">Want to Meet</h1>
              <p className="settings-copy">Your bookmarked attendees appear here.</p>
            </section>

            {wantToMeet.length === 0 ? (
              <section className="feature-card">
                <p className="feature-title">No one bookmarked yet</p>
                <p className="feature-copy">Browse People and tap bookmark to add people here.</p>
                <button className="btn-primary" type="button" onClick={() => router.push("/directory")}>
                  Open People
                </button>
              </section>
            ) : (
              wantToMeet.map((person) => (
                <AttendeeCard
                  key={person.id}
                  person={person}
                  busy={pendingBookmarks.includes(person.id)}
                  onToggleBookmark={() => toggleBookmark(person.id)}
                  onOpen={() => setOpenProfileId(person.id)}
                />
              ))
            )}

            <PoweredByFooter />
          </main>
        ) : null}

        {view === "profile" ? (
          <ProfileView
            attendee={attendee}
            setAttendee={setAttendee}
            directory={directory}
            setDirectory={setDirectory}
            onReplayTutorial={restartTutorial}
            onEditingChange={setProfileEditing}
          />
        ) : null}
      </div>

      {!profileEditing && !tutorialOpen ? <nav className="bottom-nav">
        <button type="button" className={`bottom-nav-item${view === "home" ? " active" : ""}`} onClick={() => router.push("/home")}>
          <HomeIcon active={view === "home"} />
          <span>Home</span>
        </button>
        <button type="button" className={`bottom-nav-item${view === "people" ? " active" : ""}`} onClick={() => router.push("/directory")}>
          <PeopleIcon active={view === "people"} />
          <span>People</span>
        </button>
        <button
          type="button"
          className="bottom-nav-item bottom-nav-item-create"
          onClick={() => router.push("/scan")}
          aria-label="Scan QR code"
        >
          <span className="bottom-nav-create-icon" aria-hidden="true">
            <ScanIcon />
          </span>
        </button>
        <button type="button" className={`bottom-nav-item${view === "wantToMeet" ? " active" : ""}`} onClick={() => router.push("/matches")}>
          <BookmarkTabIcon active={view === "wantToMeet"} />
          <span>Want to Meet</span>
        </button>
        <button type="button" className={`bottom-nav-item${view === "profile" ? " active" : ""}`} onClick={() => router.push("/profile")}>
          <ProfileIcon active={view === "profile"} />
          <span>Profile</span>
        </button>
      </nav> : null}

      {openProfile ? (
        <FullProfileModal
          person={openProfile}
          busy={pendingBookmarks.includes(openProfile.id)}
          onToggleBookmark={() => toggleBookmark(openProfile.id)}
          onClose={() => setOpenProfileId(null)}
        />
      ) : null}

      {tutorialOpen && (
        <div className="tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
          <div className="tutorial-card">
            <div className="tutorial-progress" aria-hidden="true">
              {TUTORIAL_CARDS.map((card, index) => (
                <span key={card.title} className={`tutorial-dot${index <= tutorialIndex ? " active" : ""}`} />
              ))}
            </div>

            <p className="tutorial-eyebrow">{tutorialStep.eyebrow}</p>
            <h2 id="tutorial-title" className="tutorial-title">
              {tutorialStep.title}
            </h2>
            <p className="tutorial-copy">{tutorialStep.body}</p>

            <div className="tutorial-preview">
              <div className="tutorial-preview-bar" />
              <div className="tutorial-preview-panel">
                <span className="tutorial-preview-chip">Home</span>
                <span className="tutorial-preview-chip">People</span>
                <span className="tutorial-preview-chip accent">Save</span>
              </div>
            </div>

            <div className="tutorial-actions">
              <button className="link-muted" type="button" onClick={() => closeTutorial(true, "/home")}>
                Skip to Home
              </button>
              {tutorialIndex < TUTORIAL_CARDS.length - 1 ? (
                <button className="btn-primary tutorial-btn" type="button" onClick={() => setTutorialIndex((value) => value + 1)}>
                  Next
                </button>
              ) : (
                <button className="btn-primary tutorial-btn" type="button" onClick={() => closeTutorial(true, "/home")}>
                  Open Home
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
