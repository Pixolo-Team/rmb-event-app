"use client";

// REACT //
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// COMPONENTS //
import Link from "next/link";
import type { Html5Qrcode } from "html5-qrcode";
import { AttendeeBottomTabs, type MenuAttendee } from "../components/AttendeeMenu";
import { AttendeeHeader } from "../components/AttendeeHeader";
import { InstallBanner } from "../components/InstallBanner";
import { PoweredByFooter } from "../components/PoweredByFooter";

// OTHERS //
import { distanceMeters } from "../lib/geo";
import {
  cacheVenueConfig,
  enqueueWrite,
  getCachedVenueConfig,
  useOfflineSync,
  type CachedVenueConfig,
  type QueueKind,
} from "../lib/offlineQueue";
import { resolveHomeMode, type HomeMode } from "../lib/homeMode";
import { refreshPersonalStats, statsCache, type PersonalStats } from "../lib/statsCache";
import { type MatchSuggestion } from "../lib/matchesCache";
import { profileCache, type MyProfile } from "../lib/profileCache";
import { withCsrfHeaders } from "../lib/csrf";
import { stopAndClearScanner } from "../lib/html5QrCode";

// F3.6/F3.7 — Home is one constant dashboard. The event's start/end times decide
// the top block (pre-event countdown · check-in · checked-in · ended); the rest —
// progress, people to meet — is always the same layout. Resolved once on load and
// after a check-in: no background polling re-flowing the screen.
type CheckinMethod = "GEOLOCATION" | "MANUAL" | "STAFF_QR" | "VENUE_QR";

// The check-in prompt runs inline in the top card rather than taking over the page.
type CheckinPhase = "idle" | "locating" | "scanning" | "submitting";

type Attendee = MenuAttendee & { tableNumber: string | null };

interface CheckinStatus {
  checkedIn: boolean;
  checkedInAt: string | null;
  method: CheckinMethod | null;
}

const METHOD_LABEL: Record<CheckinMethod, string> = {
  GEOLOCATION: "via location",
  MANUAL: "checked in at the desk",
  STAFF_QR: "staff scan",
  VENUE_QR: "via QR Code Scan",
};

// Within 3 days of the start we show a live ticking countdown; further out, a
// calmer "Coming soon" with the date. (PRD US3.5.)
const COUNTDOWN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_LIFECYCLE_TIMER_MS = 60 * 60 * 1000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HomePage() {
  const router = useRouter();
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [checkin, setCheckin] = useState<CheckinStatus | null>(null);
  const [event, setEvent] = useState<CachedVenueConfig | null>(null);
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [pendingSync, setPendingSync] = useState(false);
  const [confirmOffline, setConfirmOffline] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [checkinPhase, setCheckinPhase] = useState<CheckinPhase>("idle");
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [lifecycleNow, setLifecycleNow] = useState(() => Date.now());
  const coords = useRef<{ lat: number; lng: number } | null>(null);
  const venueConfig = useRef<CachedVenueConfig | null>(null);

  const { online } = useOfflineSync((kind: QueueKind, response) => {
    if (kind === "checkin-geolocation" || kind === "checkin-manual" || kind === "checkin-venue-qr") {
      const outcome = response as { checkedInAt?: string; method?: CheckinMethod } | null;
      if (outcome?.checkedInAt && outcome.method) {
        const syncedCheckin: CheckinStatus = { checkedIn: true, checkedInAt: outcome.checkedInAt, method: outcome.method };
        setCheckin(syncedCheckin);
      }
      setPendingSync(false);
    }
    if (kind === "meeting-scan") {
      refreshPersonalStats().catch(() => undefined);
    }
  });

  // These are live aggregates, so they are always requested from the API rather
  // than restored from local storage.
  const loadDashboardData = useCallback(async () => {
    try {
      await refreshPersonalStats();
    } catch {
      /* offline / unreachable — the cached figures stay on screen */
    }

    try {
      const res = await fetch("/api/matches", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches.slice(0, 3));
      }
    } catch {
      /* offline / unreachable — cached matches stay on screen */
    } finally {
      // Whatever happened, stop showing the people skeleton — an empty result now
      // renders a clear "no matches yet" state instead of blanking silently.
      setMatchesLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = statsCache.subscribe((nextStats) => {
      if (nextStats) setStats(nextStats);
    });

    const deadline = AbortSignal.timeout(12_000);

    Promise.all([
      fetch("/api/attendees/me", { credentials: "include", cache: "no-store", signal: deadline }),
      fetch("/api/checkin/me", { credentials: "include", cache: "no-store", signal: deadline }),
      fetch("/api/event", { cache: "no-store", signal: deadline })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(async ([meRes, checkinRes, eventConfig]) => {
        // Only a real auth rejection signs the attendee out; a 5xx is a sick server,
        // not a logout.
        if (meRes.status === 401 || meRes.status === 403) {
          profileCache.clear();
          router.replace("/login");
          return;
        }
        if (!meRes.ok || !checkinRes.ok) {
          setLoadFailed(true);
          return;
        }
        const me = await meRes.json();
        if (!me.profileCompletedAt) {
          router.replace("/onboarding");
          return;
        }
        const nextAttendee: Attendee = {
          name: me.name,
          businessName: me.businessName,
          chapterName: me.chapterName,
          photoUrl: me.photoUrl,
          tableNumber: me.tableNumber ?? null,
        };
        setAttendee(nextAttendee);
        profileCache.set(me as MyProfile);

        const config: CachedVenueConfig | null = eventConfig ?? (await getCachedVenueConfig());
        if (eventConfig) await cacheVenueConfig(eventConfig);
        venueConfig.current = config;
        setEvent(config);

        const status: CheckinStatus = await checkinRes.json();
        setCheckin(status);
        setReady(true);
        void loadDashboardData();
      })
      .catch(() => {
        setLoadFailed(true);
      });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute only at real lifecycle boundaries. A checked-in attendee who keeps
  // Home open past endAt must still see the ended state without refreshing.
  useEffect(() => {
    const now = Date.now();
    const boundaries = [event?.startAt, event?.endAt]
      .map((value) => (value ? new Date(value).getTime() : NaN))
      .filter((ms) => Number.isFinite(ms) && ms > now)
      .sort((a, b) => a - b);
    const nextBoundary = boundaries[0];
    if (!nextBoundary) return;

    const delay = Math.min(Math.max(0, nextBoundary - now + 250), MAX_LIFECYCLE_TIMER_MS);
    const id = window.setTimeout(() => setLifecycleNow(Date.now()), delay);
    return () => window.clearTimeout(id);
  }, [event, lifecycleNow]);

  const mode: HomeMode | null = useMemo(
    () => (checkin === null ? null : resolveHomeMode(event, checkin.checkedIn, lifecycleNow)),
    [event, checkin, lifecycleNow],
  );

  // ---- check-in flow (inline in the top card) ----

  const submitCheckin = useCallback(
    async (method: CheckinMethod, url: string, body: object, queueKind: QueueKind) => {
      setCheckinPhase("submitting");
      setCheckinError(null);

      const acceptOffline = async () => {
        await enqueueWrite(queueKind, url, body);
        const offlineCheckin: CheckinStatus = { checkedIn: true, checkedInAt: new Date().toISOString(), method };
        setCheckin(offlineCheckin);
        setPendingSync(true);
        setConfirmOffline(true);
        setCheckinPhase("idle");
      };

      if (!navigator.onLine) {
        await acceptOffline();
        return;
      }

      try {
        const res = await fetch(
          url,
          withCsrfHeaders({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(body),
          }),
        );
        const outcome = await res.json();
        if (outcome.status === "checked_in" || outcome.status === "already_checked_in") {
          const next: CheckinStatus = { checkedIn: true, checkedInAt: outcome.checkedInAt, method: outcome.method };
          setCheckin(next);
          setCheckinPhase("idle");
          loadDashboardData();
        } else if (outcome.status === "invalid_venue_token") {
          setCheckinError("That QR isn't valid for this event. Ask a staff member for help.");
          setCheckinPhase("scanning");
        } else {
          // outside_radius / venue_not_configured reaching here means location
          // didn't place us in range — fall through to scanning the venue QR.
          setCheckinError(null);
          setCheckinPhase("scanning");
        }
      } catch {
        await acceptOffline();
      }
    },
    [event, loadDashboardData],
  );

  function startCheckin() {
    setCheckinError(null);
    const config = venueConfig.current;
    // No usable location → go straight to scanning the venue QR.
    if (!navigator.geolocation || !config || config.venueLat == null || config.venueLng == null) {
      setCheckinError("Location check-in isn't available for this event right now. Use the venue QR instead.");
      setCheckinPhase("scanning");
      return;
    }

    setCheckinPhase("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        coords.current = { lat, lng };
        const distanceM = distanceMeters(lat, lng, config.venueLat!, config.venueLng!);
        if (distanceM <= config.checkinRadiusM) {
          submitCheckin("GEOLOCATION", "/api/checkin/geolocation", { lat, lng }, "checkin-geolocation");
        } else {
          setCheckinError("You're outside the venue radius. Move closer or scan the venue QR.");
          setCheckinPhase("scanning");
        }
      },
      () => {
        setCheckinError("We couldn't get your location. Try again, or scan the venue QR.");
        setCheckinPhase("scanning");
      },
      { timeout: 5000 },
    );
  }

  function startVenueScan() {
    setCheckinError(null);
    setCheckinPhase("scanning");
  }

  // Latest-value ref so the html5-qrcode decode callback (bound once) never runs a
  // stale submit closure.
  const onVenueScanRef = useRef<(text: string) => void>(() => {});
  onVenueScanRef.current = (text: string) => {
    let token = text.trim();
    try {
      const parsed = new URL(text);
      const venue = parsed.searchParams.get("venue");
      if (venue) token = venue;
    } catch {
      /* not a URL — treat the whole payload as the token */
    }
    submitCheckin("VENUE_QR", "/api/checkin/venue-qr", { token }, "checkin-venue-qr");
  };

  useEffect(() => {
    if (checkinPhase !== "scanning") return;
    let cancelled = false;
    let scanner: Html5Qrcode | undefined;
    const locked = { current: false };

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      scanner = new Html5Qrcode("home-qr-reader");
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (decodedText: string) => {
            if (locked.current) return;
            locked.current = true;
            onVenueScanRef.current(decodedText);
          },
          () => {
            /* per-frame "no QR yet" — expected */
          },
        )
        .catch(() => {
          setCheckinError("Couldn't open the camera. Ask a staff member to scan your badge.");
          setCheckinPhase("idle");
        });
    });

    return () => {
      cancelled = true;
      void stopAndClearScanner(scanner);
    };
  }, [checkinPhase]);

  // ---- render ----

  if (loadFailed) {
    return (
      <div className="home-dash attendee-tabbed-page">
        <PageHeader attendee={attendee} />
        <main className="home-dash-body">
          <div className="full-page-band tone-warning">
            <span className="ring warn lg">!</span>
            <h1>Can&rsquo;t load Home</h1>
          </div>
          <p className="copy">
            We couldn&rsquo;t reach the server. Check your connection and try again. If you&rsquo;re at the venue,
            use the entrance QR once the app is back online.
          </p>
          <button className="btn-primary" type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </main>
        {attendee && <AttendeeBottomTabs />}
      </div>
    );
  }

  if (!ready || mode === null) {
    return <HomeSkeleton attendee={attendee} />;
  }

  const firstName = attendee ? attendee.name.split(" ")[0] : "";
  const checkedIn = Boolean(checkin?.checkedIn);
  const liveCheckedIn = checkedIn && mode !== "ended";
  const startMs = event?.startAt ? new Date(event.startAt).getTime() : null;

  return (
    <div className="home-dash attendee-tabbed-page">
      <PageHeader attendee={attendee} />
      <InstallBanner />
      <main className="home-dash-body">
        <h1 className="home-greeting">Hi{firstName ? `, ${firstName}` : ""} 👋</h1>

        {!online && (
          <div className="banner info">
            <div>
              <b>You&rsquo;re offline</b>
              Showing your saved data. Anything you do will sync later.
            </div>
          </div>
        )}

        {/* ---- top block: depends on where we are in the event lifecycle ---- */}
        {mode === "pre_event" && <PreEventTop event={event} startMs={startMs} />}

        {mode === "ended" && (
          <div className="home-status-banner tone-ended">
            <span aria-hidden="true">🎉</span>
            <div>
              <b>The event has ended</b>
              <em>Your connections are saved.</em>
            </div>
          </div>
        )}

        {mode !== "pre_event" && mode !== "ended" && (
          liveCheckedIn ? (
            <CheckedInStrip checkin={checkin} pendingSync={pendingSync} confirmOffline={confirmOffline} />
          ) : (
            <CheckInCard
              phase={checkinPhase}
              error={checkinError}
              online={online}
              onStart={startCheckin}
              onScan={startVenueScan}
              onCancel={() => {
                setCheckinPhase("idle");
                setCheckinError(null);
              }}
            />
          )
        )}

        {liveCheckedIn && attendee?.tableNumber && (
          <div className="table-callout">
            <span>Your table</span>
            <strong>{attendee.tableNumber}</strong>
          </div>
        )}

        {/* ---- scan-to-connect: only during the live event, once checked in ---- */}
        {mode === "dashboard" && liveCheckedIn && (
          <button className="btn-primary home-scan-cta" type="button" onClick={() => router.push("/scan")}>
            Scan to connect
          </button>
        )}

        <div className="home-brand-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/rotary-rmb-lockup.jpg" alt="Rotary · Rotary Means Business Fellowship" />
        </div>

        {/* ---- your progress: once you have an attendance record ---- */}
        {(liveCheckedIn || mode === "ended") && <ProgressSection stats={stats} />}

        {/* ---- people to meet: always, with a skeleton + empty state ---- */}
        <PeopleToMeet matches={matches} loading={matchesLoading} />

        {mode === "pre_event" && (
          <Link href="/directory" className="btn-secondary home-secondary-cta">
            See who&rsquo;s coming
          </Link>
        )}
        {mode === "ended" && (
          <Link href="/summary" className="btn-secondary home-secondary-cta">
            View your summary
          </Link>
        )}

        <PoweredByFooter />
      </main>
      <AttendeeBottomTabs />
    </div>
  );
}

// ---------------------------------------------------------------- top blocks

function CheckInCard({
  phase,
  error,
  online,
  onStart,
  onScan,
  onCancel,
}: {
  phase: CheckinPhase;
  error: string | null;
  online: boolean;
  onStart: () => void;
  onScan: () => void;
  onCancel: () => void;
}) {
  const busy = phase === "locating" || phase === "submitting";

  return (
    <section className="home-checkin-card" aria-label="Check in">
      <div className="home-checkin-head">
        <span className="home-checkin-icon" aria-hidden="true">📍</span>
        <div>
          <b>You&rsquo;re not checked in yet</b>
          <em>We&rsquo;ll use your location — or scan the venue QR at the entrance.</em>
        </div>
      </div>

      {error && <div className="banner warn"><div>{error}</div></div>}

      {phase === "scanning" ? (
        <>
          <p className="home-checkin-hint">Point your camera at the venue QR code to check in.</p>
          <div id="home-qr-reader" className="home-qr-reader" />
          <div className="home-checkin-actions">
            <button className="btn-secondary" type="button" onClick={onStart}>
              Try location again
            </button>
            <button className="btn-secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="home-checkin-actions">
          <button className="btn-primary" type="button" disabled={busy} onClick={onStart}>
            {phase === "locating" ? (
              <>
                <span className="spinner" /> Finding the venue&hellip;
              </>
            ) : phase === "submitting" ? (
              <>
                <span className="spinner" /> Checking you in&hellip;
              </>
            ) : (
              "Check in with location"
            )}
          </button>
          {phase === "idle" && (
            <button className="btn-secondary" type="button" onClick={onScan}>
              Scan venue QR
            </button>
          )}
        </div>
      )}

      {!online && phase === "idle" && (
        <p className="home-checkin-hint">You&rsquo;re offline — checking in will confirm once you reconnect.</p>
      )}
    </section>
  );
}

function CheckedInStrip({
  checkin,
  pendingSync,
  confirmOffline,
}: {
  checkin: CheckinStatus | null;
  pendingSync: boolean;
  confirmOffline: boolean;
}) {
  return (
    <div className="checkin-strip is-static">
      <span className="checkin-strip-tick" aria-hidden="true">✓</span>
      <span className="checkin-strip-text">
        <b>Checked in{checkin?.checkedInAt ? ` · ${formatTime(checkin.checkedInAt)}` : ""}</b>
        <em>
          {checkin?.method ? METHOD_LABEL[checkin.method] : ""}
          {pendingSync ? " · syncing…" : confirmOffline ? " · saved offline" : ""}
        </em>
      </span>
    </div>
  );
}

function PreEventTop({ event, startMs }: { event: CachedVenueConfig | null; startMs: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  const withinCountdown = startMs !== null && startMs - now <= COUNTDOWN_WINDOW_MS;

  // A self-contained tick only while we're actually counting down — not the global
  // 30s mode re-check that used to re-flow the whole screen.
  useEffect(() => {
    if (!withinCountdown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [withinCountdown]);

  const name = event?.name || "The event";

  return (
    <section className="home-preevent" aria-label="Event countdown">
      <span className="home-preevent-eyebrow">{withinCountdown ? "Starting soon" : "Coming soon"}</span>
      <h2 className="home-preevent-name">{name}</h2>
      {event?.startAt && <p className="home-preevent-date">{formatEventDate(event.startAt)}</p>}
      {withinCountdown && startMs !== null && <Countdown ms={Math.max(0, startMs - now)} />}
      <Link className="home-preevent-details-link" href="/event">
        View event details
      </Link>
    </section>
  );
}

function Countdown({ ms }: { ms: number }) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: { value: number; label: string }[] = [
    ...(days > 0 ? [{ value: days, label: days === 1 ? "day" : "days" }] : []),
    { value: hours, label: "hrs" },
    { value: minutes, label: "min" },
    { value: seconds, label: "sec" },
  ];

  return (
    <div className="home-countdown" role="timer" aria-label="Time until the event starts">
      {parts.map((part) => (
        <div className="home-countdown-part" key={part.label}>
          <strong>{String(part.value).padStart(2, "0")}</strong>
          <span>{part.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- sections

function ProgressSection({ stats }: { stats: PersonalStats | null }) {
  const totalRanked = stats ? Math.max(stats.totalRanked, stats.rank ?? 0) : 0;

  return (
    <section className="profile-section home-progress-section" aria-label="Your progress">
      <h2>Your progress</h2>
      <div className="stats-grid home-stats-grid">
        <StatTile value={stats?.peopleMet ?? "—"} label="People met" />
        <StatTile value={stats ? formatRank(stats.rank) : "—"} sub={stats?.rank && totalRanked > 0 ? `of (${totalRanked})` : undefined} label="Rank" />
        <Link className="stat-tile home-stat-link" href="/matches" aria-label={`${stats?.bookmarks ?? 0} bookmarks. Open Want to Meet`}>
          <strong>{stats?.bookmarks ?? "-"}</strong>
          <span>Bookmarks</span>
        </Link>
      </div>
      {stats?.peopleMet === 0 && <p className="empty-copy home-nudge">No meetings yet. Start scanning!</p>}
    </section>
  );
}

function formatRank(rank: number | null) {
  return rank ? `#${rank}` : "Not ranked";
}

function PeopleToMeet({ matches, loading }: { matches: MatchSuggestion[]; loading: boolean }) {
  return (
    <section className="profile-section" aria-label="People to meet">
      <div className="home-section-head">
        <h2>People to meet</h2>
        {matches.length > 0 && (
          <Link href="/matches" className="link-muted">
            See all
          </Link>
        )}
      </div>

      {loading ? (
        <ul className="home-match-list" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="home-match home-match-skeleton">
              <span className="skeleton-block home-match-avatar" />
              <span className="home-match-text">
                <span className="skeleton-block home-match-line" />
                <span className="skeleton-block home-match-line short" />
              </span>
            </li>
          ))}
        </ul>
      ) : matches.length > 0 ? (
        <ul className="home-match-list">
          {matches.map((match) => (
            <li key={match.id}>
              <Link href={`/attendees/${match.id}`} className="home-match">
                <span className="home-match-avatar" aria-hidden="true">
                  {match.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <span className="home-match-text">
                  <b>{match.name}</b>
                  <em>{match.headline || match.businessName || ""}</em>
                </span>
                {match.checkedIn && <span className="badge badge-success">Present</span>}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-copy">No strong matches yet — complete your profile and check back as more people arrive.</p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- bits

function HomeSkeleton({ attendee }: { attendee: Attendee | null }) {
  return (
    <div className="home-dash attendee-tabbed-page" aria-busy="true" aria-label="Loading Home">
      <PageHeader attendee={attendee} />
      <main className="home-dash-body home-skeleton">
        <div className="home-skeleton-line greeting" />
        <div className="home-skeleton-block status" />
        <div className="home-skeleton-block action" />

        <section className="profile-section">
          <div className="home-skeleton-line section-title" />
          <div className="home-skeleton-stats">
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="profile-section">
          <div className="home-skeleton-line section-title" />
          <div className="home-skeleton-person"><i /><span /></div>
          <div className="home-skeleton-person"><i /><span /></div>
        </section>
      </main>
      {attendee && <AttendeeBottomTabs />}
    </div>
  );
}

function StatTile({ value, label, sub }: { value: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="stat-tile">
      <strong>{value}</strong>
      <span>{label}{sub && <em> {sub}</em>}</span>
    </div>
  );
}

function PageHeader({ attendee }: { attendee: Attendee | null }) {
  return <AttendeeHeader title="Home" attendee={attendee} />;
}
