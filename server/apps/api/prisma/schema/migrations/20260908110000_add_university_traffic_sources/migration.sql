-- AlterTable
ALTER TABLE "upward_early_access" ADD COLUMN "sourceIdentifier" TEXT;
CREATE INDEX "upward_early_access_sourceIdentifier_idx" ON "upward_early_access"("sourceIdentifier");

-- AlterTable
ALTER TABLE "upward_university_application" ADD COLUMN "sourceIdentifier" TEXT;
CREATE INDEX "upward_university_application_sourceIdentifier_idx" ON "upward_university_application"("sourceIdentifier");

-- CreateTable
CREATE TABLE "upward_university_source" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'OTHER',
    "targetUrl" TEXT NOT NULL DEFAULT '/university',
    "description" TEXT,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVisitedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_university_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_university_visit" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "identifier" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "path" TEXT NOT NULL,
    "isUnique" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_university_visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_university_source_identifier_key" ON "upward_university_source"("identifier");
CREATE INDEX "upward_university_source_identifier_idx" ON "upward_university_source"("identifier");
CREATE INDEX "upward_university_source_channel_idx" ON "upward_university_source"("channel");
CREATE INDEX "upward_university_source_isActive_idx" ON "upward_university_source"("isActive");
CREATE INDEX "upward_university_source_createdAt_idx" ON "upward_university_source"("createdAt");

-- CreateIndex
CREATE INDEX "upward_university_visit_sourceId_idx" ON "upward_university_visit"("sourceId");
CREATE INDEX "upward_university_visit_identifier_idx" ON "upward_university_visit"("identifier");
CREATE INDEX "upward_university_visit_visitorId_idx" ON "upward_university_visit"("visitorId");
CREATE INDEX "upward_university_visit_sessionId_idx" ON "upward_university_visit"("sessionId");
CREATE INDEX "upward_university_visit_createdAt_idx" ON "upward_university_visit"("createdAt");

-- AddForeignKey
ALTER TABLE "upward_university_visit" ADD CONSTRAINT "upward_university_visit_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "upward_university_source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
