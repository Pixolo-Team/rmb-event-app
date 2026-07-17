ALTER TABLE "Meeting"
ADD COLUMN "attendeeANote" TEXT,
ADD COLUMN "attendeeBNote" TEXT,
ADD COLUMN "attendeeAHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "attendeeBHidden" BOOLEAN NOT NULL DEFAULT false;
