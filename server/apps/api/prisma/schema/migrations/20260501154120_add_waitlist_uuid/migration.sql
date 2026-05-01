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
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "transactionType" TEXT NOT NULL DEFAULT 'PAYMENT',

    CONSTRAINT "upward_transaction_pkey" PRIMARY KEY ("id")
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
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "subaccountId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "allowPartial" BOOLEAN NOT NULL DEFAULT false,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minAmount" DOUBLE PRECISION,
    "isManual" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "upward_payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_payment_line_item" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "paymentRequestId" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "upward_payment_line_item_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "upward_overpayment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "transactionId" INTEGER,
    "paymentRequestId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_overpayment_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "upward_property_manager" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "firstNameHash" TEXT,
    "lastName" TEXT NOT NULL,
    "lastNameHash" TEXT,
    "businessName" TEXT,
    "phone" TEXT,
    "phoneHash" TEXT,
    "profilePic" TEXT,
    "bankName" TEXT,
    "bankCode" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_property_manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_auth_session" (
    "id" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_property" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "propertyType" TEXT NOT NULL DEFAULT 'Residential',
    "imageUrl" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "state" TEXT,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "landlordEmailEncrypted" TEXT,
    "landlordEmailHash" TEXT,
    "landlordNameEncrypted" TEXT,
    "landlordNameSearch" TEXT,
    "landlordPhoneEncrypted" TEXT,
    "landlordPhoneHash" TEXT,

    CONSTRAINT "upward_pm_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_unit" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "unitName" TEXT NOT NULL,
    "rentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rentStartDate" TIMESTAMP(3),
    "rentDueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" TEXT NOT NULL DEFAULT 'VACANT',
    "tenantId" INTEGER,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "userPropertyUuid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "managementFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "rentType" TEXT NOT NULL DEFAULT 'Monthly',

    CONSTRAINT "upward_pm_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_tenant" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "firstNameEncrypted" TEXT,
    "firstNameSearch" TEXT,
    "lastNameEncrypted" TEXT,
    "lastNameSearch" TEXT,
    "emailEncrypted" TEXT,
    "emailHash" TEXT,
    "phoneEncrypted" TEXT,
    "phoneHash" TEXT,
    "inviteStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "inviteSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_rent_payment" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "unitId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "method" TEXT NOT NULL DEFAULT 'Bank Transfer',
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_rent_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_payment_request" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "tenantId" INTEGER,
    "paymentRequestId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "allowPartial" BOOLEAN NOT NULL DEFAULT false,
    "minAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_payment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_bulk_invite" (
    "id" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalTenants" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_bulk_invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_bulk_invite_item" (
    "id" TEXT NOT NULL,
    "bulkInviteId" TEXT NOT NULL,
    "tenantUuid" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_bulk_invite_item_pkey" PRIMARY KEY ("id")
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
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amountRemaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPastTenancy" BOOLEAN NOT NULL DEFAULT false,
    "pmId" INTEGER,
    "pmUnitId" INTEGER,
    "rentReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rentReminderDaysBefore" SMALLINT,

    CONSTRAINT "upward_user_property_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "upward_user_contract" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userPropertyId" INTEGER,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_user_contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_waitlist" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "benefits" TEXT[],
    "acceptTerms" BOOLEAN NOT NULL DEFAULT false,
    "wantsAmbassador" BOOLEAN NOT NULL DEFAULT false,
    "country" TEXT,
    "city" TEXT,
    "selectedSession" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmationSent" BOOLEAN NOT NULL DEFAULT false,
    "abVariant" TEXT,
    "confirmationEmailError" TEXT,
    "confirmationEmailRetries" INTEGER NOT NULL DEFAULT 0,
    "confirmationEmailStatus" TEXT,
    "campaignWeekSent" INTEGER NOT NULL DEFAULT 0,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "upward_waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_session" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "googleMeetLink" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_attendance" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_email_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "subject" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "lastError" TEXT,
    "mailgunId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'GENERIC',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "body" TEXT,

    CONSTRAINT "upward_email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_interaction" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "abVariant" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT,

    CONSTRAINT "upward_interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_error_log" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "context" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'ERROR',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_error_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_email_campaign" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_email_campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_system_email" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_system_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_fairness_story" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "categories" TEXT[],
    "story" TEXT NOT NULL,
    "audioUrl" TEXT,
    "fileUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_fairness_story_pkey" PRIMARY KEY ("id")
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
    "url" TEXT,

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

-- CreateTable
CREATE TABLE "upward_support_ticket" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_support_ticket_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "upward_auth_session" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "deviceId" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_verification_token" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "token" TEXT,
    "otp" TEXT,
    "context" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "metadata" JSONB,
    "resends" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_verification_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_device_token" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_device_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_admin_log" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_admin_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_whatsapp_sessions" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "phone" VARCHAR(255),
    "phoneHash" VARCHAR(255),
    "state" VARCHAR(255) NOT NULL DEFAULT 'NEW',
    "sessionData" JSONB,
    "lastMessageAt" TIMESTAMP(0),
    "expiresAt" TIMESTAMP(0),
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_whatsapp_transaction_pins" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "upwardUserUuid" UUID NOT NULL,
    "pinHash" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_whatsapp_transaction_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_whatsapp_rent_reminder_log" (
    "id" SERIAL NOT NULL,
    "uuid" UUID NOT NULL,
    "userPropertyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "phone" VARCHAR(255),
    "daysBefore" SMALLINT NOT NULL,
    "dueDate" DATE NOT NULL,
    "reminderDate" DATE NOT NULL,
    "status" VARCHAR(255) NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_whatsapp_rent_reminder_log_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "upward_payment_request_uuid_key" ON "upward_payment_request"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_payment_request_reference_key" ON "upward_payment_request"("reference");

-- CreateIndex
CREATE INDEX "upward_payment_request_userId_idx" ON "upward_payment_request"("userId");

-- CreateIndex
CREATE INDEX "upward_payment_request_status_idx" ON "upward_payment_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upward_payment_line_item_uuid_key" ON "upward_payment_line_item"("uuid");

-- CreateIndex
CREATE INDEX "upward_payment_line_item_paymentRequestId_idx" ON "upward_payment_line_item"("paymentRequestId");

-- CreateIndex
CREATE INDEX "upward_payment_line_item_status_idx" ON "upward_payment_line_item"("status");

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
CREATE UNIQUE INDEX "upward_overpayment_uuid_key" ON "upward_overpayment"("uuid");

-- CreateIndex
CREATE INDEX "upward_overpayment_userId_idx" ON "upward_overpayment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_paystack_subaccount_uuid_key" ON "upward_paystack_subaccount"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_paystack_subaccount_subaccountCode_key" ON "upward_paystack_subaccount"("subaccountCode");

-- CreateIndex
CREATE INDEX "upward_paystack_subaccount_accountNumber_bankCode_idx" ON "upward_paystack_subaccount"("accountNumber", "bankCode");

-- CreateIndex
CREATE UNIQUE INDEX "upward_paystack_subaccount_accountNumber_bankCode_key" ON "upward_paystack_subaccount"("accountNumber", "bankCode");

-- CreateIndex
CREATE UNIQUE INDEX "upward_saved_landlord_uuid_key" ON "upward_saved_landlord"("uuid");

-- CreateIndex
CREATE INDEX "upward_saved_landlord_userId_idx" ON "upward_saved_landlord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_manager_uuid_key" ON "upward_property_manager"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_manager_email_key" ON "upward_property_manager"("email");

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_manager_emailHash_key" ON "upward_property_manager"("emailHash");

-- CreateIndex
CREATE INDEX "upward_property_manager_email_idx" ON "upward_property_manager"("email");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_auth_session_refreshTokenHash_key" ON "upward_pm_auth_session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "upward_pm_auth_session_pmId_idx" ON "upward_pm_auth_session"("pmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_property_uuid_key" ON "upward_pm_property"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_property_pmId_idx" ON "upward_pm_property"("pmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_unit_uuid_key" ON "upward_pm_unit"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_unit_propertyId_idx" ON "upward_pm_unit"("propertyId");

-- CreateIndex
CREATE INDEX "upward_pm_unit_status_idx" ON "upward_pm_unit"("status");

-- CreateIndex
CREATE INDEX "upward_pm_unit_tenantId_idx" ON "upward_pm_unit"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_tenant_uuid_key" ON "upward_pm_tenant"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_tenant_pmId_idx" ON "upward_pm_tenant"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_tenant_emailHash_idx" ON "upward_pm_tenant"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_rent_payment_uuid_key" ON "upward_pm_rent_payment"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_rent_payment_unitId_idx" ON "upward_pm_rent_payment"("unitId");

-- CreateIndex
CREATE INDEX "upward_pm_rent_payment_paymentDate_idx" ON "upward_pm_rent_payment"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_payment_request_uuid_key" ON "upward_pm_payment_request"("uuid");

-- CreateIndex
CREATE INDEX "upward_pm_payment_request_pmId_idx" ON "upward_pm_payment_request"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_payment_request_unitId_idx" ON "upward_pm_payment_request"("unitId");

-- CreateIndex
CREATE INDEX "upward_pm_payment_request_status_idx" ON "upward_pm_payment_request"("status");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_invite_pmId_idx" ON "upward_pm_bulk_invite"("pmId");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_invite_status_idx" ON "upward_pm_bulk_invite"("status");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_invite_item_bulkInviteId_idx" ON "upward_pm_bulk_invite_item"("bulkInviteId");

-- CreateIndex
CREATE INDEX "upward_pm_bulk_invite_item_status_idx" ON "upward_pm_bulk_invite_item"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_property_uuid_key" ON "upward_user_property"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_location_uuid_key" ON "upward_location"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_company_uuid_key" ON "upward_company"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_company_emailHash_key" ON "upward_company"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_company_user_uuid_key" ON "upward_company_user"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_company_user_companyId_userId_key" ON "upward_company_user"("companyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_manager_uuid_key" ON "upward_manager"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_manager_emailHash_key" ON "upward_manager"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_inspection_uuid_key" ON "upward_property_inspection"("uuid");

-- CreateIndex
CREATE INDEX "upward_property_inspection_userPropertyId_idx" ON "upward_property_inspection"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_property_infraction_uuid_key" ON "upward_property_infraction"("uuid");

-- CreateIndex
CREATE INDEX "upward_property_infraction_userPropertyId_idx" ON "upward_property_infraction"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_contract_uuid_key" ON "upward_user_contract"("uuid");

-- CreateIndex
CREATE INDEX "upward_user_contract_userId_idx" ON "upward_user_contract"("userId");

-- CreateIndex
CREATE INDEX "upward_user_contract_userPropertyId_idx" ON "upward_user_contract"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_waitlist_uuid_key" ON "upward_waitlist"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_waitlist_email_key" ON "upward_waitlist"("email");

-- CreateIndex
CREATE INDEX "upward_waitlist_email_idx" ON "upward_waitlist"("email");

-- CreateIndex
CREATE INDEX "upward_waitlist_createdAt_idx" ON "upward_waitlist"("createdAt");

-- CreateIndex
CREATE INDEX "upward_waitlist_confirmationEmailStatus_idx" ON "upward_waitlist"("confirmationEmailStatus");

-- CreateIndex
CREATE INDEX "upward_session_startTime_idx" ON "upward_session"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "upward_attendance_sessionId_userId_key" ON "upward_attendance"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "upward_email_log_userId_idx" ON "upward_email_log"("userId");

-- CreateIndex
CREATE INDEX "upward_email_log_sessionId_idx" ON "upward_email_log"("sessionId");

-- CreateIndex
CREATE INDEX "upward_email_log_status_idx" ON "upward_email_log"("status");

-- CreateIndex
CREATE INDEX "upward_email_log_type_idx" ON "upward_email_log"("type");

-- CreateIndex
CREATE INDEX "upward_interaction_visitorId_idx" ON "upward_interaction"("visitorId");

-- CreateIndex
CREATE INDEX "upward_interaction_type_idx" ON "upward_interaction"("type");

-- CreateIndex
CREATE INDEX "upward_interaction_createdAt_idx" ON "upward_interaction"("createdAt");

-- CreateIndex
CREATE INDEX "upward_error_log_createdAt_idx" ON "upward_error_log"("createdAt");

-- CreateIndex
CREATE INDEX "upward_error_log_severity_idx" ON "upward_error_log"("severity");

-- CreateIndex
CREATE INDEX "upward_error_log_resolved_idx" ON "upward_error_log"("resolved");

-- CreateIndex
CREATE UNIQUE INDEX "upward_email_campaign_weekNumber_key" ON "upward_email_campaign"("weekNumber");

-- CreateIndex
CREATE INDEX "upward_email_campaign_weekNumber_idx" ON "upward_email_campaign"("weekNumber");

-- CreateIndex
CREATE INDEX "upward_email_campaign_isActive_idx" ON "upward_email_campaign"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "upward_system_email_slug_key" ON "upward_system_email"("slug");

-- CreateIndex
CREATE INDEX "upward_system_email_slug_idx" ON "upward_system_email"("slug");

-- CreateIndex
CREATE INDEX "upward_fairness_story_createdAt_idx" ON "upward_fairness_story"("createdAt");

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
CREATE INDEX "upward_webhook_log_platformId_idx" ON "upward_webhook_log"("platformId");

-- CreateIndex
CREATE INDEX "upward_webhook_log_status_idx" ON "upward_webhook_log"("status");

-- CreateIndex
CREATE INDEX "upward_webhook_log_createdAt_idx" ON "upward_webhook_log"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upward_platform_uuid_key" ON "upward_platform"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_platform_apiKey_key" ON "upward_platform"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "upward_platform_emailHash_key" ON "upward_platform"("emailHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_credibility_request_uuid_key" ON "upward_credibility_request"("uuid");

-- CreateIndex
CREATE INDEX "upward_credibility_request_userId_idx" ON "upward_credibility_request"("userId");

-- CreateIndex
CREATE INDEX "upward_credibility_request_propertyUuid_idx" ON "upward_credibility_request"("propertyUuid");

-- CreateIndex
CREATE INDEX "upward_credibility_request_status_idx" ON "upward_credibility_request"("status");

-- CreateIndex
CREATE UNIQUE INDEX "upward_support_ticket_uuid_key" ON "upward_support_ticket"("uuid");

-- CreateIndex
CREATE INDEX "upward_support_ticket_userId_idx" ON "upward_support_ticket"("userId");

-- CreateIndex
CREATE INDEX "upward_support_ticket_status_idx" ON "upward_support_ticket"("status");

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
CREATE UNIQUE INDEX "upward_auth_session_refreshTokenHash_key" ON "upward_auth_session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "upward_auth_session_userId_idx" ON "upward_auth_session"("userId");

-- CreateIndex
CREATE INDEX "upward_auth_session_refreshTokenHash_idx" ON "upward_auth_session"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_verification_token_uuid_key" ON "upward_verification_token"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_verification_token_token_key" ON "upward_verification_token"("token");

-- CreateIndex
CREATE INDEX "upward_verification_token_token_idx" ON "upward_verification_token"("token");

-- CreateIndex
CREATE INDEX "upward_verification_token_identifier_context_idx" ON "upward_verification_token"("identifier", "context");

-- CreateIndex
CREATE INDEX "upward_device_token_userId_idx" ON "upward_device_token"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_device_token_userId_token_key" ON "upward_device_token"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "upward_admin_email_key" ON "upward_admin"("email");

-- CreateIndex
CREATE INDEX "upward_admin_email_idx" ON "upward_admin"("email");

-- CreateIndex
CREATE INDEX "upward_admin_log_adminId_idx" ON "upward_admin_log"("adminId");

-- CreateIndex
CREATE INDEX "upward_admin_log_action_idx" ON "upward_admin_log"("action");

-- CreateIndex
CREATE INDEX "upward_admin_log_createdAt_idx" ON "upward_admin_log"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_sessions_uuid_unique" ON "upward_whatsapp_sessions"("uuid");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sessions_expiresat_index" ON "upward_whatsapp_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sessions_lastmessageat_index" ON "upward_whatsapp_sessions"("lastMessageAt");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sessions_phone_index" ON "upward_whatsapp_sessions"("phone");

-- CreateIndex
CREATE INDEX "upward_whatsapp_sessions_phonehash_index" ON "upward_whatsapp_sessions"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_transaction_pins_uuid_unique" ON "upward_whatsapp_transaction_pins"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_transaction_pins_upwarduseruuid_unique" ON "upward_whatsapp_transaction_pins"("upwardUserUuid");

-- CreateIndex
CREATE INDEX "upward_whatsapp_transaction_pins_upwarduseruuid_index" ON "upward_whatsapp_transaction_pins"("upwardUserUuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_whatsapp_rent_reminder_log_uuid_unique" ON "upward_whatsapp_rent_reminder_log"("uuid");

-- CreateIndex
CREATE INDEX "upward_whatsapp_rent_reminder_log_duedate_index" ON "upward_whatsapp_rent_reminder_log"("dueDate");

-- CreateIndex
CREATE INDEX "upward_whatsapp_rent_reminder_log_reminderdate_index" ON "upward_whatsapp_rent_reminder_log"("reminderDate");

-- CreateIndex
CREATE INDEX "upward_whatsapp_rent_reminder_log_userid_index" ON "upward_whatsapp_rent_reminder_log"("userId");

-- CreateIndex
CREATE INDEX "upward_whatsapp_rent_reminder_log_userpropertyid_index" ON "upward_whatsapp_rent_reminder_log"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "uwrrl_property_reminder_date_unique" ON "upward_whatsapp_rent_reminder_log"("userPropertyId", "reminderDate");

-- AddForeignKey
ALTER TABLE "upward_transaction" ADD CONSTRAINT "upward_transaction_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "upward_paystack_subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_request" ADD CONSTRAINT "upward_payment_request_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_line_item" ADD CONSTRAINT "upward_payment_line_item_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_cycle" ADD CONSTRAINT "upward_rent_cycle_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_cycle" ADD CONSTRAINT "upward_rent_cycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_rent_cycle" ADD CONSTRAINT "upward_rent_cycle_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_overpayment" ADD CONSTRAINT "upward_overpayment_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_overpayment" ADD CONSTRAINT "upward_overpayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "upward_transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_overpayment" ADD CONSTRAINT "upward_overpayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_saved_landlord" ADD CONSTRAINT "upward_saved_landlord_subaccountId_fkey" FOREIGN KEY ("subaccountId") REFERENCES "upward_paystack_subaccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_auth_session" ADD CONSTRAINT "upward_pm_auth_session_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_property" ADD CONSTRAINT "upward_pm_property_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_unit" ADD CONSTRAINT "upward_pm_unit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "upward_pm_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_unit" ADD CONSTRAINT "upward_pm_unit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "upward_pm_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_tenant" ADD CONSTRAINT "upward_pm_tenant_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_rent_payment" ADD CONSTRAINT "upward_pm_rent_payment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "upward_pm_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "upward_pm_tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_payment_request" ADD CONSTRAINT "upward_pm_payment_request_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "upward_pm_unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_bulk_invite" ADD CONSTRAINT "upward_pm_bulk_invite_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_bulk_invite_item" ADD CONSTRAINT "upward_pm_bulk_invite_item_bulkInviteId_fkey" FOREIGN KEY ("bulkInviteId") REFERENCES "upward_pm_bulk_invite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "upward_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "upward_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "upward_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_pmUnitId_fkey" FOREIGN KEY ("pmUnitId") REFERENCES "upward_pm_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_property" ADD CONSTRAINT "upward_user_property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_company" ADD CONSTRAINT "upward_company_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "upward_platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_company_user" ADD CONSTRAINT "upward_company_user_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "upward_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_company_user" ADD CONSTRAINT "upward_company_user_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_manager" ADD CONSTRAINT "upward_manager_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "upward_company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_property_inspection" ADD CONSTRAINT "upward_property_inspection_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_property_infraction" ADD CONSTRAINT "upward_property_infraction_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_contract" ADD CONSTRAINT "upward_user_contract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_contract" ADD CONSTRAINT "upward_user_contract_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_attendance" ADD CONSTRAINT "upward_attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "upward_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_attendance" ADD CONSTRAINT "upward_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_waitlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_email_log" ADD CONSTRAINT "upward_email_log_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "upward_session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_email_log" ADD CONSTRAINT "upward_email_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_waitlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_announcement_state" ADD CONSTRAINT "upward_user_announcement_state_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "upward_announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_announcement_state" ADD CONSTRAINT "upward_user_announcement_state_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_notification" ADD CONSTRAINT "upward_notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_webhook_log" ADD CONSTRAINT "upward_webhook_log_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "upward_platform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_credibility_request" ADD CONSTRAINT "upward_credibility_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_support_ticket" ADD CONSTRAINT "upward_support_ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_auth_session" ADD CONSTRAINT "upward_auth_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_device_token" ADD CONSTRAINT "upward_device_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_admin_log" ADD CONSTRAINT "upward_admin_log_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "upward_admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
