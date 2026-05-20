-- AlterTable
ALTER TABLE "Photo"
ADD COLUMN "chapterId" TEXT;

-- CreateTable
CREATE TABLE "AlbumChapter" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "backgroundNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumChapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlbumChapter_albumId_sortOrder_idx" ON "AlbumChapter"("albumId", "sortOrder");

-- CreateIndex
CREATE INDEX "Photo_albumId_chapterId_sortOrder_idx" ON "Photo"("albumId", "chapterId", "sortOrder");

-- AddForeignKey
ALTER TABLE "AlbumChapter" ADD CONSTRAINT "AlbumChapter_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "AlbumChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
