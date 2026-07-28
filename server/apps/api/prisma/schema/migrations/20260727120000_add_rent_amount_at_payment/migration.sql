-- AlterTable
ALTER TABLE "upward_pm_rent_payment" ADD COLUMN "rentAmountAtPayment" DOUBLE PRECISION;

-- Backfill: best-effort snapshot using the unit's current rent amount.
-- This is only accurate for units that have not had a rent review since the
-- payment was recorded; there is no way to recover the true historical value
-- for units whose rent already changed before this migration ran.
UPDATE "upward_pm_rent_payment" AS rp
SET "rentAmountAtPayment" = u."rentAmount"
FROM "upward_pm_unit" AS u
WHERE rp."unitId" = u.id;

-- AlterTable
ALTER TABLE "upward_pm_rent_payment" ALTER COLUMN "rentAmountAtPayment" SET NOT NULL;
