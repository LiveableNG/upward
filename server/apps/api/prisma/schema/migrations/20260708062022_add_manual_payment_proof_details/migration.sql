-- AlterTable
ALTER TABLE "upward_payment_proof" ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "referenceNumber" TEXT,
ADD COLUMN     "senderName" TEXT,
ALTER COLUMN "fileUrl" DROP NOT NULL;
