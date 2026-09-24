-- AlterTable upward_early_access
ALTER TABLE "upward_early_access" ADD COLUMN IF NOT EXISTS "abVariant" TEXT DEFAULT 'A';
CREATE INDEX IF NOT EXISTS "upward_early_access_abVariant_idx" ON "upward_early_access"("abVariant");

-- AlterTable upward_university_application
ALTER TABLE "upward_university_application" ADD COLUMN IF NOT EXISTS "abVariant" TEXT DEFAULT 'A';
CREATE INDEX IF NOT EXISTS "upward_university_application_abVariant_idx" ON "upward_university_application"("abVariant");

-- AlterTable upward_university_visit
ALTER TABLE "upward_university_visit" ADD COLUMN IF NOT EXISTS "abVariant" TEXT DEFAULT 'A';
CREATE INDEX IF NOT EXISTS "upward_university_visit_abVariant_idx" ON "upward_university_visit"("abVariant");
