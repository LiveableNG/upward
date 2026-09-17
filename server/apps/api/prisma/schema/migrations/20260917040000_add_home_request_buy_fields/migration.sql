-- AlterTable
ALTER TABLE "upward_home_request" ADD COLUMN IF NOT EXISTS "requestType" TEXT NOT NULL DEFAULT 'RENT';
ALTER TABLE "upward_home_request" ADD COLUMN IF NOT EXISTS "savedAmount" DOUBLE PRECISION;
ALTER TABLE "upward_home_request" ADD COLUMN IF NOT EXISTS "overallBudget" DOUBLE PRECISION;
ALTER TABLE "upward_home_request" ALTER COLUMN "budgetMin" SET DEFAULT 0;
ALTER TABLE "upward_home_request" ALTER COLUMN "budgetMax" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_home_request_requestType_idx" ON "upward_home_request"("requestType");
