-- CreateEnum
CREATE TYPE "MemorySiteStyle" AS ENUM ('VELVET_PLUM_EDITORIAL');

-- CreateEnum
CREATE TYPE "MemorySiteStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED');

-- CreateTable
CREATE TABLE "MemorySite" (
    "id" TEXT NOT NULL,
    "coupleId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "sourceAlbumId" TEXT,
    "sourceChapterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "style" "MemorySiteStyle" NOT NULL,
    "status" "MemorySiteStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "intro" TEXT NOT NULL,
    "closing" TEXT NOT NULL,
    "coverPhotoUrl" TEXT,
    "payload" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemorySite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemorySite_coupleId_status_publishedAt_idx" ON "MemorySite"("coupleId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemorySite_coupleId_scopeKey_key" ON "MemorySite"("coupleId", "scopeKey");

-- AddForeignKey
ALTER TABLE "MemorySite" ADD CONSTRAINT "MemorySite_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
