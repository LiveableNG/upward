-- AlterTable
ALTER TABLE "upward_pm_unit" ADD COLUMN     "rentReminderDaysBefore" SMALLINT,
ADD COLUMN     "rentReminderEnabled" BOOLEAN NOT NULL DEFAULT false;
