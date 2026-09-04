-- AlterTable
ALTER TABLE "upward_transaction" ADD COLUMN     "rentStartDate" TIMESTAMP(3),
ADD COLUMN     "rentEndDate" TIMESTAMP(3),
ADD COLUMN     "totalInvoiceAmount" DOUBLE PRECISION,
ADD COLUMN     "historicalPaidToDate" DOUBLE PRECISION,
ADD COLUMN     "remainingBalance" DOUBLE PRECISION,
ADD COLUMN     "isPartial" BOOLEAN;
