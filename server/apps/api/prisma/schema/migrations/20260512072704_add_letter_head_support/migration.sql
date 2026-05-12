-- AlterTable
ALTER TABLE "upward_pm_sent_document" ADD COLUMN     "includeLetterhead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "upward_property_manager" ADD COLUMN     "letterheadFooterUrl" TEXT,
ADD COLUMN     "letterheadHeaderUrl" TEXT;
