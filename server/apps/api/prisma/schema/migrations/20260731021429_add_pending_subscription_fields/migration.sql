-- AlterTable
ALTER TABLE "upward_subscription" ADD COLUMN     "pendingTier" "UpwardSubscriptionTier",
ADD COLUMN     "pendingUnitBillingMode" "UpwardUnitBillingMode";
