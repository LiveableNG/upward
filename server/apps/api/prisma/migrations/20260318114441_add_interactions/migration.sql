-- AlterTable
ALTER TABLE "upward_waitlist" ADD COLUMN     "abVariant" TEXT;

-- CreateTable
CREATE TABLE "upward_interaction" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "abVariant" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_interaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_interaction_visitorId_idx" ON "upward_interaction"("visitorId");

-- CreateIndex
CREATE INDEX "upward_interaction_type_idx" ON "upward_interaction"("type");

-- CreateIndex
CREATE INDEX "upward_interaction_createdAt_idx" ON "upward_interaction"("createdAt");
