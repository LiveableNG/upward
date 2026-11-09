-- AlterTable
ALTER TABLE "upward_commerce_order" ADD COLUMN IF NOT EXISTS "deliveryZoneTag" VARCHAR(100);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_commerce_delivery_zone" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "state" VARCHAR(100) NOT NULL,
    "region" VARCHAR(150),
    "areasCovered" TEXT,
    "isDelivering" BOOLEAN NOT NULL DEFAULT true,
    "deliveryFeeKobo" BIGINT NOT NULL DEFAULT 0,
    "estimatedDeliveryDays" VARCHAR(100),
    "pauseReason" VARCHAR(255),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_commerce_delivery_zone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_commerce_delivery_zone_uuid_key" ON "upward_commerce_delivery_zone"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_commerce_delivery_zone_tag_key" ON "upward_commerce_delivery_zone"("tag");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_commerce_delivery_zone_state_idx" ON "upward_commerce_delivery_zone"("state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_commerce_delivery_zone_isDelivering_idx" ON "upward_commerce_delivery_zone"("isDelivering");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_commerce_delivery_zone_sortOrder_idx" ON "upward_commerce_delivery_zone"("sortOrder");
