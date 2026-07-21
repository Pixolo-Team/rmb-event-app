"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AttendeePageShell } from "../components/AttendeePageShell";
import { PoweredByFooter } from "../components/PoweredByFooter";
import { withCsrfHeaders } from "../lib/csrf";
import { trackEvent } from "../lib/gtag";

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [preview, setPreview] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setPreview(
      process.env.NODE_ENV !== "production" &&
        new URLSearchParams(location.search).get("preview") === "1",
    );
  }, []);

  async function submit() {
    if (!rating) return;
    setStatus("sending");

    try {
      if (!preview) {
        const response = await fetch(
          "/api/feedback",
          withCsrfHeaders({
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rating, comment }),
          }),
        );
        if (!response.ok) throw new Error();
      }
      setStatus("done");
      trackEvent("feedback_submitted", {
        feature: "feedback",
        target_type: "rating",
        success: true,
      });
    } catch {
      setStatus("error");
      trackEvent("feedback_submitted", {
        feature: "feedback",
        target_type: "rating",
        success: false,
      });
    }
  }

  function chooseRating(value: number) {
    if (!started) {
      setStarted(true);
      trackEvent("feedback_started", {
        feature: "feedback",
        target_type: "rating",
        success: true,
      });
    }
    setRating(value);
  }

  return (
    <AttendeePageShell showFooter={false}>
      <main className="attendee-page feedback-page">
        {status === "done" ? (
          <section className="feedback-success">
            <span>✓</span>
            <p className="eyebrow">Feedback received</p>
            <h1>Thanks for helping us improve.</h1>
            <p>Your response has been shared with the event organizer.</p>
            <Link className="btn-primary" href="/summary">
              View event summary
            </Link>
          </section>
        ) : (
          <>
            <div className="feedback-heading">
              <p className="eyebrow">Your experience</p>
              <h1>How was the event?</h1>
              <p>Your feedback helps make the next gathering even more valuable.</p>
            </div>

            <section className="feedback-card">
              <fieldset>
                <legend>How was your networking experience?</legend>
                <div className="star-rating" role="radiogroup" aria-label="Rating out of five">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={`${value} star${value === 1 ? "" : "s"}`}
                      onClick={() => chooseRating(value)}
                      className={value <= rating ? "selected" : ""}
                    >
                      ★
                    </button>
                  ))}
                </div>
                {rating > 0 ? (
                  <p className="rating-label">
                    {["", "Needs improvement", "Fair", "Good", "Very good", "Excellent"][rating]}
                  </p>
                ) : null}
              </fieldset>

              <label className="feedback-comment">
                <span>Anything else you&apos;d like to share?</span>
                <textarea
                  maxLength={500}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="What worked well, or what could be better?"
                />
                <small>{comment.length}/500</small>
              </label>

              {status === "error" ? (
                <p className="feedback-error" role="alert">
                  Couldn&apos;t submit feedback. Check your connection and try again.
                </p>
              ) : null}

              <div className="feedback-actions">
                <Link href="/summary">Skip for now</Link>
                <button
                  className="btn-primary"
                  type="button"
                  disabled={!rating || status === "sending"}
                  onClick={submit}
                >
                  {status === "sending" ? "Submitting..." : "Submit feedback"}
                </button>
              </div>
            </section>
          </>
        )}

        <PoweredByFooter />
      </main>
    </AttendeePageShell>
  );
}
