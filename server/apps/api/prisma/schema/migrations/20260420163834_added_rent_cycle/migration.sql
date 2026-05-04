-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "amountRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isPastTenancy" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "upward_property_inspection" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userPropertyId" INTEGER NOT NULL,
    "inspectorName" TEXT,
    "score" DOUBLE PRECISION,
    "reportUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'UPWARD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_property_inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_property_infraction" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userPropertyId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amountOwed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "reportedToBureau" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_property_infraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_rent_cycle" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userPropertyId" INTEGER,
    "paymentRequestId" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "amountOwed" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_rent_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_credibility_request" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "propertyUuid" TEXT NOT NULL,
    "companyName" TEXT,
    "managerName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_credibility_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_inspection_uuid_key" ON "upward_property_inspection"("uuid");

-- CreateIndex
CREATE INDEX "upward_property_inspection_userPropertyId_idx" ON "upward_property_inspection"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_infraction_uuid_key" ON "upward_property_infraction"("uuid");

-- CreateIndex
CREATE INDEX "upward_property_infraction_userPropertyId_idx" ON "upward_property_infraction"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_rent_cycle_uuid_key" ON "upward_rent_cycle"("uuid");

-- CreateIndex
CREATE INDEX "upward_rent_cycle_userId_idx" ON "upward_rent_cycle"("userId");

-- CreateIndex
CREATE INDEX "upward_rent_cycle_userPropertyId_idx" ON "upward_rent_cycle"("userPropertyId");

-- CreateIndex
CREATE INDEX "upward_rent_cycle_status_idx" ON "upward_rent_cycle"("status");

-- CreateIndex
CREATE INDEX "upward_rent_cycle_dueDate_idx" ON "upward_rent_cycle"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "upward_credibility_request_uuid_key" ON "upward_credibility_request"("uuid");

-- CreateIndex
CREATE INDEX "upward_credibility_request_userId_idx" ON "upward_credibility_request"("userId");

-- CreateIndex
CREATE INDEX "upward_credibility_request_propertyUuid_idx" ON "upward_credibility_request"("propertyUuid");

-- CreateIndex
CREATE INDEX "upward_credibility_request_status_idx" ON "upward_credibility_request"("status");

-- AddForeignKey
ALTER TABLE "upward_property_inspection" ADD CONSTRAINT "upward_property_inspection_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_property_infraction" ADD CONSTRAINT "upward_property_infraction_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_cycle" ADD CONSTRAINT "upward_rent_cycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_cycle" ADD CONSTRAINT "upward_rent_cycle_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_cycle" ADD CONSTRAINT "upward_rent_cycle_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_credibility_request" ADD CONSTRAINT "upward_credibility_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
