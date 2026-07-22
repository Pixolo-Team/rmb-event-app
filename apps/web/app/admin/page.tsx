"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const TOOLS = [
  { href: "/admin/import", title: "Attendee Import", desc: "Upload the guest list (CSV / Excel)" },
  { href: "/admin/attendees", title: "Manage Attendees", desc: "View roster & soft delete records" },
  { href: "/admin/event", title: "Event Settings", desc: "Event details, venue location & check-in radius" },
  { href: "/admin/checkin", title: "Live Check-In", desc: "Staff QR scan & arrival dashboard" },
  { href: "/admin/badges", title: "Print Badges", desc: "QR badges for the registration desk" },
  { href: "/admin/feed", title: "Photo Moderation", desc: "Review & remove event photos" },
  { href: "/admin/feedback", title: "Feedback", desc: "Ratings & comments analytics" },
];

type Breakdown = { GEOLOCATION: number; MANUAL: number; STAFF_QR: number; VENUE_QR: number };
type ChapterSummary = { chapterName: string; registrations: number; attendance: number };
type Leader = { id: string; rank: number; name: string; businessName: string | null; metCount: number };
type TimePoint = { label: string; checkIns: number; meetings: number };
type DashboardData = {
  generatedAt: string;
  event: { name: string; startAt: string | null; endAt: string | null; state: "upcoming" | "live" | "ended" };
  totals: {
    attendees: number;
    checkedIn: number;
    notCheckedIn: number;
    meetings: number;
    averageMeetingsPerCheckedIn: number;
    checkInPercent: number;
    engagementPercent: number;
    engagedCheckedIn: number;
    photos: number;
    likes: number;
    feedbackResponses: number;
    feedbackAverage: number;
  };
  breakdown: Breakdown;
  chapterSummaries: ChapterSummary[];
  topConnectors: Leader[];
  timeseries: { windowLabel: string; points: TimePoint[] };
};

const CACHE_KEY = "evento-admin-analytics-v1";
const REFRESH_MS = 30000;

export default function AdminHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnline(navigator.onLine);
    const cached = window.localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setData(JSON.parse(cached) as DashboardData);
        setLoading(false);
      } catch {}
    }

    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/analytics", { credentials: "include" });
        if (!response.ok) throw new Error("Failed to load analytics");
        const next = (await response.json()) as DashboardData;
        if (cancelled) return;
        setData(next);
        setError(false);
        setLoading(false);
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    }

    load();
    const interval = window.setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  async function exportReport(format: "csv" | "pdf") {
    setExporting(format);
    try {
      const response = await fetch(getApiExportUrl(format), {
        credentials: "include",
      });
      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || "Failed to export analytics");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const contentDisposition = response.headers.get("content-disposition");
      const fileName = getFilenameFromDisposition(contentDisposition) ?? `evento-admin-analytics.${format}`;

      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } finally {
      setExporting(null);
    }
  }

  const chartMax = useMemo(
    () => Math.max(1, ...(data?.timeseries.points.flatMap((point) => [point.checkIns, point.meetings]) ?? [1])),
    [data],
  );

  const stale = !online && !!data;
  const chapterSummaries = data?.chapterSummaries ?? [];
  const formattedUpdatedAt = data
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.generatedAt))
    : null;

  return (
    <main className="admin-page admin-overview">
      <div className="admin-hub-head">
        <div>
          <p className="eyebrow">Organizer</p>
          <h1>Admin analytics</h1>
          <p className="admin-overview-copy">
            Live overview of attendance, networking activity, and event sentiment.
          </p>
        </div>
        <div className="admin-overview-actions">
          <div className="admin-overview-status">
            {stale && <span className="admin-status-pill">Offline cache</span>}
            {formattedUpdatedAt && <span className="admin-updated-at">Updated {formattedUpdatedAt}</span>}
          </div>
          <div className="admin-overview-buttons">
            <button
              className="btn-secondary"
              type="button"
              onClick={() => exportReport("csv")}
              disabled={exporting !== null}
            >
              {exporting === "csv" ? "Exporting CSV…" : "Export CSV"}
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => exportReport("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? "Exporting PDF…" : "Export PDF"}
            </button>
          </div>
        </div>
      </div>

      {error && !data && (
        <div className="banner warn">
          <div>
            <b>Can’t load dashboard</b>
            Refresh the page to try again.
          </div>
        </div>
      )}

      <section className="admin-analytics-grid">
        <MetricCard
          label="Checked in"
          value={`${data?.totals.checkedIn ?? "—"} / ${data?.totals.attendees ?? "—"}`}
          detail={data ? `${formatPercent(data.totals.checkInPercent)} of expected attendees` : "Loading attendance"}
          href="/admin/checkin"
          loading={loading}
        />
        <MetricCard
          label="Meetings logged"
          value={data?.totals.meetings ?? "—"}
          detail={data ? `${data.totals.engagedCheckedIn} attendees have met someone` : "Loading meetings"}
          loading={loading}
        />
        <MetricCard
          label="Avg per attendee"
          value={data ? data.totals.averageMeetingsPerCheckedIn.toFixed(1) : "—"}
          detail="Confirmed meetings per checked-in attendee"
          loading={loading}
        />
        <MetricCard
          label="Engagement"
          value={data ? formatPercent(data.totals.engagementPercent) : "—"}
          detail="Checked-in attendees with at least one meeting"
          loading={loading}
        />
      </section>

      <section className="admin-overview-panels">
        <article className="admin-overview-panel">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">Time series</p>
              <h2>Activity trend</h2>
            </div>
            <span>{data?.timeseries.windowLabel ?? "Last 8 hours"}</span>
          </div>
          {loading && !data ? (
            <div className="admin-chart-skeleton" />
          ) : (
            <div className="admin-timeseries">
              {data?.timeseries.points.map((point) => (
                <div key={point.label} className="admin-timeseries-group">
                  <div className="admin-timeseries-bars">
                    <span
                      title={`${point.checkIns} check-ins`}
                      className="checkins"
                      style={{ height: `${(point.checkIns / chartMax) * 100}%` }}
                    />
                    <span
                      title={`${point.meetings} meetings`}
                      className="meetings"
                      style={{ height: `${(point.meetings / chartMax) * 100}%` }}
                    />
                  </div>
                  <small>{point.label}</small>
                </div>
              ))}
            </div>
          )}
          <div className="admin-timeseries-legend">
            <span><i className="checkins" /> Check-ins</span>
            <span><i className="meetings" /> Meetings</span>
          </div>
        </article>

        <article className="admin-overview-panel">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">Leaders</p>
              <h2>Top connectors</h2>
            </div>
            <span>Live ranking</span>
          </div>
          {loading && !data ? (
            <div className="admin-list-skeleton" />
          ) : data?.topConnectors.length ? (
            <div className="admin-leader-list">
              {data.topConnectors.map((leader) => (
                <div key={leader.id} className="admin-leader-row">
                  <strong>#{leader.rank}</strong>
                  <div>
                    <b>{leader.name}</b>
                    <span>{leader.businessName ?? "Attendee"}</span>
                  </div>
                  <em>{leader.metCount} met</em>
                </div>
              ))}
            </div>
          ) : (
            <div className="directory-state">
              <h2>No networking yet</h2>
              <p>Top connectors will appear once attendees start scanning each other.</p>
            </div>
          )}
        </article>
      </section>

      <section className="admin-overview-panels">
        <article className="admin-overview-panel">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">Check-in mix</p>
              <h2>Arrival methods</h2>
            </div>
            <Link href="/admin/checkin">Open check-in desk</Link>
          </div>
          <div className="admin-method-grid">
            <SmallStat label="Via location" value={data?.breakdown.GEOLOCATION ?? "—"} />
            <SmallStat label="Venue scan" value={data?.breakdown.VENUE_QR ?? "—"} />
            <SmallStat label="Manual" value={data?.breakdown.MANUAL ?? "—"} />
            <SmallStat label="Staff scan" value={data?.breakdown.STAFF_QR ?? "—"} />
          </div>
        </article>

        <article className="admin-overview-panel">
          <div className="admin-panel-head">
            <div>
              <p className="eyebrow">Sentiment</p>
              <h2>Feedback & feed</h2>
            </div>
            <Link href="/admin/feedback">Open feedback</Link>
          </div>
          <div className="admin-method-grid">
            <SmallStat label="Avg rating" value={data ? data.totals.feedbackAverage.toFixed(1) : "—"} />
            <SmallStat label="Responses" value={data?.totals.feedbackResponses ?? "—"} />
            <SmallStat label="Photos" value={data?.totals.photos ?? "—"} />
            <SmallStat label="Likes" value={data?.totals.likes ?? "—"} />
          </div>
        </article>
      </section>

      <section className="admin-overview-panel admin-tool-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">Chapter wise count</p>
            <h2>Registrations & attendance summary</h2>
          </div>
          <span>{chapterSummaries.length} chapters</span>
        </div>
        {loading && !data ? (
          <div className="admin-list-skeleton" />
        ) : chapterSummaries.length ? (
          <div className="admin-chapter-summary-table">
            <div className="admin-chapter-summary-head">
              <span>Chapter</span>
              <span><span className="wide-label">Registrations</span><span className="short-label">Reg.</span></span>
              <span><span className="wide-label">Attendance</span><span className="short-label">Att.</span></span>
            </div>
            {chapterSummaries.map((summary) => (
              <div key={summary.chapterName} className="admin-chapter-summary-row">
                <b>{summary.chapterName}</b>
                <strong>{summary.registrations}</strong>
                <strong>{summary.attendance}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="directory-state">
            <h2>No chapter data</h2>
            <p>Chapter counts will appear after attendees are imported.</p>
          </div>
        )}
      </section>

      <section className="admin-overview-panel admin-tool-panel">
        <div className="admin-panel-head">
          <div>
            <p className="eyebrow">Console</p>
            <h2>Admin tools</h2>
          </div>
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
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  href,
  loading,
}: {
  label: string;
  value: string | number;
  detail: string;
  href?: string;
  loading: boolean;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong className={loading ? "is-loading" : undefined}>{value}</strong>
      <small>{detail}</small>
    </>
  );

  return href ? (
    <Link className="admin-metric-card" href={href}>
      {content}
    </Link>
  ) : (
    <div className="admin-metric-card">{content}</div>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="admin-small-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getApiExportUrl(format: "csv" | "pdf") {
  const base =
    typeof window === "undefined"
      ? "http://localhost:4000"
      : `${window.location.protocol}//${window.location.hostname}:4000`;
  return `${base}/admin/analytics/export?format=${format}`;
}

function getFilenameFromDisposition(header: string | null) {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const plainMatch = header.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? null;
}
