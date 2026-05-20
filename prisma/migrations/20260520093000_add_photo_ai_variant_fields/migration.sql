-- AlterTable
ALTER TABLE "Photo"
ADD COLUMN "selectedCaptionSource" TEXT DEFAULT 'AI',
ADD COLUMN "selectedLayoutSource" TEXT DEFAULT 'AI';

-- CreateTable
CREATE TABLE "PhotoAIVariant" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "style" TEXT,
    "reason" TEXT,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoAIVariant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PhotoAIVariant_photoId_type_createdAt_idx" ON "PhotoAIVariant"("photoId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "PhotoAIVariant" ADD CONSTRAINT "PhotoAIVariant_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Photo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
