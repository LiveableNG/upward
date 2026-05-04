/*
  Warnings:

  - A unique constraint covering the columns `[uuid]` on the table `upward_waitlist` will be added. If there are existing duplicate values, this will fail.
  - The required column `uuid` was added to the `upward_waitlist` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "subaccountId" INTEGER;

-- AlterTable
ALTER TABLE "upward_waitlist" ADD COLUMN     "uuid" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "upward_feedback" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER,
    "email" TEXT,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_feedback_uuid_key" ON "upward_feedback"("uuid");

-- CreateIndex
CREATE INDEX "upward_feedback_userId_idx" ON "upward_feedback"("userId");

-- CreateIndex
CREATE INDEX "upward_feedback_type_idx" ON "upward_feedback"("type");

-- CreateIndex
CREATE INDEX "upward_feedback_createdAt_idx" ON "upward_feedback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upward_waitlist_uuid_key" ON "upward_waitlist"("uuid");

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "upward_paystack_subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_feedback" ADD CONSTRAINT "upward_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
