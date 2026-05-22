CREATE TYPE "MemoryReviewType" AS ENUM ('YEARLY', 'ANNIVERSARY');
CREATE TYPE "MemoryReviewStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

CREATE TABLE "MemoryReview" (
  "id" TEXT NOT NULL,
  "coupleId" TEXT NOT NULL,
  "type" "MemoryReviewType" NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "year" INTEGER,
  "anniversaryYear" INTEGER,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "summary" TEXT NOT NULL,
  "closing" TEXT NOT NULL,
  "coverPhotoUrl" TEXT,
  "status" "MemoryReviewStatus" NOT NULL DEFAULT 'PROCESSING',
  "payload" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MemoryReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MemoryReview_coupleId_type_createdAt_idx"
  ON "MemoryReview"("coupleId", "type", "createdAt");

CREATE INDEX "MemoryReview_coupleId_status_publishedAt_idx"
  ON "MemoryReview"("coupleId", "status", "publishedAt");

CREATE INDEX "MemoryReview_coupleId_type_year_idx"
  ON "MemoryReview"("coupleId", "type", "year");

CREATE INDEX "MemoryReview_coupleId_type_anniversaryYear_idx"
  ON "MemoryReview"("coupleId", "type", "anniversaryYear");

CREATE UNIQUE INDEX "MemoryReview_coupleId_scopeKey_key"
  ON "MemoryReview"("coupleId", "scopeKey");

ALTER TABLE "MemoryReview"
  ADD CONSTRAINT "MemoryReview_coupleId_fkey"
  FOREIGN KEY ("coupleId") REFERENCES "Couple"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
