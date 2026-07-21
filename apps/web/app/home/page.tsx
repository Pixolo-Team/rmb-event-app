"use client";

// REACT //
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// COMPONENTS //
import Link from "next/link";
import { AttendeeBottomTabs, AttendeeMenu, type MenuAttendee } from "../components/AttendeeMenu";
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
import { statsCache, type PersonalStats } from "../lib/statsCache";
import { matchesCache, type MatchSuggestion } from "../lib/matchesCache";
import { homeCache } from "../lib/homeCache";
import { profileCache, type MyProfile } from "../lib/profileCache";

// F3.6 — Home is lifecycle-aware (PRD US3.5, SCREENS 2.1): pre-event · arrival ·
// dashboard · ended. Only the arrival mode is the full-page check-in flow that
// shipped with F3.2; the other three exist because check-in is finished ~90
// seconds into a 7-hour event, and Home used to keep showing the receipt anyway.
type Step =
  | "loading"
  | "locating"
  | "arrived"
  | "confirming_arrival"
  | "need_manual"
  | "confirming_manual"
  | "checked_in";

type CheckinMethod = "GEOLOCATION" | "MANUAL" | "STAFF_QR";

type Attendee = MenuAttendee & { tableNumber: string | null };

interface CheckinStatus {
  checkedIn: boolean;
  checkedInAt: string | null;
  method: CheckinMethod | null;
}

const METHOD_LABEL: Record<CheckinMethod, string> = {
  GEOLOCATION: "via location",
  MANUAL: "manual",
  STAFF_QR: "staff scan",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  return hours > 0 ? `${hours}h ${totalMin % 60}m` : `${totalMin}m`;
}

// "in 3 days" / "in 3h 20m" — deliberately coarse. The countdown is orientation,
// not a launch clock, and a ticking seconds display would be noise.
//
// Days are *rounded*, not floored: an event 2d23h away is "in 3 days" to a human,
// and flooring it to "in 2 days" reads as plainly wrong the day before travel.
// Under 24h we switch to hours, where flooring is what people expect.
function formatCountdown(ms: number): string {
  if (ms <= 0) return "starting now";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  const days = Math.round(minutes / 1440);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
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
  const [step, setStep] = useState<Step>("loading");
  const [attendee, setAttendee] = useState<Attendee | null>(null);
  const [checkin, setCheckin] = useState<CheckinStatus | null>(null);
  const [event, setEvent] = useState<CachedVenueConfig | null>(null);
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [matches, setMatches] = useState<MatchSuggestion[]>([]);
  const [pendingSync, setPendingSync] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmOffline, setConfirmOffline] = useState(false);
  const [showDeskView, setShowDeskView] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const coords = useRef<{ lat: number; lng: number } | null>(null);
  const venueConfig = useRef<CachedVenueConfig | null>(null);

  const { online } = useOfflineSync((kind: QueueKind, response) => {
    if (kind === "checkin-geolocation" || kind === "checkin-manual") {
      const outcome = response as { checkedInAt?: string; method?: CheckinMethod } | null;
      if (outcome?.checkedInAt && outcome.method) {
        const syncedCheckin: CheckinStatus = { checkedIn: true, checkedInAt: outcome.checkedInAt, method: outcome.method };
        setCheckin(syncedCheckin);
        if (attendee) homeCache.set({ attendee, checkin: syncedCheckin, event });
      }
      setPendingSync(false);
    }
  });

  // Drives both the live "time at event" readout and the mode itself — an event
  // can start or end while the screen is open, and Home must follow.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Cache first, then refresh — and refresh *sequentially*. Both of these are
  // heavy aggregates, and firing them together starves the API's Prisma pool
  // (connection_limit=1 against the Supabase pooler), which times out at 10s and
  // takes Home's own requests down with it. Home is never blocked on either: it
  // renders from cache and fills in.
  const loadDashboardData = useCallback(async () => {
    const cachedStats = statsCache.get();
    if (cachedStats) setStats(cachedStats);
    const cachedMatches = matchesCache.get();
    if (cachedMatches) setMatches(cachedMatches.matches.slice(0, 3));

    try {
      const res = await fetch("/api/attendees/me/stats", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as PersonalStats;
        statsCache.set(data);
        setStats(data);
      }
    } catch {
      /* offline / unreachable — the cached figures stay on screen */
    }

    try {
      const res = await fetch("/api/matches", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        matchesCache.set(data);
        setMatches(data.matches.slice(0, 3));
      }
    } catch {
      /* offline / unreachable — cached matches stay on screen */
    }
  }, []);

  useEffect(() => {
    const cachedHome = homeCache.get();
    let renderedFromCache = false;

    if (cachedHome) {
      renderedFromCache = true;
      setAttendee(cachedHome.attendee);
      setCheckin(cachedHome.checkin);
      setEvent(cachedHome.event);
      venueConfig.current = cachedHome.event;
      setStep(cachedHome.checkin.checkedIn ? "checked_in" : "locating");
      loadDashboardData();
    }

    // The failure that actually bit here was a *hang*, not a rejection: a starved
    // API connection pool leaves the request in flight until it times out server
    // side. Without our own deadline the attendee just watches a spinner.
    const deadline = AbortSignal.timeout(12_000);

    Promise.all([
      fetch("/api/attendees/me", { credentials: "include", signal: deadline }),
      fetch("/api/checkin/me", { credentials: "include", signal: deadline }),
      fetch("/api/event", { signal: deadline })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(async ([meRes, checkinRes, eventConfig]) => {
        // Only a real auth rejection signs the attendee out. A 5xx used to land
        // them on the login screen too, which is a lie — they're signed in, the
        // server is just unwell — and on event day it would send someone to the
        // help desk over a blip.
        if (meRes.status === 401 || meRes.status === 403) {
          homeCache.clear();
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
        setAttendee({
          name: me.name,
          businessName: me.businessName,
          chapterName: me.chapterName,
          photoUrl: me.photoUrl,
          tableNumber: me.tableNumber ?? null,
        });
        profileCache.set(me as MyProfile);

        const config: CachedVenueConfig | null = eventConfig ?? (await getCachedVenueConfig());
        if (eventConfig) await cacheVenueConfig(eventConfig);
        venueConfig.current = config;
        setEvent(config);

        const status: CheckinStatus = await checkinRes.json();
        setCheckin(status);
        setStep(status.checkedIn ? "checked_in" : "locating");
        homeCache.set({
          attendee: {
            name: me.name,
            businessName: me.businessName,
            chapterName: me.chapterName,
            photoUrl: me.photoUrl,
            tableNumber: me.tableNumber ?? null,
          },
          checkin: status,
          event: config,
        });
        if (!renderedFromCache) loadDashboardData();
      })
      // Network down, request aborted at our deadline, or the API is unreachable —
      // an error the attendee can retry, not a sign-out.
      .catch(() => {
        if (!renderedFromCache) setLoadFailed(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mode: HomeMode | null = useMemo(
    () => (checkin === null ? null : resolveHomeMode(event, checkin.checkedIn, now)),
    [event, checkin, now],
  );

  // Geolocation runs only when Home is actually asking the attendee to check in.
  // Before F3.6 it ran unconditionally, so an attendee opening the group link five
  // days early got "Not checked in · Outside venue area" — a warning about a
  // problem that didn't exist yet.
  useEffect(() => {
    if (mode !== "arrival" || step !== "locating") return;

    if (!navigator.geolocation) {
      setReason("Location services off");
      setStep("need_manual");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        coords.current = { lat, lng };

        const config = venueConfig.current;
        if (!config || config.venueLat == null || config.venueLng == null) {
          setReason("Venue location isn't set up yet");
          setStep("need_manual");
          return;
        }

        const distanceM = distanceMeters(lat, lng, config.venueLat, config.venueLng);
        if (distanceM > config.checkinRadiusM) {
          setReason("Outside venue area");
          setStep("need_manual");
          return;
        }

        setStep("arrived");
      },
      () => {
        setReason("Geolocation failed");
        setStep("need_manual");
      },
      { timeout: 5000 },
    );
  }, [step, mode]);

  async function confirmCheckIn(kind: "geolocation" | "manual") {
    setStep(kind === "geolocation" ? "confirming_arrival" : "confirming_manual");
    setSubmitError(null);
    setConfirmOffline(false);

    const queueKind: QueueKind = kind === "geolocation" ? "checkin-geolocation" : "checkin-manual";
    const url = kind === "geolocation" ? "/api/checkin/geolocation" : "/api/checkin/manual";
    const body = kind === "geolocation" && coords.current ? coords.current : {};
    const method: CheckinMethod = kind === "geolocation" ? "GEOLOCATION" : "MANUAL";

    const acceptOffline = async () => {
      await enqueueWrite(queueKind, url, body);
      const offlineCheckin: CheckinStatus = { checkedIn: true, checkedInAt: new Date().toISOString(), method };
      setCheckin(offlineCheckin);
      if (attendee) homeCache.set({ attendee, checkin: offlineCheckin, event });
      setPendingSync(true);
      setConfirmOffline(true);
      setStep("checked_in");
      setShowDeskView(true);
    };

    if (!navigator.onLine) {
      await acceptOffline();
      return;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const outcome = await res.json();
      if (outcome.status === "checked_in" || outcome.status === "already_checked_in") {
        const nextCheckin: CheckinStatus = { checkedIn: true, checkedInAt: outcome.checkedInAt, method: outcome.method };
        setCheckin(nextCheckin);
        if (attendee) homeCache.set({ attendee, checkin: nextCheckin, event });
        setStep("checked_in");
        // Land on the desk view first: the attendee just tapped "Check in" and the
        // next thing they do is show this to the registration counter.
        setShowDeskView(true);
        loadDashboardData();
      } else {
        setSubmitError("Can't check in. Try again or ask staff to scan your QR.");
        setStep(kind === "geolocation" ? "arrived" : "confirming_manual");
      }
    } catch {
      // Network dropped mid-submit — queue it rather than surfacing an error.
      await acceptOffline();
    }
  }

  const firstName = attendee ? attendee.name.split(" ")[0] : "";

  // A slow or failing API must not leave Home spinning forever — that's the trap
  // /profile still falls into. An unreachable server is an error the attendee can
  // retry, not an indefinite "Loading…".
  if (loadFailed) {
    return (
      <div className="full-page">
        <PageHeader attendee={attendee} />
        <div className="full-page-band tone-warning">
          <span className="ring warn lg">!</span>
          <h1>Can&rsquo;t load Home</h1>
        </div>
        <div className="full-page-body">
          <p className="copy">
            We couldn&rsquo;t reach the server. Check your connection and try again — you can still be
            checked in by staff at the desk.
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (step === "loading" || mode === null) {
    return <HomeSkeleton attendee={attendee} />;
  }

  if (mode === "pre_event") {
    return (
      <PreEventMode
        attendee={attendee}
        event={event}
        matches={matches}
        now={now}
        online={online}
      />
    );
  }

  if (mode === "ended") {
    return <EndedMode attendee={attendee} stats={stats} online={online} />;
  }

  if (mode === "dashboard" && !showDeskView) {
    return (
      <DashboardMode
        attendee={attendee}
        checkin={checkin}
        stats={stats}
        matches={matches}
        now={now}
        online={online}
        pendingSync={pendingSync}
        onShowDeskView={() => setShowDeskView(true)}
        onScan={() => router.push("/scan")}
      />
    );
  }

  // ----- Arrival mode (unchanged from F3.2) + the expanded desk view -----

  if (step === "locating") {
    return (
      <div className="full-page">
        <PageHeader attendee={attendee} />
        <div className="full-page-band tone-info">
          <span className="ring info lg">📍</span>
          <h1>Finding the venue…</h1>
        </div>
        <div className="full-page-body">
          <p className="copy" style={{ textAlign: "center" }}>Hold on while we check your location.</p>
        </div>
        {attendee && <AttendeeBottomTabs />}
      </div>
    );
  }

  if (step === "arrived" || step === "confirming_arrival") {
    return (
      <div className="full-page attendee-tabbed-page">
        <PageHeader attendee={attendee} />
        <div className="full-page-band tone-success">
          <span className="ring ok lg">📍</span>
          <h1>You&rsquo;ve arrived</h1>
        </div>
        <div className="full-page-body">
          <p className="copy">
            Hey{firstName ? `, ${firstName}` : ""} — you&rsquo;re near the venue. Check yourself in to start
            networking.
          </p>
          {submitError && (
            <div className="banner warn">
              <div>{submitError}</div>
            </div>
          )}
          <button className="btn-primary" disabled={step === "confirming_arrival"} onClick={() => confirmCheckIn("geolocation")}>
            {step === "confirming_arrival" ? (
              <>
                <span className="spinner" /> Checking you in&hellip;
              </>
            ) : (
              "Check in"
            )}
          </button>
          <button className="link-muted" disabled={step === "confirming_arrival"} onClick={() => setStep("need_manual")}>
            Not at the venue yet?
          </button>
        </div>
        {attendee && <AttendeeBottomTabs />}
      </div>
    );
  }

  if (step === "need_manual" || step === "confirming_manual") {
    return (
      <div className="full-page attendee-tabbed-page">
        <PageHeader attendee={attendee} />
        <div className="full-page-band tone-warning">
          <span className="ring warn lg">!</span>
          <h1>Not checked in</h1>
        </div>
        <div className="full-page-body">
          <p className="copy">{reason ?? "Confirm you're at the venue to start networking."}</p>
          {submitError && (
            <div className="banner warn">
              <div>{submitError}</div>
            </div>
          )}
          <button className="btn-warning" disabled={step === "confirming_manual"} onClick={() => confirmCheckIn("manual")}>
            {step === "confirming_manual" ? (
              <>
                <span className="spinner" /> Marking you present&hellip;
              </>
            ) : (
              "Check in manually"
            )}
          </button>
        </div>
        {attendee && <AttendeeBottomTabs />}
      </div>
    );
  }

  // The desk view — what the attendee shows at the registration counter. It is
  // reached by tapping the dashboard's check-in strip, and directly after a
  // successful check-in.
  return (
    <div className="full-page attendee-tabbed-page">
      <PageHeader attendee={attendee} />
      <div className="full-page-band tone-success">
        <span className="ring ok lg">✓</span>
        <h1>Checked in{checkin?.checkedInAt ? ` · ${formatTime(checkin.checkedInAt)}` : ""}</h1>
      </div>
      <div className="full-page-body">
        {!online && (
          <div className="banner info">
            <div>
              <b>You&rsquo;re offline</b>
              This will sync once you&rsquo;re back online.
            </div>
          </div>
        )}
        {confirmOffline && (
          <div className="banner info">
            <div>
              <b>Saved offline</b>
              Will confirm with the server once you&rsquo;re back online.
            </div>
          </div>
        )}

        <div className="field" style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: "1.05rem", margin: "0 0 4px" }}>{attendee?.name}</p>
          {attendee?.businessName && <p style={{ color: "var(--ink-muted)", margin: 0 }}>{attendee.businessName}</p>}
        </div>

        <div className="banner ok" style={{ textAlign: "center" }}>
          <div>
            <b>Show this screen at the registration counter</b>
            {checkin?.method && `Checked in ${METHOD_LABEL[checkin.method]}${pendingSync ? " · syncing…" : ""}`}
          </div>
        </div>

        <button className="btn-primary" onClick={() => setShowDeskView(false)}>
          Done — go to Home
        </button>
      </div>
      {attendee && <AttendeeBottomTabs />}
    </div>
  );
}

// ---------------------------------------------------------------- modes

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

function DashboardMode({
  attendee,
  checkin,
  stats,
  matches,
  now,
  online,
  pendingSync,
  onShowDeskView,
  onScan,
}: {
  attendee: Attendee | null;
  checkin: CheckinStatus | null;
  stats: PersonalStats | null;
  matches: MatchSuggestion[];
  now: number;
  online: boolean;
  pendingSync: boolean;
  onShowDeskView: () => void;
  onScan: () => void;
}) {
  const firstName = attendee ? attendee.name.split(" ")[0] : "";
  const timeAtEvent =
    stats?.checkedInAt
      ? formatDuration(
          Math.min(now, stats.eventEndAt ? new Date(stats.eventEndAt).getTime() : now) -
            new Date(stats.checkedInAt).getTime(),
        )
      : null;

  return (
    <div className="home-dash">
      <PageHeader attendee={attendee} />
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

        {/* The desk receipt shrinks to a strip once it's done its job — but it
            stays one tap away, because staff still ask to see it. */}
        <button type="button" className="checkin-strip" onClick={onShowDeskView}>
          <span className="checkin-strip-tick" aria-hidden="true">✓</span>
          <span className="checkin-strip-text">
            <b>
              Checked in{checkin?.checkedInAt ? ` · ${formatTime(checkin.checkedInAt)}` : ""}
            </b>
            <em>
              {checkin?.method ? METHOD_LABEL[checkin.method] : ""}
              {pendingSync ? " · syncing…" : ""} · Tap to show at the desk
            </em>
          </span>
        </button>

        {attendee?.tableNumber && (
          <div className="table-callout">
            <span>Your table</span>
            <strong>{attendee.tableNumber}</strong>
          </div>
        )}

        <button className="btn-primary home-scan-cta" onClick={onScan}>
          Scan to connect
        </button>

        <section className="profile-section" aria-label="Your progress">
          <h2>Your progress</h2>
          <div className="stats-grid home-stats-grid">
            <StatTile value={stats?.peopleMet ?? "—"} label="People met" />
            <StatTile
              value={stats ? `#${stats.rank}` : "—"}
              sub={stats ? `of ${stats.totalRanked}` : undefined}
              label="Rank"
            />
            <StatTile value={timeAtEvent ?? "—"} label="Time at event" />
          </div>
          {stats?.peopleMet === 0 && (
            <p className="empty-copy home-nudge">No meetings yet. Start scanning!</p>
          )}
        </section>

        {matches.length > 0 && (
          <section className="profile-section" aria-label="People to meet">
            <div className="home-section-head">
              <h2>People to meet</h2>
              <Link href="/matches" className="link-muted">See all</Link>
            </div>
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
                    {match.checkedIn && <span className="badge badge-success">Here</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PoweredByFooter />
      </main>
      <AttendeeBottomTabs />
    </div>
  );
}

function PreEventMode({
  attendee,
  event,
  matches,
  now,
  online,
}: {
  attendee: Attendee | null;
  event: CachedVenueConfig | null;
  matches: MatchSuggestion[];
  now: number;
  online: boolean;
}) {
  const firstName = attendee ? attendee.name.split(" ")[0] : "";
  const startMs = event?.startAt ? new Date(event.startAt).getTime() : null;

  return (
    <div className="home-dash">
      <PageHeader attendee={attendee} />
      <div className="full-page-band tone-info">
        <span className="ring info lg">🗓️</span>
        <h1>{event?.name || "The event"} starts {startMs ? formatCountdown(startMs - now) : "soon"}</h1>
      </div>
      <main className="home-dash-body">
        {!online && (
          <div className="banner info">
            <div>
              <b>You&rsquo;re offline</b>
              Showing your saved event details.
            </div>
          </div>
        )}
        <p className="copy">
          You&rsquo;re all set{firstName ? `, ${firstName}` : ""}. We&rsquo;ll check you in when you arrive — until
          then, get a head start on who you want to meet.
        </p>
        {event?.startAt && <p className="home-event-when">{formatEventDate(event.startAt)}</p>}

        <Link href="/directory" className="btn-primary home-scan-cta">See who&rsquo;s coming</Link>

        {matches.length > 0 && (
          <section className="profile-section" aria-label="People to meet">
            <div className="home-section-head">
              <h2>People to meet</h2>
              <Link href="/matches" className="link-muted">See all</Link>
            </div>
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
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PoweredByFooter />
      </main>
      <AttendeeBottomTabs />
    </div>
  );
}

function EndedMode({
  attendee,
  stats,
  online,
}: {
  attendee: Attendee | null;
  stats: PersonalStats | null;
  online: boolean;
}) {
  return (
    <div className="full-page attendee-tabbed-page">
      <PageHeader attendee={attendee} />
      <div className="full-page-band tone-success">
        <span className="ring ok lg">🎉</span>
        <h1>That&rsquo;s a wrap</h1>
      </div>
      <div className="full-page-body">
        {!online && (
          <div className="banner info">
            <div>
              <b>You&rsquo;re offline</b>
              Showing your saved summary.
            </div>
          </div>
        )}
        <p className="copy">
          {stats && stats.peopleMet > 0
            ? `You met ${stats.peopleMet} ${stats.peopleMet === 1 ? "person" : "people"} — your connections are saved.`
            : "The event has ended. Your connections are saved."}
        </p>
        <Link href="/summary" className="btn-primary home-scan-cta">View your summary</Link>
        <Link href="/connections" className="link-muted">See all your connections</Link>

        <PoweredByFooter />
      </div>
      <AttendeeBottomTabs />
    </div>
  );
}

// ---------------------------------------------------------------- bits

function StatTile({ value, label, sub }: { value: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="stat-tile">
      <strong>{value}</strong>
      {sub && <em>{sub}</em>}
      <span>{label}</span>
    </div>
  );
}

function PageHeader({ attendee }: { attendee: Attendee | null }) {
  return (
    <div className="full-page-header attendee-app-header">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/rmb-fellowship-logo.png"
        alt="Rotary Means Business Fellowship"
        className="app-topbar-brand"
        width={50}
        height={50}
      />
      <h1 className="app-header-title">Home</h1>
      {attendee && <AttendeeMenu attendee={attendee} />}
      {!attendee && <span className="app-header-spacer" aria-hidden="true" />}
    </div>
  );
}
