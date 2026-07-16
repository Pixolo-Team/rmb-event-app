-- CreateTable
CREATE TABLE "Bookmark" (
    "attendeeId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("attendeeId","targetId")
);

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Bookmark_attendeeId_createdAt_idx" ON "Bookmark"("attendeeId", "createdAt");

-- CreateIndex
CREATE INDEX "Bookmark_targetId_idx" ON "Bookmark"("targetId");
