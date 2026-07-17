-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN "linkedInUrl" TEXT;

-- CreateTable
CREATE TABLE "Meeting" (
    "attendeeAId" TEXT NOT NULL,
    "attendeeBId" TEXT NOT NULL,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("attendeeAId","attendeeBId")
);

-- CreateIndex
CREATE INDEX "Meeting_attendeeAId_idx" ON "Meeting"("attendeeAId");

-- CreateIndex
CREATE INDEX "Meeting_attendeeBId_idx" ON "Meeting"("attendeeBId");

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_attendeeAId_fkey" FOREIGN KEY ("attendeeAId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_attendeeBId_fkey" FOREIGN KEY ("attendeeBId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
