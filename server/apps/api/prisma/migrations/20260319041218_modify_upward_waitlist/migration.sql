-- DropForeignKey
ALTER TABLE "upward_attendance" DROP CONSTRAINT "upward_attendance_userId_fkey";

-- DropForeignKey
ALTER TABLE "upward_email_log" DROP CONSTRAINT "upward_email_log_userId_fkey";

-- AddForeignKey
ALTER TABLE "upward_attendance" ADD CONSTRAINT "upward_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_waitlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_email_log" ADD CONSTRAINT "upward_email_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_waitlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
