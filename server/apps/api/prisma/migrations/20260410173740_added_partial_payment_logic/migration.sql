/*
  Warnings:

  - You are about to drop the column `lineItems` on the `upward_payment_request` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "upward_payment_request" DROP COLUMN "lineItems",
ADD COLUMN     "allowPartial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "minAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "upward_transaction" ADD COLUMN     "transactionType" TEXT NOT NULL DEFAULT 'PAYMENT';

-- CreateTable
CREATE TABLE "upward_payment_line_item" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "paymentRequestId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_payment_line_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_overpayment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "transactionId" INTEGER,
    "paymentRequestId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_overpayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_payment_line_item_uuid_key" ON "upward_payment_line_item"("uuid");

-- CreateIndex
CREATE INDEX "upward_payment_line_item_paymentRequestId_idx" ON "upward_payment_line_item"("paymentRequestId");

-- CreateIndex
CREATE INDEX "upward_payment_line_item_status_idx" ON "upward_payment_line_item"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upward_overpayment_uuid_key" ON "upward_overpayment"("uuid");

-- CreateIndex
CREATE INDEX "upward_overpayment_userId_idx" ON "upward_overpayment"("userId");

-- AddForeignKey
ALTER TABLE "upward_payment_line_item" ADD CONSTRAINT "upward_payment_line_item_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_overpayment" ADD CONSTRAINT "upward_overpayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_overpayment" ADD CONSTRAINT "upward_overpayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "upward_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_overpayment" ADD CONSTRAINT "upward_overpayment_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;
