-- F3.7 — attendee self-check-in by scanning a printable venue QR.

-- New check-in method for the venue self-scan flow.
ALTER TYPE "CheckInMethod" ADD VALUE 'VENUE_QR';

-- Per-event token encoded in the venue attendance QR (null until first generated).
ALTER TABLE "Event" ADD COLUMN "venueCheckinToken" TEXT;
