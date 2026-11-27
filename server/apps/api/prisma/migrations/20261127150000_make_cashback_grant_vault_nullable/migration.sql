-- Make upward_savings_cashback_grant.vaultId nullable so pre-launch interest claims can reserve cashback without a vault (idempotent)
ALTER TABLE "upward_savings_cashback_grant"
  ALTER COLUMN "vaultId" DROP NOT NULL;

ALTER TABLE "upward_savings_cashback_grant"
  DROP CONSTRAINT IF EXISTS "upward_savings_cashback_grant_vaultId_fkey";

ALTER TABLE "upward_savings_cashback_grant"
  ADD CONSTRAINT "upward_savings_cashback_grant_vaultId_fkey"
  FOREIGN KEY ("vaultId") REFERENCES "upward_rent_vault"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "upward_savings_cashback_grant_status_idx"
  ON "upward_savings_cashback_grant"("status");
