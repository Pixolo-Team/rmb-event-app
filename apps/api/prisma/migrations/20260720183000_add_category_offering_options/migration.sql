CREATE TABLE "OfferingOption" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferingOption_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OfferingOption_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "BusinessCategoryOption"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OfferingOption_categoryId_name_key"
  ON "OfferingOption"("categoryId", "name");

CREATE INDEX "OfferingOption_categoryId_active_sortOrder_idx"
  ON "OfferingOption"("categoryId", "active", "sortOrder");

INSERT INTO "BusinessCategoryOption" ("id", "name", "sortOrder")
VALUES (gen_random_uuid()::text, 'Technology', 10)
ON CONFLICT ("name") DO UPDATE
SET "active" = true, "sortOrder" = EXCLUDED."sortOrder";

INSERT INTO "OfferingOption" ("id", "categoryId", "name", "sortOrder")
SELECT gen_random_uuid()::text, category."id", offering."name", offering."sortOrder"
FROM "BusinessCategoryOption" category
CROSS JOIN (VALUES
  ('Web Development', 10),
  ('Mobile App Development', 20),
  ('Custom Software Development', 30),
  ('UI/UX Design', 40),
  ('E-commerce Development', 50),
  ('Digital Marketing / SEO', 60),
  ('IT Consulting', 70),
  ('Cloud Services / Hosting', 80),
  ('Cybersecurity', 90),
  ('Data Analytics', 100),
  ('AI/ML Solutions', 110),
  ('CRM/ERP Implementation', 120),
  ('IT Support & Managed Services', 130),
  ('Fractional CTO / Tech Advisory', 140)
) AS offering("name", "sortOrder")
WHERE category."name" = 'Technology'
ON CONFLICT ("categoryId", "name") DO UPDATE
SET "active" = true, "sortOrder" = EXCLUDED."sortOrder";
