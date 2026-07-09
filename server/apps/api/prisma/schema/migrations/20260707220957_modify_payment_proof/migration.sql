-- AlterTable
ALTER TABLE "upward_payment_proof" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'NGN',
ADD COLUMN     "userPropertyId" INTEGER,
ALTER COLUMN "paymentRequestId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "upward_payment_proof_userPropertyId_idx" ON "upward_payment_proof"("userPropertyId");

-- AddForeignKey
ALTER TABLE "upward_payment_proof" ADD CONSTRAINT "upward_payment_proof_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
