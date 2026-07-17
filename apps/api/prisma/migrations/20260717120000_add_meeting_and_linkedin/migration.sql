-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN "linkedInUrl" TEXT;

-- NOTE (repair, 2026-07-17): this migration originally also carried a
-- `CREATE TABLE "Meeting"` block. That was a duplicate — Meeting is created by
-- 20260716150635_add_meeting and extended by 20260716210000_add_connection_notes —
-- and it declared a *conflicting* shape (composite primary key + metAt, no
-- scannedById). Against any database that had already run those migrations the
-- CREATE TABLE failed with "relation Meeting already exists", which is what
-- happened here: the migration errored, was rolled back, and was then
-- force-marked applied via `migrate resolve` after the ALTER above had already
-- landed. That left every fresh clone, CI run and production deploy unable to
-- migrate this repo at all.
--
-- The Meeting DDL is deleted rather than made idempotent: it was never the
-- correct definition, so `CREATE TABLE IF NOT EXISTS` would have silently baked
-- the wrong schema into any database that did not already have the table.
