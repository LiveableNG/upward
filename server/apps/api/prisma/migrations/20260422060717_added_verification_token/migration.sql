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

-- CreateIndex
CREATE UNIQUE INDEX "upward_verification_token_uuid_key" ON "upward_verification_token"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_verification_token_token_key" ON "upward_verification_token"("token");

-- CreateIndex
CREATE INDEX "upward_verification_token_token_idx" ON "upward_verification_token"("token");

-- CreateIndex
CREATE INDEX "upward_verification_token_identifier_context_idx" ON "upward_verification_token"("identifier", "context");
