"use client";

import { useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { cacheVenueConfig, getCachedVenueConfig, type CachedVenueConfig } from "../lib/offlineQueue";

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  const india = digits.match(/^\+91(\d{10})$/);
  if (india) return `+91 ${india[1].slice(0, 5)} ${india[1].slice(5)}`;
  return raw;
}

function mapsUrl(event: CachedVenueConfig): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venueAddress ?? "")}`;
}

function clockParts(hhmm: string): { label: string; period: string } | null {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { label: `${hour12}:${String(m).padStart(2, "0")}`, period };
}

function formatAgendaTime(item: { startTime?: string; endTime?: string | null; time?: string }): string {
  if (!item.startTime) return item.time ?? "";
  const start = clockParts(item.startTime);
  if (!start) return item.startTime;
  if (!item.endTime) return `${start.label} ${start.period}`;
  const end = clockParts(item.endTime);
  if (!end) return `${start.label} ${start.period}`;
  // Drop the start period when both ends share it: "9:30 – 11:00 AM".
  const startText = start.period === end.period ? start.label : `${start.label} ${start.period}`;
  return `${startText} – ${end.label} ${end.period}`;
}

type AgendaState = "completed" | "active" | "upcoming";

function agendaDate(eventStart: string, hhmm?: string | null): Date | null {
  if (!hhmm) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const date = new Date(eventStart);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function getAgendaState(
  eventStart: string | null | undefined,
  item: { startTime?: string; endTime?: string | null },
  nextStartTime: string | undefined,
  now: Date,
): AgendaState {
  if (!eventStart) return "upcoming";
  const startsAt = agendaDate(eventStart, item.startTime);
  if (!startsAt) return "upcoming";
  const endsAt = agendaDate(eventStart, item.endTime) ?? agendaDate(eventStart, nextStartTime);
  if (now < startsAt) return "upcoming";
  if (!endsAt || now < endsAt) return "active";
  return "completed";
}

export default function EventDetailsPage() {
  const [event, setEvent] = useState<CachedVenueConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    getCachedVenueConfig().then((cached) => {
      if (cached) {
        setEvent(cached);
        setLoading(false);
      }
    });

    fetch("/api/event", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: CachedVenueConfig | null) => {
        if (data) {
          setEvent(data);
          cacheVenueConfig(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AttendeePageShell showFooter={false}>
      <main className="attendee-page event-details-page">
        {loading && !event ? (
          <div className="directory-loading">Loading event details...</div>
        ) : !event ? (
          <div className="directory-state">
            <h1>Can&apos;t load event details</h1>
            <p>Check your connection and try again.</p>
          </div>
        ) : (
          <>
            <section className="event-details-hero">
              <p className="eyebrow">Event details</p>
              <h1>{event.name || "The event"}</h1>
              {event.subtitle && <span className="event-details-subtitle">{event.subtitle}</span>}
              {event.startAt && <p className="event-details-date">{formatEventDate(event.startAt)}</p>}
            </section>

            <div className="home-brand-banner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/rotary-rmb-lockup.jpg" alt="Rotary · Rotary Means Business Fellowship" />
            </div>

            {event.chairName && (
              <section className="event-details-section">
                <h2>Chairperson</h2>
                <div className="event-chair-card">
                  {event.chairPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="event-chair-photo" src={event.chairPhotoUrl} alt={event.chairName} />
                  ) : (
                    <div className="event-chair-photo event-chair-photo-placeholder" aria-hidden="true">
                      {event.chairName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
                    </div>
                  )}
                  <div>
                    <p className="event-chair-name">{event.chairName}</p>
                    {event.chairTitle && <p className="event-chair-title">{event.chairTitle}</p>}
                  </div>
                </div>
              </section>
            )}

            {event.agenda && event.agenda.length > 0 && (
              <section className="event-details-section">
                <h2>Agenda</h2>
                <ol className="event-agenda-list">
                  {event.agenda.map((item, index) => {
                    const state = getAgendaState(event.startAt, item, event.agenda?.[index + 1]?.startTime, now);
                    return (
                    <li key={index} className={`event-agenda-row event-agenda-row-${state}`}>
                      <span className="event-agenda-marker" aria-label={state === "active" ? "In progress" : state} />
                      <span className="event-agenda-time">{formatAgendaTime(item)}</span>
                      <span className="event-agenda-body">
                        <span className="event-agenda-title">{item.title}</span>
                        {item.note && <span className="event-agenda-note">{item.note}</span>}
                      </span>
                    </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {event.venueAddress && (
              <section className="event-details-section">
                <h2>Venue</h2>
                <a className="contact-row" href={mapsUrl(event)} target="_blank" rel="noopener noreferrer">
                  <span className="contact-row-icon">
                    <PinIcon />
                  </span>
                  <span className="contact-row-body">
                    <span className="contact-row-label">Get directions</span>
                    <span className="contact-row-value">{event.venueAddress}</span>
                  </span>
                  <span className="contact-row-chevron contact-row-direction" aria-hidden="true">
                    <DirectionIcon />
                  </span>
                </a>
              </section>
            )}

            {(event.contactName || event.contactPhone) && (
              <section className="event-details-section">
                <h2>Contact</h2>
                <div className="contact-rows">
                  {event.contactPhone ? (
                    <a className="contact-row" href={`tel:${event.contactPhone.replace(/\s/g, "")}`}>
                      <span className="contact-row-icon">
                        <PhoneIcon />
                      </span>
                      <span className="contact-row-body">
                        <span className="contact-row-label">{event.contactName || "Phone"}</span>
                        <span className="contact-row-value">{formatPhone(event.contactPhone)}</span>
                      </span>
                    </a>
                  ) : (
                    <div className="contact-row contact-row-static">
                      <span className="contact-row-body">
                        <span className="contact-row-label">Contact</span>
                        <span className="contact-row-value">{event.contactName}</span>
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </AttendeePageShell>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5c0 8.3 6.7 15 15 15a2 2 0 0 0 2-2v-2.5a1 1 0 0 0-.8-1l-3-.6a1 1 0 0 0-1 .4l-.8 1.1a11.5 11.5 0 0 1-5-5l1.1-.8a1 1 0 0 0 .4-1l-.6-3a1 1 0 0 0-1-.8H6a2 2 0 0 0-2 2Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

function DirectionIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}
