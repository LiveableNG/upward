-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "pmId" INTEGER,
ADD COLUMN     "pmUnitId" INTEGER;

-- CreateTable
CREATE TABLE "upward_property_manager" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "firstNameHash" TEXT,
    "lastName" TEXT NOT NULL,
    "lastNameHash" TEXT,
    "businessName" TEXT,
    "phone" TEXT,
    "phoneHash" TEXT,
    "profilePic" TEXT,
    "bankName" TEXT,
    "bankCode" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_property_manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_auth_session" (
    "id" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_property" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "propertyType" TEXT NOT NULL DEFAULT 'Residential',
    "imageUrl" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "state" TEXT,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_unit" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "unitName" TEXT NOT NULL,
    "rentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentStartDate" TIMESTAMP(3),
    "rentDueDate" TIMESTAMP(3),
    "rentFrequency" TEXT NOT NULL DEFAULT 'Monthly',
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'VACANT',
    "tenantId" INTEGER,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "userPropertyUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_tenant" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "firstNameEncrypted" TEXT,
    "firstNameSearch" TEXT,
    "lastNameEncrypted" TEXT,
    "lastNameSearch" TEXT,
    "emailEncrypted" TEXT,
    "emailHash" TEXT,
    "phoneEncrypted" TEXT,
    "phoneHash" TEXT,
    "inviteStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "inviteSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_rent_payment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "unitId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "method" TEXT NOT NULL DEFAULT 'Bank Transfer',
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_rent_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_payment_request" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "tenantId" INTEGER,
    "paymentRequestId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowPartial" BOOLEAN NOT NULL DEFAULT false,
    "minAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_manager_uuid_key" ON "upward_property_manager"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_manager_email_key" ON "upward_property_manager"("email");

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_manager_emailHash_key" ON "upward_property_manager"("emailHash");

-- CreateIndex
CREATE INDEX "upward_property_manager_email_idx" ON "upward_property_manager"("email");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_auth_session_refreshTokenHash_key" ON "upward_pm_auth_session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "upward_pm_auth_session_pmId_idx" ON "upward_pm_auth_session"("pmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_property_uuid_key" ON "upward_pm_property"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_property_pmId_idx" ON "upward_pm_property"("pmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_unit_uuid_key" ON "upward_pm_unit"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_unit_propertyId_idx" ON "upward_pm_unit"("propertyId");

-- CreateIndex
CREATE INDEX "upward_pm_unit_status_idx" ON "upward_pm_unit"("status");

-- CreateIndex
CREATE INDEX "upward_pm_unit_tenantId_idx" ON "upward_pm_unit"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_tenant_uuid_key" ON "upward_pm_tenant"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_tenant_pmId_idx" ON "upward_pm_tenant"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_tenant_emailHash_idx" ON "upward_pm_tenant"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_rent_payment_uuid_key" ON "upward_pm_rent_payment"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_rent_payment_unitId_idx" ON "upward_pm_rent_payment"("unitId");

-- CreateIndex
CREATE INDEX "upward_pm_rent_payment_paymentDate_idx" ON "upward_pm_rent_payment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_payment_request_uuid_key" ON "upward_pm_payment_request"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_payment_request_pmId_idx" ON "upward_pm_payment_request"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_payment_request_unitId_idx" ON "upward_pm_payment_request"("unitId");

-- CreateIndex
CREATE INDEX "upward_pm_payment_request_status_idx" ON "upward_pm_payment_request"("status");

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_pmUnitId_fkey" FOREIGN KEY ("pmUnitId") REFERENCES "upward_pm_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_auth_session" ADD CONSTRAINT "upward_pm_auth_session_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_property" ADD CONSTRAINT "upward_pm_property_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_unit" ADD CONSTRAINT "upward_pm_unit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "upward_pm_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_unit" ADD CONSTRAINT "upward_pm_unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "upward_pm_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_tenant" ADD CONSTRAINT "upward_pm_tenant_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_rent_payment" ADD CONSTRAINT "upward_pm_rent_payment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "upward_pm_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "upward_pm_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "upward_pm_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
