-- AlterTable
ALTER TABLE "upward_payment_request" ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "upward_transaction" ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false;
