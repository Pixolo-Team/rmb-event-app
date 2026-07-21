-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_attendeeId_fkey";

-- DropForeignKey
ALTER TABLE "Bookmark" DROP CONSTRAINT "Bookmark_targetId_fkey";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "agenda" JSONB,
ADD COLUMN     "chairName" TEXT,
ADD COLUMN     "chairPhotoUrl" TEXT,
ADD COLUMN     "chairTitle" TEXT,
ADD COLUMN     "registrationPricing" TEXT,
ADD COLUMN     "registrationUrl" TEXT,
ADD COLUMN     "subtitle" TEXT;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Attendee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
