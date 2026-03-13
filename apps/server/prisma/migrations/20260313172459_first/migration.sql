-- CreateTable
CREATE TABLE "upward_waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "benefits" TEXT[],
    "acceptTerms" BOOLEAN NOT NULL DEFAULT false,
    "wantsAmbassador" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "city" TEXT,
    "selectedSession" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_waitlist_email_key" ON "upward_waitlist"("email");

-- CreateIndex
CREATE INDEX "upward_waitlist_email_idx" ON "upward_waitlist"("email");

-- CreateIndex
CREATE INDEX "upward_waitlist_createdAt_idx" ON "upward_waitlist"("createdAt");
