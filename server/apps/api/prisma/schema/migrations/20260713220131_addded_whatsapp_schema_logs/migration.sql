-- CreateTable
CREATE TABLE "upward_whatsapp_sequence_log" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userId" INTEGER NOT NULL,
    "phoneEncrypted" TEXT,
    "phoneHash" TEXT,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(0) NOT NULL,
    "sentAt" TIMESTAMP(0),
    "errorReason" TEXT,
    "templateName" VARCHAR(255) NOT NULL,
    "templateData" JSONB,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_whatsapp_sequence_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_sequence_log_uuid_unique" ON "upward_whatsapp_sequence_log"("uuid");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sequence_log_userid_index" ON "upward_whatsapp_sequence_log"("userId");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sequence_log_status_scheduledfor_index" ON "upward_whatsapp_sequence_log"("status", "scheduledFor");

-- AddForeignKey
ALTER TABLE "upward_whatsapp_sequence_log" ADD CONSTRAINT "upward_whatsapp_sequence_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
