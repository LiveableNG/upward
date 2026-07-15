/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `upward_admin` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "upward_admin" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "receivesSystemAlerts" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "upward_admin_phone_key" ON "upward_admin"("phone");
