-- CreateTable
CREATE TABLE "upward_university_application" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "ageBracket" TEXT NOT NULL,
    "occupation" TEXT,
    "experienceLevel" TEXT,
    "goals" TEXT,
    "commitment" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "timing" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "applicationFee" DOUBLE PRECISION NOT NULL DEFAULT 5000.0,
    "feeStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_university_application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_university_application_email_idx" ON "upward_university_application"("email");

-- CreateIndex
CREATE INDEX "upward_university_application_whatsapp_idx" ON "upward_university_application"("whatsapp");

-- CreateIndex
CREATE INDEX "upward_university_application_status_idx" ON "upward_university_application"("status");

-- CreateIndex
CREATE INDEX "upward_university_application_feeStatus_idx" ON "upward_university_application"("feeStatus");

-- CreateIndex
CREATE INDEX "upward_university_application_createdAt_idx" ON "upward_university_application"("createdAt");
