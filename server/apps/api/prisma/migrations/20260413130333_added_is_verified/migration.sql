/*
  Warnings:

  - You are about to drop the column `rentEndDate` on the `upward_user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "upward_user" DROP COLUMN "rentEndDate";

-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
