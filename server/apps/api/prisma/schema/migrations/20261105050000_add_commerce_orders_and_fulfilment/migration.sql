-- CreateEnum
CREATE TYPE "CommerceOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CommercePaymentStatus" AS ENUM ('UNPAID', 'INITIATED', 'PAID', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'REVERSED');

-- CreateEnum
CREATE TYPE "CustomerFulfilmentStatus" AS ENUM ('ORDER_CONFIRMED', 'PROCESSING', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'SERVICE_SCHEDULED', 'TECHNICIAN_EN_ROUTE', 'SERVICE_COMPLETED', 'RECEIVED_CONFIRMED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdminOperationalStatus" AS ENUM ('AWAITING_VENDOR_CONFIRMATION', 'VENDOR_CONFIRMED', 'VENDOR_DECLINED', 'CARRIER_DISPATCHED', 'TECHNICIAN_ASSIGNED', 'DELIVERED_PENDING_INSPECTION', 'FULFILMENT_CLOSED', 'DISPUTE_LOGGED', 'CANCELLED_REFUNDED');

-- CreateEnum
CREATE TYPE "VendorPayableStatus" AS ENUM ('PENDING_FULFILMENT', 'IN_COOLING_PERIOD', 'ELIGIBLE_FOR_PAYOUT', 'PAYOUT_SUBMITTED', 'PAID_OUT', 'HELD_FOR_DISPUTE', 'VOIDED_REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutTransferStatus" AS ENUM ('INITIATED', 'SUBMITTED', 'SUCCESSFUL', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_INVESTIGATION', 'RESOLVED_REFUND', 'RESOLVED_PAYOUT', 'SETTLED_COMPROMISE', 'CLOSED');

-- CreateTable
CREATE TABLE "upward_commerce_order" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "CommerceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "CommercePaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
    "itemsSubtotalKobo" BIGINT NOT NULL,
    "deliveryFeeKobo" BIGINT NOT NULL DEFAULT 0,
    "taxKobo" BIGINT NOT NULL DEFAULT 0,
    "discountKobo" BIGINT NOT NULL DEFAULT 0,
    "totalAmountKobo" BIGINT NOT NULL,
    "paymentReference" VARCHAR(100),
    "paidAt" TIMESTAMP(3),
    "recipientName" VARCHAR(150) NOT NULL,
    "recipientPhone" VARCHAR(50) NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_commerce_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_vendor_suborder" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "subOrderNumber" VARCHAR(60) NOT NULL,
    "customerStatus" "CustomerFulfilmentStatus" NOT NULL DEFAULT 'ORDER_CONFIRMED',
    "operationalStatus" "AdminOperationalStatus" NOT NULL DEFAULT 'AWAITING_VENDOR_CONFIRMATION',
    "subtotalKobo" BIGINT NOT NULL,
    "deliveryFeeKobo" BIGINT NOT NULL DEFAULT 0,
    "allocatedDiscountKobo" BIGINT NOT NULL DEFAULT 0,
    "platformFeeKobo" BIGINT NOT NULL DEFAULT 0,
    "vendorPayoutKobo" BIGINT NOT NULL,
    "carrierName" VARCHAR(100),
    "trackingNumber" VARCHAR(100),
    "trackingUrl" VARCHAR(500),
    "serviceScheduledAt" TIMESTAMP(3),
    "serviceWindowNotes" VARCHAR(200),
    "technicianName" VARCHAR(100),
    "technicianPhone" VARCHAR(50),
    "adminOperationalNotes" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "tenantConfirmedAt" TIMESTAMP(3),
    "coolingPeriodEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_commerce_vendor_suborder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_order_item" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subOrderId" INTEGER NOT NULL,
    "offeringId" INTEGER,
    "offeringType" "OfferingType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceKobo" BIGINT NOT NULL,
    "totalPriceKobo" BIGINT NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_commerce_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_fulfilment_event" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subOrderId" INTEGER NOT NULL,
    "status" "CustomerFulfilmentStatus" NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "isCustomerVisible" BOOLEAN NOT NULL DEFAULT true,
    "carrierName" VARCHAR(100),
    "trackingNumber" VARCHAR(100),
    "serviceDateTime" TIMESTAMP(3),
    "actorType" VARCHAR(20) NOT NULL,
    "actorId" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_commerce_fulfilment_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_vendor_payable" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subOrderId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "status" "VendorPayableStatus" NOT NULL DEFAULT 'PENDING_FULFILMENT',
    "grossAmountKobo" BIGINT NOT NULL,
    "commissionKobo" BIGINT NOT NULL,
    "netPayableKobo" BIGINT NOT NULL,
    "bankCode" VARCHAR(20) NOT NULL,
    "accountNumber" VARCHAR(30) NOT NULL,
    "accountName" VARCHAR(150) NOT NULL,
    "eligibleAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_commerce_vendor_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_payout_transfer_attempt" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "payableId" INTEGER NOT NULL,
    "transferReference" VARCHAR(100) NOT NULL,
    "paystackTransferCode" VARCHAR(100),
    "status" "PayoutTransferStatus" NOT NULL DEFAULT 'INITIATED',
    "makerAdminId" VARCHAR(100) NOT NULL,
    "checkerAdminId" VARCHAR(100),
    "gatewayResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_commerce_payout_transfer_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_payment_attempt" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "reference" VARCHAR(100) NOT NULL,
    "amountKobo" BIGINT NOT NULL,
    "channel" VARCHAR(50),
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "gatewayResponse" TEXT,
    "ipAddress" VARCHAR(50),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_commerce_payment_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_dispute" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subOrderId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" VARCHAR(150) NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidenceUrls" JSONB,
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_commerce_dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_refund" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "subOrderId" INTEGER NOT NULL,
    "amountKobo" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedBy" VARCHAR(100) NOT NULL,
    "approvedBy" VARCHAR(100),
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_commerce_refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_refund_attempt" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "refundId" INTEGER NOT NULL,
    "gatewayReference" VARCHAR(100) NOT NULL,
    "paystackRefundId" VARCHAR(100),
    "status" TEXT NOT NULL DEFAULT 'INITIATED',
    "gatewayResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_commerce_refund_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_order_audit" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "event" VARCHAR(100) NOT NULL,
    "fromState" VARCHAR(50),
    "toState" VARCHAR(50) NOT NULL,
    "actorType" VARCHAR(20) NOT NULL,
    "actorId" VARCHAR(100),
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_commerce_order_audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_order_uuid_key" ON "upward_commerce_order"("uuid");
CREATE UNIQUE INDEX "upward_commerce_order_orderNumber_key" ON "upward_commerce_order"("orderNumber");
CREATE UNIQUE INDEX "upward_commerce_order_paymentReference_key" ON "upward_commerce_order"("paymentReference");
CREATE INDEX "upward_commerce_order_userId_status_idx" ON "upward_commerce_order"("userId", "status");
CREATE INDEX "upward_commerce_order_orderNumber_idx" ON "upward_commerce_order"("orderNumber");
CREATE INDEX "upward_commerce_order_paymentReference_idx" ON "upward_commerce_order"("paymentReference");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_vendor_suborder_uuid_key" ON "upward_commerce_vendor_suborder"("uuid");
CREATE UNIQUE INDEX "upward_commerce_vendor_suborder_subOrderNumber_key" ON "upward_commerce_vendor_suborder"("subOrderNumber");
CREATE INDEX "upward_commerce_vendor_suborder_orderId_idx" ON "upward_commerce_vendor_suborder"("orderId");
CREATE INDEX "upward_commerce_vendor_suborder_vendorId_customerStatus_idx" ON "upward_commerce_vendor_suborder"("vendorId", "customerStatus");
CREATE INDEX "upward_commerce_vendor_suborder_operationalStatus_idx" ON "upward_commerce_vendor_suborder"("operationalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_order_item_uuid_key" ON "upward_commerce_order_item"("uuid");
CREATE INDEX "upward_commerce_order_item_subOrderId_idx" ON "upward_commerce_order_item"("subOrderId");
CREATE INDEX "upward_commerce_order_item_offeringId_idx" ON "upward_commerce_order_item"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_fulfilment_event_uuid_key" ON "upward_commerce_fulfilment_event"("uuid");
CREATE INDEX "upward_commerce_fulfilment_event_subOrderId_createdAt_idx" ON "upward_commerce_fulfilment_event"("subOrderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_vendor_payable_uuid_key" ON "upward_commerce_vendor_payable"("uuid");
CREATE UNIQUE INDEX "upward_commerce_vendor_payable_subOrderId_key" ON "upward_commerce_vendor_payable"("subOrderId");
CREATE INDEX "upward_commerce_vendor_payable_vendorId_status_idx" ON "upward_commerce_vendor_payable"("vendorId", "status");
CREATE INDEX "upward_commerce_vendor_payable_status_idx" ON "upward_commerce_vendor_payable"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_payout_transfer_attempt_uuid_key" ON "upward_commerce_payout_transfer_attempt"("uuid");
CREATE UNIQUE INDEX "upward_commerce_payout_transfer_attempt_transferReference_key" ON "upward_commerce_payout_transfer_attempt"("transferReference");
CREATE INDEX "upward_commerce_payout_transfer_attempt_payableId_idx" ON "upward_commerce_payout_transfer_attempt"("payableId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_payment_attempt_uuid_key" ON "upward_commerce_payment_attempt"("uuid");
CREATE UNIQUE INDEX "upward_commerce_payment_attempt_reference_key" ON "upward_commerce_payment_attempt"("reference");
CREATE INDEX "upward_commerce_payment_attempt_orderId_idx" ON "upward_commerce_payment_attempt"("orderId");
CREATE INDEX "upward_commerce_payment_attempt_reference_idx" ON "upward_commerce_payment_attempt"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_dispute_uuid_key" ON "upward_commerce_dispute"("uuid");
CREATE INDEX "upward_commerce_dispute_subOrderId_idx" ON "upward_commerce_dispute"("subOrderId");
CREATE INDEX "upward_commerce_dispute_status_idx" ON "upward_commerce_dispute"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_refund_uuid_key" ON "upward_commerce_refund"("uuid");
CREATE INDEX "upward_commerce_refund_subOrderId_idx" ON "upward_commerce_refund"("subOrderId");
CREATE INDEX "upward_commerce_refund_status_idx" ON "upward_commerce_refund"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_refund_attempt_uuid_key" ON "upward_commerce_refund_attempt"("uuid");
CREATE UNIQUE INDEX "upward_commerce_refund_attempt_gatewayReference_key" ON "upward_commerce_refund_attempt"("gatewayReference");
CREATE INDEX "upward_commerce_refund_attempt_refundId_idx" ON "upward_commerce_refund_attempt"("refundId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_order_audit_uuid_key" ON "upward_commerce_order_audit"("uuid");
CREATE INDEX "upward_commerce_order_audit_orderId_idx" ON "upward_commerce_order_audit"("orderId");

-- AddForeignKey
ALTER TABLE "upward_commerce_order" ADD CONSTRAINT "upward_commerce_order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_vendor_suborder" ADD CONSTRAINT "upward_commerce_vendor_suborder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "upward_commerce_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_vendor_suborder" ADD CONSTRAINT "upward_commerce_vendor_suborder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "upward_commerce_vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_order_item" ADD CONSTRAINT "upward_commerce_order_item_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "upward_commerce_vendor_suborder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_order_item" ADD CONSTRAINT "upward_commerce_order_item_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "upward_offering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_fulfilment_event" ADD CONSTRAINT "upward_commerce_fulfilment_event_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "upward_commerce_vendor_suborder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_vendor_payable" ADD CONSTRAINT "upward_commerce_vendor_payable_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "upward_commerce_vendor_suborder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_vendor_payable" ADD CONSTRAINT "upward_commerce_vendor_payable_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "upward_commerce_vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_payout_transfer_attempt" ADD CONSTRAINT "upward_commerce_payout_transfer_attempt_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "upward_commerce_vendor_payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_payment_attempt" ADD CONSTRAINT "upward_commerce_payment_attempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "upward_commerce_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_dispute" ADD CONSTRAINT "upward_commerce_dispute_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "upward_commerce_vendor_suborder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_refund" ADD CONSTRAINT "upward_commerce_refund_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "upward_commerce_vendor_suborder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_refund_attempt" ADD CONSTRAINT "upward_commerce_refund_attempt_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "upward_commerce_refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_commerce_order_audit" ADD CONSTRAINT "upward_commerce_order_audit_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "upward_commerce_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
