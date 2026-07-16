-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "attendeeAId" TEXT NOT NULL,
    "attendeeBId" TEXT NOT NULL,
    "scannedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Meeting_attendeeAId_idx" ON "Meeting"("attendeeAId");

-- CreateIndex
CREATE INDEX "Meeting_attendeeBId_idx" ON "Meeting"("attendeeBId");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_attendeeAId_attendeeBId_key" ON "Meeting"("attendeeAId", "attendeeBId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_attendeeAId_fkey" FOREIGN KEY ("attendeeAId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_attendeeBId_fkey" FOREIGN KEY ("attendeeBId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
