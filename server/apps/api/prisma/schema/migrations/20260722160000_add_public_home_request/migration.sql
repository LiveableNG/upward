-- CreateTable
CREATE TABLE "upward_home_request" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "fullName" TEXT,
    "locations" JSONB NOT NULL,
    "budgetMin" DOUBLE PRECISION NOT NULL,
    "budgetMax" DOUBLE PRECISION NOT NULL,
    "propertyType" TEXT NOT NULL,
    "beds" INTEGER NOT NULL,
    "moveInDate" TIMESTAMP(3),
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_home_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_home_request_uuid_key" ON "upward_home_request"("uuid");

-- CreateIndex
CREATE INDEX "upward_home_request_email_idx" ON "upward_home_request"("email");

-- CreateIndex
CREATE INDEX "upward_home_request_phone_idx" ON "upward_home_request"("phone");

-- CreateIndex
CREATE INDEX "upward_home_request_status_idx" ON "upward_home_request"("status");

-- CreateIndex
CREATE INDEX "upward_home_request_createdAt_idx" ON "upward_home_request"("createdAt");
