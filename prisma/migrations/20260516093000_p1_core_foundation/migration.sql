-- AlterEnum
ALTER TYPE "PipelineStatus" ADD VALUE 'DEGRADED';

-- CreateEnum
CREATE TYPE "AlbumCoverMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "CoupleCoverMode" AS ENUM ('NONE', 'PHOTO', 'UPLOAD');

-- AlterTable
ALTER TABLE "Couple"
ADD COLUMN "coverMode" "CoupleCoverMode" NOT NULL DEFAULT 'NONE',
ADD COLUMN "coverPhotoId" TEXT;

-- AlterTable
ALTER TABLE "Album"
ADD COLUMN "coverMode" "AlbumCoverMode" NOT NULL DEFAULT 'AUTO',
ADD COLUMN "coverPhotoId" TEXT;

-- AlterTable
ALTER TABLE "PipelineRun"
ADD COLUMN "triggerType" TEXT,
ADD COLUMN "attemptNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "errorCode" TEXT,
ADD COLUMN "summary" TEXT;
