-- Add flexible Save & Earn rate, vault lockMode (LOCKED | FLEXIBLE),
-- fixed plannedMonthlyDepositKobo, and end-of-month default payday (28th).

ALTER TABLE "upward_platform_rate_config"
  ADD COLUMN IF NOT EXISTS "flexibleSavingsAnnualRatePct" DOUBLE PRECISION NOT NULL DEFAULT 12.0;

ALTER TABLE "upward_rent_vault"
  ADD COLUMN IF NOT EXISTS "lockMode" TEXT NOT NULL DEFAULT 'LOCKED';

ALTER TABLE "upward_rent_vault"
  ADD COLUMN IF NOT EXISTS "plannedMonthlyDepositKobo" BIGINT NOT NULL DEFAULT 0;

ALTER TABLE "upward_rent_vault"
  ALTER COLUMN "paydayDayOfMonth" SET DEFAULT 28;
