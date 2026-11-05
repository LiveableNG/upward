-- CreateEnum
CREATE TYPE "DeliveryCoverageType" AS ENUM ('NATIONWIDE', 'REGIONAL_ZONES', 'PICKUP_ONLY');

-- AlterTable
ALTER TABLE "upward_commerce_vendor" ADD COLUMN "defaultDeliveryCoverage" "DeliveryCoverageType" NOT NULL DEFAULT 'NATIONWIDE',
ADD COLUMN "defaultDeliveryZones" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "upward_offering" ADD COLUMN "deliveryCoverageType" "DeliveryCoverageType" NOT NULL DEFAULT 'NATIONWIDE',
ADD COLUMN "deliveryZones" TEXT[] DEFAULT ARRAY[]::TEXT[];
