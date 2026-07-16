ALTER TABLE "Chapter" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Chapter" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "BusinessCategoryOption" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessCategoryOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessCategoryOption_name_key" ON "BusinessCategoryOption"("name");

CREATE TABLE "CityOption" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "stateOrUt" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CityOption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CityOption_name_stateOrUt_key" ON "CityOption"("name", "stateOrUt");
CREATE INDEX "CityOption_active_stateOrUt_name_idx" ON "CityOption"("active", "stateOrUt", "name");

INSERT INTO "BusinessCategoryOption" ("id", "name", "sortOrder") VALUES
  (gen_random_uuid()::text, 'Manufacturer', 10),
  (gen_random_uuid()::text, 'Trader / Distributor', 20),
  (gen_random_uuid()::text, 'Service Provider', 30),
  (gen_random_uuid()::text, 'Retailer', 40),
  (gen_random_uuid()::text, 'Professional (CA, Lawyer, Consultant…)', 50),
  (gen_random_uuid()::text, 'Startup / Founder', 60),
  (gen_random_uuid()::text, 'Other', 999)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "BusinessCategoryOption" ("id", "name", "sortOrder")
SELECT gen_random_uuid()::text, "businessCategory", 500
FROM "Attendee"
WHERE "businessCategory" IS NOT NULL AND btrim("businessCategory") <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "CityOption" ("id", "name", "stateOrUt", "sortOrder") VALUES
  (gen_random_uuid()::text, 'Visakhapatnam', 'Andhra Pradesh', 10),
  (gen_random_uuid()::text, 'Vijayawada', 'Andhra Pradesh', 20),
  (gen_random_uuid()::text, 'Guntur', 'Andhra Pradesh', 30),
  (gen_random_uuid()::text, 'Tirupati', 'Andhra Pradesh', 40),
  (gen_random_uuid()::text, 'Nellore', 'Andhra Pradesh', 50),
  (gen_random_uuid()::text, 'Kurnool', 'Andhra Pradesh', 60),
  (gen_random_uuid()::text, 'Itanagar', 'Arunachal Pradesh', 10),
  (gen_random_uuid()::text, 'Naharlagun', 'Arunachal Pradesh', 20),
  (gen_random_uuid()::text, 'Guwahati', 'Assam', 10),
  (gen_random_uuid()::text, 'Dibrugarh', 'Assam', 20),
  (gen_random_uuid()::text, 'Silchar', 'Assam', 30),
  (gen_random_uuid()::text, 'Jorhat', 'Assam', 40),
  (gen_random_uuid()::text, 'Patna', 'Bihar', 10),
  (gen_random_uuid()::text, 'Gaya', 'Bihar', 20),
  (gen_random_uuid()::text, 'Muzaffarpur', 'Bihar', 30),
  (gen_random_uuid()::text, 'Bhagalpur', 'Bihar', 40),
  (gen_random_uuid()::text, 'Raipur', 'Chhattisgarh', 10),
  (gen_random_uuid()::text, 'Bhilai', 'Chhattisgarh', 20),
  (gen_random_uuid()::text, 'Bilaspur', 'Chhattisgarh', 30),
  (gen_random_uuid()::text, 'Panaji', 'Goa', 10),
  (gen_random_uuid()::text, 'Margao', 'Goa', 20),
  (gen_random_uuid()::text, 'Vasco da Gama', 'Goa', 30),
  (gen_random_uuid()::text, 'Ahmedabad', 'Gujarat', 10),
  (gen_random_uuid()::text, 'Surat', 'Gujarat', 20),
  (gen_random_uuid()::text, 'Vadodara', 'Gujarat', 30),
  (gen_random_uuid()::text, 'Rajkot', 'Gujarat', 40),
  (gen_random_uuid()::text, 'Gandhinagar', 'Gujarat', 50),
  (gen_random_uuid()::text, 'Bhavnagar', 'Gujarat', 60),
  (gen_random_uuid()::text, 'Jamnagar', 'Gujarat', 70),
  (gen_random_uuid()::text, 'Gurugram', 'Haryana', 10),
  (gen_random_uuid()::text, 'Faridabad', 'Haryana', 20),
  (gen_random_uuid()::text, 'Panipat', 'Haryana', 30),
  (gen_random_uuid()::text, 'Ambala', 'Haryana', 40),
  (gen_random_uuid()::text, 'Shimla', 'Himachal Pradesh', 10),
  (gen_random_uuid()::text, 'Dharamshala', 'Himachal Pradesh', 20),
  (gen_random_uuid()::text, 'Jammu', 'Jammu and Kashmir', 10),
  (gen_random_uuid()::text, 'Srinagar', 'Jammu and Kashmir', 20),
  (gen_random_uuid()::text, 'Ranchi', 'Jharkhand', 10),
  (gen_random_uuid()::text, 'Jamshedpur', 'Jharkhand', 20),
  (gen_random_uuid()::text, 'Dhanbad', 'Jharkhand', 30),
  (gen_random_uuid()::text, 'Bengaluru', 'Karnataka', 10),
  (gen_random_uuid()::text, 'Mysuru', 'Karnataka', 20),
  (gen_random_uuid()::text, 'Mangaluru', 'Karnataka', 30),
  (gen_random_uuid()::text, 'Hubballi', 'Karnataka', 40),
  (gen_random_uuid()::text, 'Belagavi', 'Karnataka', 50),
  (gen_random_uuid()::text, 'Kochi', 'Kerala', 10),
  (gen_random_uuid()::text, 'Thiruvananthapuram', 'Kerala', 20),
  (gen_random_uuid()::text, 'Kozhikode', 'Kerala', 30),
  (gen_random_uuid()::text, 'Thrissur', 'Kerala', 40),
  (gen_random_uuid()::text, 'Kollam', 'Kerala', 50),
  (gen_random_uuid()::text, 'Leh', 'Ladakh', 10),
  (gen_random_uuid()::text, 'Bhopal', 'Madhya Pradesh', 10),
  (gen_random_uuid()::text, 'Indore', 'Madhya Pradesh', 20),
  (gen_random_uuid()::text, 'Jabalpur', 'Madhya Pradesh', 30),
  (gen_random_uuid()::text, 'Gwalior', 'Madhya Pradesh', 40),
  (gen_random_uuid()::text, 'Ujjain', 'Madhya Pradesh', 50),
  (gen_random_uuid()::text, 'Mumbai', 'Maharashtra', 10),
  (gen_random_uuid()::text, 'Pune', 'Maharashtra', 20),
  (gen_random_uuid()::text, 'Nagpur', 'Maharashtra', 30),
  (gen_random_uuid()::text, 'Nashik', 'Maharashtra', 40),
  (gen_random_uuid()::text, 'Thane', 'Maharashtra', 50),
  (gen_random_uuid()::text, 'Navi Mumbai', 'Maharashtra', 60),
  (gen_random_uuid()::text, 'Chhatrapati Sambhajinagar', 'Maharashtra', 70),
  (gen_random_uuid()::text, 'Kolhapur', 'Maharashtra', 80),
  (gen_random_uuid()::text, 'Solapur', 'Maharashtra', 90),
  (gen_random_uuid()::text, 'Imphal', 'Manipur', 10),
  (gen_random_uuid()::text, 'Shillong', 'Meghalaya', 10),
  (gen_random_uuid()::text, 'Aizawl', 'Mizoram', 10),
  (gen_random_uuid()::text, 'Dimapur', 'Nagaland', 10),
  (gen_random_uuid()::text, 'Kohima', 'Nagaland', 20),
  (gen_random_uuid()::text, 'Bhubaneswar', 'Odisha', 10),
  (gen_random_uuid()::text, 'Cuttack', 'Odisha', 20),
  (gen_random_uuid()::text, 'Rourkela', 'Odisha', 30),
  (gen_random_uuid()::text, 'Puducherry', 'Puducherry', 10),
  (gen_random_uuid()::text, 'Ludhiana', 'Punjab', 10),
  (gen_random_uuid()::text, 'Amritsar', 'Punjab', 20),
  (gen_random_uuid()::text, 'Jalandhar', 'Punjab', 30),
  (gen_random_uuid()::text, 'Mohali', 'Punjab', 40),
  (gen_random_uuid()::text, 'Jaipur', 'Rajasthan', 10),
  (gen_random_uuid()::text, 'Jodhpur', 'Rajasthan', 20),
  (gen_random_uuid()::text, 'Udaipur', 'Rajasthan', 30),
  (gen_random_uuid()::text, 'Kota', 'Rajasthan', 40),
  (gen_random_uuid()::text, 'Ajmer', 'Rajasthan', 50),
  (gen_random_uuid()::text, 'Gangtok', 'Sikkim', 10),
  (gen_random_uuid()::text, 'Chennai', 'Tamil Nadu', 10),
  (gen_random_uuid()::text, 'Coimbatore', 'Tamil Nadu', 20),
  (gen_random_uuid()::text, 'Madurai', 'Tamil Nadu', 30),
  (gen_random_uuid()::text, 'Tiruchirappalli', 'Tamil Nadu', 40),
  (gen_random_uuid()::text, 'Salem', 'Tamil Nadu', 50),
  (gen_random_uuid()::text, 'Tiruppur', 'Tamil Nadu', 60),
  (gen_random_uuid()::text, 'Hyderabad', 'Telangana', 10),
  (gen_random_uuid()::text, 'Warangal', 'Telangana', 20),
  (gen_random_uuid()::text, 'Nizamabad', 'Telangana', 30),
  (gen_random_uuid()::text, 'Agartala', 'Tripura', 10),
  (gen_random_uuid()::text, 'Lucknow', 'Uttar Pradesh', 10),
  (gen_random_uuid()::text, 'Noida', 'Uttar Pradesh', 20),
  (gen_random_uuid()::text, 'Ghaziabad', 'Uttar Pradesh', 30),
  (gen_random_uuid()::text, 'Kanpur', 'Uttar Pradesh', 40),
  (gen_random_uuid()::text, 'Varanasi', 'Uttar Pradesh', 50),
  (gen_random_uuid()::text, 'Agra', 'Uttar Pradesh', 60),
  (gen_random_uuid()::text, 'Prayagraj', 'Uttar Pradesh', 70),
  (gen_random_uuid()::text, 'Meerut', 'Uttar Pradesh', 80),
  (gen_random_uuid()::text, 'Dehradun', 'Uttarakhand', 10),
  (gen_random_uuid()::text, 'Haridwar', 'Uttarakhand', 20),
  (gen_random_uuid()::text, 'Haldwani', 'Uttarakhand', 30),
  (gen_random_uuid()::text, 'Kolkata', 'West Bengal', 10),
  (gen_random_uuid()::text, 'Howrah', 'West Bengal', 20),
  (gen_random_uuid()::text, 'Siliguri', 'West Bengal', 30),
  (gen_random_uuid()::text, 'Durgapur', 'West Bengal', 40),
  (gen_random_uuid()::text, 'Asansol', 'West Bengal', 50),
  (gen_random_uuid()::text, 'New Delhi', 'Delhi', 10),
  (gen_random_uuid()::text, 'Chandigarh', 'Chandigarh', 10),
  (gen_random_uuid()::text, 'Port Blair', 'Andaman and Nicobar Islands', 10),
  (gen_random_uuid()::text, 'Daman', 'Dadra and Nagar Haveli and Daman and Diu', 10),
  (gen_random_uuid()::text, 'Silvassa', 'Dadra and Nagar Haveli and Daman and Diu', 20),
  (gen_random_uuid()::text, 'Kavaratti', 'Lakshadweep', 10)
ON CONFLICT ("name", "stateOrUt") DO NOTHING;

-- Convert unambiguous legacy city names to the canonical "City, State/UT"
-- display value before preserving any remaining imported values.
UPDATE "Attendee" AS attendee
SET "city" = city."name" || ', ' || city."stateOrUt"
FROM "CityOption" AS city
WHERE attendee."city" IS NOT NULL
  AND lower(btrim(attendee."city")) = lower(city."name")
  AND city."stateOrUt" <> 'Legacy / Imported'
  AND (
    SELECT count(*)
    FROM "CityOption" AS candidate
    WHERE lower(candidate."name") = lower(city."name")
      AND candidate."stateOrUt" <> 'Legacy / Imported'
  ) = 1;

INSERT INTO "CityOption" ("id", "name", "stateOrUt", "sortOrder")
SELECT gen_random_uuid()::text, "city", 'Legacy / Imported', 900
FROM "Attendee"
WHERE "city" IS NOT NULL AND btrim("city") <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM "CityOption" AS city
    WHERE "Attendee"."city" = city."name" || ', ' || city."stateOrUt"
  )
ON CONFLICT ("name", "stateOrUt") DO NOTHING;
