-- AlterTable
ALTER TABLE "upward_webhook_log" ADD COLUMN     "direction" TEXT NOT NULL DEFAULT 'OUTGOING',
ALTER COLUMN "platformId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "upward_webhook_log_direction_idx" ON "upward_webhook_log"("direction");
