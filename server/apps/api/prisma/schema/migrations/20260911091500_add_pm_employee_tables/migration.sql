-- CreateTable
CREATE TABLE "upward_pm_employee" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "ownerPmId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "firstNameHash" TEXT,
    "lastName" TEXT NOT NULL,
    "lastNameHash" TEXT,
    "phone" TEXT,
    "phoneHash" TEXT,
    "profilePic" TEXT,
    "jobTitle" TEXT DEFAULT 'Property Officer',
    "accessLevel" TEXT NOT NULL DEFAULT 'CUSTOM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resetPasswordOTP" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_employee_property" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "ownerPmId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_pm_employee_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_employee_auth_session" (
    "id" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_employee_auth_session_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "upward_pm_activity_log" ADD COLUMN "employeeId" INTEGER;
ALTER TABLE "upward_pm_activity_log" ALTER COLUMN "pmId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "upward_pm_approval_request" ADD COLUMN "requesterEmployeeId" INTEGER;
ALTER TABLE "upward_pm_approval_request" ALTER COLUMN "requesterPmId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_employee_uuid_key" ON "upward_pm_employee"("uuid");
CREATE UNIQUE INDEX "upward_pm_employee_emailHash_key" ON "upward_pm_employee"("emailHash");
CREATE INDEX "upward_pm_employee_ownerPmId_idx" ON "upward_pm_employee"("ownerPmId");
CREATE INDEX "upward_pm_employee_emailHash_idx" ON "upward_pm_employee"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_employee_property_employeeId_propertyId_key" ON "upward_pm_employee_property"("employeeId", "propertyId");
CREATE INDEX "upward_pm_employee_property_employeeId_idx" ON "upward_pm_employee_property"("employeeId");
CREATE INDEX "upward_pm_employee_property_propertyId_idx" ON "upward_pm_employee_property"("propertyId");
CREATE INDEX "upward_pm_employee_property_ownerPmId_idx" ON "upward_pm_employee_property"("ownerPmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_employee_auth_session_refreshTokenHash_key" ON "upward_pm_employee_auth_session"("refreshTokenHash");
CREATE INDEX "upward_pm_employee_auth_session_employeeId_idx" ON "upward_pm_employee_auth_session"("employeeId");

-- CreateIndex
CREATE INDEX "upward_pm_activity_log_employeeId_idx" ON "upward_pm_activity_log"("employeeId");
CREATE INDEX "upward_pm_approval_request_requesterEmployeeId_idx" ON "upward_pm_approval_request"("requesterEmployeeId");

-- AddForeignKey
ALTER TABLE "upward_pm_employee" ADD CONSTRAINT "upward_pm_employee_ownerPmId_fkey" FOREIGN KEY ("ownerPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_employee_property" ADD CONSTRAINT "upward_pm_employee_property_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "upward_pm_employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_employee_property" ADD CONSTRAINT "upward_pm_employee_property_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "upward_pm_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_employee_auth_session" ADD CONSTRAINT "upward_pm_employee_auth_session_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "upward_pm_employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_activity_log" ADD CONSTRAINT "upward_pm_activity_log_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "upward_pm_employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_approval_request" ADD CONSTRAINT "upward_pm_approval_request_requesterEmployeeId_fkey" FOREIGN KEY ("requesterEmployeeId") REFERENCES "upward_pm_employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
