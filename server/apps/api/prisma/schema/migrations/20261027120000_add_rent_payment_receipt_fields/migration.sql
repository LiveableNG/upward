-- AlterTable
ALTER TABLE "upward_pm_rent_payment" ADD COLUMN "receiptUrl" TEXT,
ADD COLUMN "receiptFileName" TEXT,
ADD COLUMN "receiptFileType" TEXT,
ADD COLUMN "receiptFileSize" INTEGER;
