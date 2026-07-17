CREATE TABLE "Feedback" (
  "id" TEXT NOT NULL,
  "attendeeId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Feedback_attendeeId_createdAt_idx" ON "Feedback"("attendeeId", "createdAt");
CREATE INDEX "Feedback_rating_createdAt_idx" ON "Feedback"("rating", "createdAt");
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
