-- AlterTable
ALTER TABLE "upward_whatsapp_sequence_log" ADD COLUMN     "metaMessageId" VARCHAR(255),
ADD COLUMN     "isDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deliveredAt" TIMESTAMP(0),
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readAt" TIMESTAMP(0);

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_sequence_log_metaMessageId_key" ON "upward_whatsapp_sequence_log"("metaMessageId");
