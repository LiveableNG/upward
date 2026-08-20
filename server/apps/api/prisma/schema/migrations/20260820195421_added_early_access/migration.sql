-- CreateTable
CREATE TABLE "upward_early_access" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "ageBracket" TEXT,
    "experienceLevel" TEXT,
    "interest" TEXT,
    "propertyCount" TEXT,
    "landlordStatus" TEXT,
    "managementStyle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_early_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_early_access_type_idx" ON "upward_early_access"("type");

-- CreateIndex
CREATE INDEX "upward_early_access_email_idx" ON "upward_early_access"("email");

-- CreateIndex
CREATE INDEX "upward_early_access_whatsapp_idx" ON "upward_early_access"("whatsapp");

-- CreateIndex
CREATE INDEX "upward_early_access_createdAt_idx" ON "upward_early_access"("createdAt");
