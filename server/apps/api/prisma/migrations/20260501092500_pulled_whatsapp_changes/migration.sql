-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "rentReminderDaysBefore" SMALLINT,
ADD COLUMN     "rentReminderEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "upward_whatsapp_rent_reminder_log" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userPropertyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "phone" VARCHAR(255),
    "daysBefore" SMALLINT NOT NULL,
    "dueDate" DATE NOT NULL,
    "reminderDate" DATE NOT NULL,
    "status" VARCHAR(255) NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_whatsapp_rent_reminder_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_rent_reminder_log_uuid_unique" ON "upward_whatsapp_rent_reminder_log"("uuid");

-- CreateIndex
CREATE INDEX "upward_whatsapp_rent_reminder_log_duedate_index" ON "upward_whatsapp_rent_reminder_log"("dueDate");

-- CreateIndex
CREATE INDEX "upward_whatsapp_rent_reminder_log_reminderdate_index" ON "upward_whatsapp_rent_reminder_log"("reminderDate");

-- CreateIndex
CREATE INDEX "upward_whatsapp_rent_reminder_log_userid_index" ON "upward_whatsapp_rent_reminder_log"("userId");

-- CreateIndex
CREATE INDEX "upward_whatsapp_rent_reminder_log_userpropertyid_index" ON "upward_whatsapp_rent_reminder_log"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "uwrrl_property_reminder_date_unique" ON "upward_whatsapp_rent_reminder_log"("userPropertyId", "reminderDate");
