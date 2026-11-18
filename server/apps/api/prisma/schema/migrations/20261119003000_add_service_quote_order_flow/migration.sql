-- Add QUOTE_REQUESTED and QUOTE_PROVIDED to CustomerFulfilmentStatus enum
ALTER TYPE "CustomerFulfilmentStatus" ADD VALUE IF NOT EXISTS 'QUOTE_REQUESTED';
ALTER TYPE "CustomerFulfilmentStatus" ADD VALUE IF NOT EXISTS 'QUOTE_PROVIDED';

-- Add quote & service review columns to upward_commerce_vendor_suborder
ALTER TABLE "upward_commerce_vendor_suborder"
  ADD COLUMN IF NOT EXISTS "quoteNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "quotedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "serviceRating" INTEGER,
  ADD COLUMN IF NOT EXISTS "serviceReviewComment" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- Create upward_commerce_order_message table for interactive quote milestone conversation
CREATE TABLE IF NOT EXISTS "upward_commerce_order_message" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "subOrderId" INTEGER NOT NULL,
  "senderType" VARCHAR(20) NOT NULL,
  "senderId" VARCHAR(100),
  "senderName" VARCHAR(150),
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_commerce_order_message_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "upward_commerce_order_message_uuid_key"
  ON "upward_commerce_order_message"("uuid");

CREATE INDEX IF NOT EXISTS "upward_commerce_order_message_subOrderId_createdAt_idx"
  ON "upward_commerce_order_message"("subOrderId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'upward_commerce_order_message_subOrderId_fkey'
  ) THEN
    ALTER TABLE "upward_commerce_order_message"
      ADD CONSTRAINT "upward_commerce_order_message_subOrderId_fkey"
      FOREIGN KEY ("subOrderId")
      REFERENCES "upward_commerce_vendor_suborder"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
