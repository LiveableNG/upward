-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_app_version_policy" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "app" TEXT NOT NULL DEFAULT 'upward-pay',
    "platform" TEXT NOT NULL,
    "minSupportedVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "latestVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "minBuildNumber" INTEGER NOT NULL DEFAULT 1,
    "latestBuildNumber" INTEGER NOT NULL DEFAULT 1,
    "forceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "gatedFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "title" TEXT,
    "message" TEXT,
    "releaseNotes" JSONB,
    "storeUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_app_version_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_app_version_policy_uuid_key" ON "upward_app_version_policy"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_app_version_policy_app_platform_key" ON "upward_app_version_policy"("app", "platform");
CREATE INDEX IF NOT EXISTS "upward_app_version_policy_app_platform_isActive_idx" ON "upward_app_version_policy"("app", "platform", "isActive");
