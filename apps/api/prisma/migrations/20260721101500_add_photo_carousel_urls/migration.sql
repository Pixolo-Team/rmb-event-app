ALTER TABLE "Photo" ADD COLUMN "urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Photo" SET "urls" = ARRAY["url"] WHERE cardinality("urls") = 0;
