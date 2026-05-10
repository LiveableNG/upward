-- CreateTable
CREATE TABLE "upward_pm_landlord" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "phoneHash" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_landlord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_landlord_auth_session" (
    "id" TEXT NOT NULL,
    "landlordId" INTEGER NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_landlord_auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_landlord_uuid_key" ON "upward_pm_landlord"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_landlord_email_key" ON "upward_pm_landlord"("email");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_landlord_emailHash_key" ON "upward_pm_landlord"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_landlord_auth_session_refreshTokenHash_key" ON "upward_pm_landlord_auth_session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "upward_pm_landlord_auth_session_landlordId_idx" ON "upward_pm_landlord_auth_session"("landlordId");

-- AddForeignKey
ALTER TABLE "upward_pm_landlord_auth_session" ADD CONSTRAINT "upward_pm_landlord_auth_session_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "upward_pm_landlord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "upward_pm_property_collaboration_propertyId_collaboratorPm_key" RENAME TO "upward_pm_property_collaboration_propertyId_collaboratorPmI_key";
