-- CreateTable
CREATE TABLE "upward_auth_session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_auth_session_refreshTokenHash_key" ON "upward_auth_session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "upward_auth_session_userId_idx" ON "upward_auth_session"("userId");

-- CreateIndex
CREATE INDEX "upward_auth_session_refreshTokenHash_idx" ON "upward_auth_session"("refreshTokenHash");

-- AddForeignKey
ALTER TABLE "upward_auth_session" ADD CONSTRAINT "upward_auth_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
