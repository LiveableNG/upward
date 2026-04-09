-- CreateTable
CREATE TABLE "upward_user" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "emailHash" TEXT NOT NULL,
    "firstNameHash" TEXT NOT NULL,
    "lastNameHash" TEXT NOT NULL,
    "phoneHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rentEndDate" TIMESTAMP(3),
    "occupation" TEXT,
    "gender" TEXT,
    "dateOfBirth" TEXT,
    "isFromWaitlist" BOOLEAN NOT NULL DEFAULT false,
    "isFromInvite" BOOLEAN NOT NULL DEFAULT false,
    "profileSlug" TEXT,
    "bio" TEXT,
    "profilePic" TEXT,
    "resetPasswordOTP" TEXT,
    "resetPasswordExpires" TIMESTAMP(3),

    CONSTRAINT "upward_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_saved_landlord" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "lastAmount" DOUBLE PRECISION,
    "lastPaid" TIMESTAMP(3),
    "subaccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_saved_landlord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_transaction" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RENT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reference" TEXT NOT NULL,
    "narration" TEXT,
    "landlordId" TEXT,
    "paymentType" TEXT,
    "propertyAddress" TEXT,
    "lineItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentRequestId" INTEGER,

    CONSTRAINT "upward_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_announcement" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "iconType" TEXT NOT NULL DEFAULT 'sparkles',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_user_announcement_state" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "announcementId" INTEGER NOT NULL,
    "seenPopup" BOOLEAN NOT NULL DEFAULT false,
    "interactedPopup" BOOLEAN NOT NULL DEFAULT false,
    "seenBanner" BOOLEAN NOT NULL DEFAULT false,
    "interactedBanner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_user_announcement_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_notification" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SYSTEM',
    "url" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_payment_request" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userPropertyId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "description" TEXT,
    "lineItems" JSONB,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "subaccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_company" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "emailHash" TEXT,
    "phoneHash" TEXT,
    "nameHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "platformId" INTEGER,

    CONSTRAINT "upward_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_platform" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT,
    "emailHash" TEXT,
    "nameHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_company_user" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "upward_company_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_manager" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "emailHash" TEXT,
    "phoneHash" TEXT,
    "firstNameHash" TEXT,
    "lastNameHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_location" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "subarea" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_user_property" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER,
    "managerId" INTEGER,
    "locationId" INTEGER,
    "rentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "rentStartDate" TIMESTAMP(3),
    "rentEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_user_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_paystack_subaccount" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "subaccountCode" TEXT NOT NULL,
    "businessName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_paystack_subaccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_webhook_log" (
    "id" TEXT NOT NULL,
    "platformId" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "responseCode" INTEGER,
    "errorMessage" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "lastTriedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_webhook_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_uuid_key" ON "upward_user"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_emailHash_key" ON "upward_user"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_profileSlug_key" ON "upward_user"("profileSlug");

-- CreateIndex
CREATE INDEX "upward_user_email_idx" ON "upward_user"("email");

-- CreateIndex
CREATE INDEX "upward_user_createdAt_idx" ON "upward_user"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upward_saved_landlord_uuid_key" ON "upward_saved_landlord"("uuid");

-- CreateIndex
CREATE INDEX "upward_saved_landlord_userId_idx" ON "upward_saved_landlord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_transaction_uuid_key" ON "upward_transaction"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_transaction_reference_key" ON "upward_transaction"("reference");

-- CreateIndex
CREATE INDEX "upward_transaction_userId_idx" ON "upward_transaction"("userId");

-- CreateIndex
CREATE INDEX "upward_transaction_reference_idx" ON "upward_transaction"("reference");

-- CreateIndex
CREATE INDEX "upward_transaction_paymentRequestId_idx" ON "upward_transaction"("paymentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_announcement_uuid_key" ON "upward_announcement"("uuid");

-- CreateIndex
CREATE INDEX "upward_announcement_isActive_idx" ON "upward_announcement"("isActive");

-- CreateIndex
CREATE INDEX "upward_announcement_createdAt_idx" ON "upward_announcement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_announcement_state_uuid_key" ON "upward_user_announcement_state"("uuid");

-- CreateIndex
CREATE INDEX "upward_user_announcement_state_userId_idx" ON "upward_user_announcement_state"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_announcement_state_userId_announcementId_key" ON "upward_user_announcement_state"("userId", "announcementId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_notification_uuid_key" ON "upward_notification"("uuid");

-- CreateIndex
CREATE INDEX "upward_notification_userId_idx" ON "upward_notification"("userId");

-- CreateIndex
CREATE INDEX "upward_notification_isRead_idx" ON "upward_notification"("isRead");

-- CreateIndex
CREATE INDEX "upward_notification_createdAt_idx" ON "upward_notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upward_payment_request_uuid_key" ON "upward_payment_request"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_payment_request_reference_key" ON "upward_payment_request"("reference");

-- CreateIndex
CREATE INDEX "upward_payment_request_userId_idx" ON "upward_payment_request"("userId");

-- CreateIndex
CREATE INDEX "upward_payment_request_status_idx" ON "upward_payment_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upward_company_uuid_key" ON "upward_company"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_company_emailHash_key" ON "upward_company"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_platform_uuid_key" ON "upward_platform"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_platform_apiKey_key" ON "upward_platform"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "upward_platform_emailHash_key" ON "upward_platform"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_company_user_uuid_key" ON "upward_company_user"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_company_user_companyId_userId_key" ON "upward_company_user"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_manager_uuid_key" ON "upward_manager"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_manager_emailHash_key" ON "upward_manager"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_location_uuid_key" ON "upward_location"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_property_uuid_key" ON "upward_user_property"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_paystack_subaccount_uuid_key" ON "upward_paystack_subaccount"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_paystack_subaccount_subaccountCode_key" ON "upward_paystack_subaccount"("subaccountCode");

-- CreateIndex
CREATE INDEX "upward_paystack_subaccount_accountNumber_bankCode_idx" ON "upward_paystack_subaccount"("accountNumber", "bankCode");

-- CreateIndex
CREATE UNIQUE INDEX "upward_paystack_subaccount_accountNumber_bankCode_key" ON "upward_paystack_subaccount"("accountNumber", "bankCode");

-- CreateIndex
CREATE INDEX "upward_webhook_log_platformId_idx" ON "upward_webhook_log"("platformId");

-- CreateIndex
CREATE INDEX "upward_webhook_log_status_idx" ON "upward_webhook_log"("status");

-- CreateIndex
CREATE INDEX "upward_webhook_log_createdAt_idx" ON "upward_webhook_log"("createdAt");

-- AddForeignKey
ALTER TABLE "upward_saved_landlord" ADD CONSTRAINT "upward_saved_landlord_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "upward_paystack_subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_transaction" ADD CONSTRAINT "upward_transaction_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_announcement_state" ADD CONSTRAINT "upward_user_announcement_state_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "upward_announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_announcement_state" ADD CONSTRAINT "upward_user_announcement_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_notification" ADD CONSTRAINT "upward_notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "upward_paystack_subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_company" ADD CONSTRAINT "upward_company_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "upward_platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_company_user" ADD CONSTRAINT "upward_company_user_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "upward_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_company_user" ADD CONSTRAINT "upward_company_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_manager" ADD CONSTRAINT "upward_manager_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "upward_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "upward_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "upward_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "upward_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_webhook_log" ADD CONSTRAINT "upward_webhook_log_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "upward_platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
