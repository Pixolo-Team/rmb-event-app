-- Replace every attendee's QR token with a short, opaque code.
--
-- Previously qrToken held an RSA-2048 signed payload (~560 chars), which forced
-- a ~97x97 module QR that was slow and unreliable to scan. The scan paths only
-- ever did a string-equality lookup on this column, so the signature bought
-- nothing. A 10-char Crockford base32 code fits in a version-1 (21x21) QR.
--
-- This is a hard cutover: previously printed badges stop working and must be
-- reprinted from the admin badges screen.
--
-- Mirrors generateQrCode() in src/common/tokens.ts. Uses only core Postgres
-- functions (gen_random_uuid is PG13+, sha256/get_byte are PG11+) so no
-- extension is required. Hashing the UUID gives 32 uniformly distributed bytes
-- from a cryptographically strong source; masking to 5 bits stays uniform
-- because 32 divides 256.

DO $$
DECLARE
  alphabet CONSTANT text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  code_length CONSTANT int := 10;
  rec RECORD;
  candidate text;
  bytes bytea;
  i int;
BEGIN
  FOR rec IN SELECT "id" FROM "Attendee" LOOP
    LOOP
      candidate := '';
      bytes := sha256(gen_random_uuid()::text::bytea);
      FOR i IN 1..code_length LOOP
        candidate := candidate || substr(alphabet, 1 + (get_byte(bytes, i - 1) & 31), 1);
      END LOOP;
      -- The unique index is the real guard; this just avoids a failed UPDATE.
      EXIT WHEN NOT EXISTS (SELECT 1 FROM "Attendee" WHERE "qrToken" = candidate);
    END LOOP;

    UPDATE "Attendee" SET "qrToken" = candidate WHERE "id" = rec."id";
  END LOOP;
END $$;
