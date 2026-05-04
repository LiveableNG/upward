-- CreateTable
CREATE TABLE "upward_session" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "googleMeetLink" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_email_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "subject" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_session_startTime_idx" ON "upward_session"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "upward_attendance_sessionId_userId_key" ON "upward_attendance"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "upward_email_log_userId_idx" ON "upward_email_log"("userId");

-- CreateIndex
CREATE INDEX "upward_email_log_sessionId_idx" ON "upward_email_log"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_admin_email_key" ON "upward_admin"("email");

-- CreateIndex
CREATE INDEX "upward_admin_email_idx" ON "upward_admin"("email");

-- AddForeignKey
ALTER TABLE "upward_attendance" ADD CONSTRAINT "upward_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_waitlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_attendance" ADD CONSTRAINT "upward_attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "upward_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_email_log" ADD CONSTRAINT "upward_email_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_waitlist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_email_log" ADD CONSTRAINT "upward_email_log_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "upward_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
