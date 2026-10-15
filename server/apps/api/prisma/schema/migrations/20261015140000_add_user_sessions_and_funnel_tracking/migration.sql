-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_session" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL,
    "userId" INTEGER,
    "userEmail" TEXT,
    "userRole" TEXT,
    "app" TEXT NOT NULL DEFAULT 'upward-pay',
    "platform" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'browser',
    "ipAddress" TEXT,
    "country" TEXT,
    "countryCode" TEXT,
    "region" TEXT,
    "city" TEXT,
    "timezone" TEXT,
    "locale" TEXT,
    "networkType" TEXT,
    "landingPage" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "deviceModel" TEXT,
    "osVersion" TEXT,
    "browser" TEXT,
    "screenWidth" INTEGER,
    "screenHeight" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "entryScreen" TEXT,
    "exitScreen" TEXT,
    "lastAction" TEXT,
    "dropOffStage" TEXT,
    "hasError" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "eventsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_session_event" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" INTEGER,
    "eventName" TEXT NOT NULL,
    "screenName" TEXT,
    "stepNumber" INTEGER NOT NULL,
    "metadata" JSONB,
    "clientTimestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_session_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_session_sessionId_key" ON "upward_session"("sessionId");
CREATE INDEX IF NOT EXISTS "upward_session_sessionId_idx" ON "upward_session"("sessionId");
CREATE INDEX IF NOT EXISTS "upward_session_userId_idx" ON "upward_session"("userId");
CREATE INDEX IF NOT EXISTS "upward_session_userEmail_idx" ON "upward_session"("userEmail");
CREATE INDEX IF NOT EXISTS "upward_session_dropOffStage_idx" ON "upward_session"("dropOffStage");
CREATE INDEX IF NOT EXISTS "upward_session_platform_idx" ON "upward_session"("platform");
CREATE INDEX IF NOT EXISTS "upward_session_countryCode_city_idx" ON "upward_session"("countryCode", "city");
CREATE INDEX IF NOT EXISTS "upward_session_startedAt_idx" ON "upward_session"("startedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_session_event_sessionId_stepNumber_idx" ON "upward_session_event"("sessionId", "stepNumber");
CREATE INDEX IF NOT EXISTS "upward_session_event_eventName_idx" ON "upward_session_event"("eventName");
CREATE INDEX IF NOT EXISTS "upward_session_event_screenName_idx" ON "upward_session_event"("screenName");
CREATE INDEX IF NOT EXISTS "upward_session_event_createdAt_idx" ON "upward_session_event"("createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_session_event_sessionId_fkey'
    ) THEN
        ALTER TABLE "upward_session_event" ADD CONSTRAINT "upward_session_event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "upward_session"("sessionId") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
