-- AlterTable
ALTER TABLE "upward_user_property" ADD COLUMN     "initialAmountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isFirstRent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leaseYears" INTEGER DEFAULT 1;

-- CreateTable
CREATE TABLE "upward_platform_rent_payment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userPropertyId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "rentAmountAtPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT NOT NULL DEFAULT 'PAYSTACK',
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "notes" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_platform_rent_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_platform_rent_payment_uuid_key" ON "upward_platform_rent_payment"("uuid");

-- AddForeignKey
ALTER TABLE "upward_platform_rent_payment" ADD CONSTRAINT "upward_platform_rent_payment_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
