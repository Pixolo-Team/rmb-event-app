-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN "name" TEXT;

-- Backfill existing rows so the column can become NOT NULL
UPDATE "AdminUser" SET "name" = "username" WHERE "name" IS NULL;

-- AlterTable
ALTER TABLE "AdminUser" ALTER COLUMN "name" SET NOT NULL;
