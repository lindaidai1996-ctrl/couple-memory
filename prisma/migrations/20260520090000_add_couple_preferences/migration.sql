-- AlterTable
ALTER TABLE "Couple"
ADD COLUMN "captionStylePreference" TEXT DEFAULT 'romantic',
ADD COLUMN "tonePreference" TEXT DEFAULT 'warm',
ADD COLUMN "blockedPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[];
