ALTER TABLE "Attendee" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Attendee_deletedAt_idx" ON "Attendee"("deletedAt");
