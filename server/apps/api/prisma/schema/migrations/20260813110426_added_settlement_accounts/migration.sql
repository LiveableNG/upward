/*
  Warnings:

  - You are about to drop the column `pmPropertyId` on the `upward_manual_account` table. All the data in the column will be lost.
  - You are about to drop the column `userPropertyId` on the `upward_manual_account` table. All the data in the column will be lost.
  - You are about to drop the column `landlordEmailEncrypted` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordEmailHash` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordNameEncrypted` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordNameSearch` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordPhoneEncrypted` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordPhoneHash` on the `upward_pm_property` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "upward_manual_account" DROP CONSTRAINT "upward_manual_account_pmPropertyId_fkey";

-- DropForeignKey
ALTER TABLE "upward_manual_account" DROP CONSTRAINT "upward_manual_account_userPropertyId_fkey";

-- DropIndex
DROP INDEX "upward_manual_account_pmPropertyId_key";

-- DropIndex
DROP INDEX "upward_manual_account_userPropertyId_key";

-- AlterTable
ALTER TABLE "upward_manual_account" DROP COLUMN "pmPropertyId",
DROP COLUMN "userPropertyId",
ADD COLUMN     "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pmId" INTEGER;

-- AlterTable
ALTER TABLE "upward_pm_property" DROP COLUMN "landlordEmailEncrypted",
DROP COLUMN "landlordEmailHash",
DROP COLUMN "landlordNameEncrypted",
DROP COLUMN "landlordNameSearch",
DROP COLUMN "landlordPhoneEncrypted",
DROP COLUMN "landlordPhoneHash",
ADD COLUMN     "manualAccountId" INTEGER;

-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "manualAccountId" INTEGER;

-- AddForeignKey
ALTER TABLE "upward_pm_property" ADD CONSTRAINT "upward_pm_property_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_manualAccountId_fkey" FOREIGN KEY ("manualAccountId") REFERENCES "upward_manual_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_manual_account" ADD CONSTRAINT "upward_manual_account_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
