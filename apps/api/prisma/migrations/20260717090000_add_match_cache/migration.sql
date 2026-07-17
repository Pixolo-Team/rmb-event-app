CREATE TABLE "MatchCache" (
  "viewerId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "reasons" TEXT[],
  "headline" TEXT NOT NULL,
  "chapterRelation" TEXT NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchCache_pkey" PRIMARY KEY ("viewerId", "candidateId")
);

CREATE INDEX "MatchCache_viewerId_score_idx" ON "MatchCache"("viewerId", "score");
CREATE INDEX "MatchCache_candidateId_idx" ON "MatchCache"("candidateId");
ALTER TABLE "MatchCache" ADD CONSTRAINT "MatchCache_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchCache" ADD CONSTRAINT "MatchCache_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Attendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
