-- AlterTable
ALTER TABLE "upward_communication_log" ADD COLUMN "emailTrackingToken" TEXT UNIQUE;

-- AlterTable
ALTER TABLE "upward_communication_log" ADD COLUMN "isOpened" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "openedAt" TIMESTAMP(3),
ADD COLUMN "userAgent" TEXT;
