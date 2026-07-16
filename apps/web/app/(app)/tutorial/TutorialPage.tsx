"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedView } from "./FeedView";

type AppView = "home" | "directory" | "connections" | "feed" | "settings";

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
  city: string | null;
  businessCategory: string | null;
  photoUrl?: string | null;
  profileCompletedAt: string | null;
};

type DirectoryAttendee = {
  id: string;
  name: string;
  businessName: string | null;
  chapterName: string | null;
  city: string | null;
  businessCategory: string | null;
  bio: string | null;
  phone: string;
  photoUrl: string | null;
  bookmarked: boolean;
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
  city: "Ahmedabad",
  businessCategory: "Trader/Distributor",
  photoUrl: null,
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
    bookmarked: false,
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
    bookmarked: true,
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
    bookmarked: false,
  },
];

const DEMO_PHOTOS: FeedPhotoData[] = [
  {
    id: "demo-photo-1",
    url: null,
    caption: "Great turnout at the RMB Ahmedabad mixer tonight!",
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    attendeeId: "demo-1",
    attendeeName: "Deepak Patel",
    attendeeBusinessName: "Patel Pipes",
    likeCount: 3,
    commentCount: 1,
    likedByMe: false,
    comments: [
      {
        id: "demo-comment-1",
        name: "Neha Shah",
        message: "Great meeting everyone!",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ],
  },
  {
    id: "demo-photo-2",
    url: null,
    caption: "My table setup for the evening.",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    attendeeId: "demo-attendee",
    attendeeName: "Radha Sharma",
    attendeeBusinessName: "Sharma Trading Co.",
    likeCount: 1,
    commentCount: 0,
    likedByMe: true,
    comments: [],
  },
];

const TUTORIAL_CARDS: readonly TutorialCard[] = [
  {
    eyebrow: "Welcome",
    title: "This is your event app",
    body: "Use Evento to get event-ready, find the right people, and keep the contacts you make in one place.",
  },
  {
    eyebrow: "Event Day",
    title: "Check in fast",
    body: "Open the app when you arrive. Evento will try location check-in first and gives you a manual fallback if needed.",
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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "EV";
}

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
  const [photos, setPhotos] = useState<FeedPhotoData[]>([]);

  useEffect(() => {
    if (TEMP_BYPASS_LOGIN) {
      setAttendee(DEMO_ATTENDEE);
      setDirectory(DEMO_DIRECTORY);
      setPhotos(DEMO_PHOTOS);
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
        }
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

  function closeTutorial(markSeen = true) {
    if (markSeen && typeof window !== "undefined") {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, new Date().toISOString());
    }
    setTutorialOpen(false);
    setTutorialIndex(0);
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
      const response = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attendeeId: personId }),
      });
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
            Evento
          </div>
          <div className="center-state">
            <span className="spinner" style={{ borderTopColor: "var(--brand-500)", borderColor: "var(--border)" }} />
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
            Evento
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

  return (
    <div className="app-shell-screen">
      <div className="app-shell">
        <header className="app-topbar">
          <div>
            <div className="wordmark app-wordmark">
              <span className="dot" />
              Evento
            </div>
            <p className="app-kicker">
              {view === "home" && "Attendee Home"}
              {view === "directory" && "Directory"}
              {view === "connections" && "My Connections"}
              {view === "feed" && "Photo Feed"}
              {view === "settings" && "Settings"}
            </p>
          </div>
          <button className="icon-action" type="button" onClick={restartTutorial}>
            Tutorial
          </button>
        </header>

        <nav className="app-nav">
          <button type="button" className={`nav-pill${view === "home" ? " active" : ""}`} onClick={() => setView("home")}>
            Home
          </button>
          <button type="button" className={`nav-pill${view === "directory" ? " active" : ""}`} onClick={() => setView("directory")}>
            People
          </button>
          <button type="button" className={`nav-pill${view === "connections" ? " active" : ""}`} onClick={() => setView("connections")}>
            Want to Meet
          </button>
          <button type="button" className={`nav-pill${view === "feed" ? " active" : ""}`} onClick={() => setView("feed")}>
            Photos
          </button>
          <button type="button" className={`nav-pill${view === "settings" ? " active" : ""}`} onClick={() => setView("settings")}>
            Settings
          </button>
        </nav>

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
            <section className="hero-card">
              <div className="hero-avatar" aria-hidden="true">
                {attendee.photoUrl ? <img src={attendee.photoUrl} alt="" /> : getInitials(attendee.name)}
              </div>
              <div>
                <p className="hero-eyebrow">Welcome</p>
                <h1 className="hero-title">{attendee.name.split(" ")[0]}, you&apos;re ready</h1>
                <p className="hero-copy">
                  Browse the directory, bookmark people worth meeting, and track them in Want to Meet.
                </p>
              </div>
            </section>

            <section className="status-grid">
              <article className="mini-card">
                <p className="mini-label">Bookmarked</p>
                <p className="mini-value">{wantToMeet.length}</p>
              </article>
              <article className="mini-card">
                <p className="mini-label">Business</p>
                <p className="mini-value">{attendee.businessName ?? "Your company"}</p>
              </article>
              <article className="mini-card">
                <p className="mini-label">Category</p>
                <p className="mini-value">{attendee.businessCategory ?? "Profile pending"}</p>
              </article>
              <article className="mini-card">
                <p className="mini-label">Chapter</p>
                <p className="mini-value">{attendee.chapterName ?? "Guest attendee"}</p>
              </article>
            </section>

            <section className="feature-stack">
              <article className="feature-card">
                <p className="feature-title">Try bookmarks</p>
                <p className="feature-copy">Open People, tap bookmark on any attendee card, then check Want to Meet.</p>
                <button className="btn-primary" type="button" onClick={() => setView("directory")}>
                  Browse people
                </button>
              </article>
            </section>
          </main>
        ) : null}

        {view === "directory" ? (
          <main className="app-content">
            <section className="settings-card">
              <h1 className="settings-title">Directory</h1>
              <p className="settings-copy">Bookmark people from any attendee card.</p>
              <div className="field" style={{ marginTop: 16 }}>
                <label htmlFor="directory-search">Search attendees</label>
                <input
                  id="directory-search"
                  placeholder="Name, city, company, chapter"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </section>

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
                />
              ))
            )}
          </main>
        ) : null}

        {view === "connections" ? (
          <main className="app-content">
            <section className="settings-card">
              <h1 className="settings-title">Want to Meet</h1>
              <p className="settings-copy">Your bookmarked attendees appear here.</p>
            </section>

            {wantToMeet.length === 0 ? (
              <section className="feature-card">
                <p className="feature-title">No one bookmarked yet</p>
                <p className="feature-copy">Browse the directory and tap bookmark to add people here.</p>
                <button className="btn-primary" type="button" onClick={() => setView("directory")}>
                  Open directory
                </button>
              </section>
            ) : (
              wantToMeet.map((person) => (
                <AttendeeCard
                  key={person.id}
                  person={person}
                  busy={pendingBookmarks.includes(person.id)}
                  onToggleBookmark={() => toggleBookmark(person.id)}
                />
              ))
            )}
          </main>
        ) : null}

        {view === "feed" ? <FeedView attendee={attendee} photos={photos} setPhotos={setPhotos} /> : null}

        {view === "settings" ? (
          <main className="app-content">
            <section className="settings-card">
              <h1 className="settings-title">Settings</h1>
              <p className="settings-copy">Replay the tutorial any time.</p>

              <button className="settings-row" type="button" onClick={restartTutorial}>
                <span>
                  <strong>First-time tutorial</strong>
                  <small>Open the 60-second walkthrough again</small>
                </span>
                <span>Open</span>
              </button>
            </section>
          </main>
        ) : null}
      </div>

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
              <button className="link-muted" type="button" onClick={() => closeTutorial(true)}>
                Skip
              </button>
              {tutorialIndex < TUTORIAL_CARDS.length - 1 ? (
                <button className="btn-primary tutorial-btn" type="button" onClick={() => setTutorialIndex((value) => value + 1)}>
                  Next
                </button>
              ) : (
                <button className="btn-primary tutorial-btn" type="button" onClick={() => closeTutorial(true)}>
                  Start using Evento
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttendeeCard({
  person,
  busy,
  onToggleBookmark,
}: {
  person: DirectoryAttendee;
  busy: boolean;
  onToggleBookmark: () => void;
}) {
  return (
    <article className="person-card">
      <div className="person-card-head">
        <div className="hero-avatar person-avatar" aria-hidden="true">
          {person.photoUrl ? <img src={person.photoUrl} alt="" /> : getInitials(person.name)}
        </div>
        <div className="person-meta">
          <h2 className="person-name">{person.name}</h2>
          <p className="person-line">{person.businessName ?? "Business details coming soon"}</p>
          <p className="person-line muted">
            {[person.businessCategory, person.city, person.chapterName].filter(Boolean).join(" · ") || "Attendee"}
          </p>
        </div>
      </div>
      {person.bio ? <p className="person-bio">{person.bio}</p> : null}
      <div className="person-actions">
        <button className={`bookmark-btn${person.bookmarked ? " active" : ""}`} type="button" disabled={busy} onClick={onToggleBookmark}>
          {busy ? "Saving..." : person.bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        <a className="person-link" href={`tel:${person.phone}`}>
          Call
        </a>
      </div>
    </article>
  );
}
