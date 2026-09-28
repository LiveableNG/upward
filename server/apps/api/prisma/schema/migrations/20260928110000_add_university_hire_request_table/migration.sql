-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_university_hire_request" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactRole" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "placementType" TEXT NOT NULL,
    "rolesNeeded" JSONB NOT NULL DEFAULT '[]',
    "openingsCount" TEXT NOT NULL DEFAULT '1',
    "compensationType" TEXT,
    "startDate" TEXT,
    "jobDescription" TEXT,
    "sourceIdentifier" TEXT,
    "abVariant" TEXT DEFAULT 'A',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_university_hire_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_university_hire_request_companyName_idx" ON "upward_university_hire_request"("companyName");
CREATE INDEX IF NOT EXISTS "upward_university_hire_request_email_idx" ON "upward_university_hire_request"("email");
CREATE INDEX IF NOT EXISTS "upward_university_hire_request_phone_idx" ON "upward_university_hire_request"("phone");
CREATE INDEX IF NOT EXISTS "upward_university_hire_request_industry_idx" ON "upward_university_hire_request"("industry");
CREATE INDEX IF NOT EXISTS "upward_university_hire_request_placementType_idx" ON "upward_university_hire_request"("placementType");
CREATE INDEX IF NOT EXISTS "upward_university_hire_request_status_idx" ON "upward_university_hire_request"("status");
CREATE INDEX IF NOT EXISTS "upward_university_hire_request_createdAt_idx" ON "upward_university_hire_request"("createdAt");
