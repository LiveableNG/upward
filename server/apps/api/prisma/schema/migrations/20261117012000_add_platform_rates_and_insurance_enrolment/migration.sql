-- AlterTable
ALTER TABLE "upward_goal_action_template" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "upward_rent_vault" ADD COLUMN     "appliedAnnualRatePct" DOUBLE PRECISION NOT NULL DEFAULT 14.0,
ADD COLUMN     "initialDepositKobo" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "insurancePremiumPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "planPattern" TEXT NOT NULL DEFAULT 'INITIAL_DEPOSIT',
ADD COLUMN     "productOption" TEXT NOT NULL DEFAULT 'SAVE_AND_EARN';

-- CreateTable
CREATE TABLE "upward_platform_rate_config" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'GLOBAL',
    "savingsAnnualRatePct" DOUBLE PRECISION NOT NULL DEFAULT 14.0,
    "rentProtecRatePct" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "insurancePremiumPct" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "rentProtecMinMonths" INTEGER NOT NULL DEFAULT 6,
    "maxSavingsMonths" INTEGER NOT NULL DEFAULT 11,
    "updatedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_platform_rate_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_insurance_enrolment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userPropertyUuid" TEXT,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT NOT NULL,
    "occupation" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "rentStartDate" TEXT NOT NULL,
    "annualRent" DOUBLE PRECISION NOT NULL,
    "sumAssured" DOUBLE PRECISION NOT NULL,
    "premiumRatePct" DOUBLE PRECISION NOT NULL,
    "premiumAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "landlordName" TEXT NOT NULL,
    "propertyAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentReference" TEXT,
    "termsVersion" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_insurance_enrolment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_platform_rate_config_key_key" ON "upward_platform_rate_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "upward_insurance_enrolment_uuid_key" ON "upward_insurance_enrolment"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_insurance_enrolment_paymentReference_key" ON "upward_insurance_enrolment"("paymentReference");

-- CreateIndex
CREATE INDEX "upward_insurance_enrolment_userId_idx" ON "upward_insurance_enrolment"("userId");

-- CreateIndex
CREATE INDEX "upward_insurance_enrolment_userPropertyUuid_idx" ON "upward_insurance_enrolment"("userPropertyUuid");

-- CreateIndex
CREATE INDEX "upward_insurance_enrolment_status_idx" ON "upward_insurance_enrolment"("status");

-- AddForeignKey
ALTER TABLE "upward_insurance_enrolment" ADD CONSTRAINT "upward_insurance_enrolment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
