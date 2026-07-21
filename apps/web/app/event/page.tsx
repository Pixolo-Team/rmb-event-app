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

export default function EventDetailsPage() {
  const [event, setEvent] = useState<CachedVenueConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCachedVenueConfig().then((cached) => {
      if (cached) {
        setEvent(cached);
        setLoading(false);
      }
    });

    fetch("/api/event")
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
              {event.startAt && <p className="event-details-date">{formatEventDate(event.startAt)}</p>}
            </section>

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
