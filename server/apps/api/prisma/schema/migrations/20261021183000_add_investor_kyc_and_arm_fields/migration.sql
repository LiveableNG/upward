-- AlterTable
ALTER TABLE "upward_kyc_verification" ADD COLUMN     "armCompletedSections" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "armCrmAccountNumber" TEXT,
ADD COLUMN     "armCustomerMembershipId" TEXT,
ADD COLUMN     "armSyncStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "idNumberEncrypted" TEXT,
ADD COLUMN     "incomeRange" TEXT,
ADD COLUMN     "mothersMaidenNameEnc" TEXT,
ADD COLUMN     "nextOfKinAddress" TEXT,
ADD COLUMN     "nextOfKinEmail" TEXT,
ADD COLUMN     "nextOfKinName" TEXT,
ADD COLUMN     "nextOfKinPhone" TEXT,
ADD COLUMN     "nextOfKinRelationship" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "riskAppetite" TEXT DEFAULT 'Conservative',
ADD COLUMN     "sourceOfFunds" TEXT;

-- AlterTable
ALTER TABLE "upward_rent_vault" ADD COLUMN     "armPurchaseId" TEXT,
ADD COLUMN     "armWithdrawalId" TEXT,
ADD COLUMN     "lastYieldSyncAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "upward_kyc_verification_armSyncStatus_idx" ON "upward_kyc_verification"("armSyncStatus");
