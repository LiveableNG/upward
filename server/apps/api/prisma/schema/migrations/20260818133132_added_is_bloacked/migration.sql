/*
  Warnings:

  - You are about to drop the column `landlordEmailEncrypted` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordEmailHash` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordNameEncrypted` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordNameSearch` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordPhoneEncrypted` on the `upward_pm_property` table. All the data in the column will be lost.
  - You are about to drop the column `landlordPhoneHash` on the `upward_pm_property` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "upward_pm_property" DROP COLUMN "landlordEmailEncrypted",
DROP COLUMN "landlordEmailHash",
DROP COLUMN "landlordNameEncrypted",
DROP COLUMN "landlordNameSearch",
DROP COLUMN "landlordPhoneEncrypted",
DROP COLUMN "landlordPhoneHash";

-- AlterTable
ALTER TABLE "upward_property_manager" ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false;
