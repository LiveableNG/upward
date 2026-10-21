-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_kyc_verification" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "idType" TEXT NOT NULL,
    "idNumberHash" TEXT NOT NULL,
    "idNumberMasked" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION,
    "failureReason" TEXT,
    "metadata" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_kyc_verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_kyc_verification_uuid_key" ON "upward_kyc_verification"("uuid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_kyc_verification_userId_idx" ON "upward_kyc_verification"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_kyc_verification_idNumberHash_idx" ON "upward_kyc_verification"("idNumberHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_kyc_verification_status_idx" ON "upward_kyc_verification"("status");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_kyc_verification_userId_fkey'
    ) THEN
        ALTER TABLE "upward_kyc_verification" ADD CONSTRAINT "upward_kyc_verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
