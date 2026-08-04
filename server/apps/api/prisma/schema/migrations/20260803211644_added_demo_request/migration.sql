-- CreateTable
CREATE TABLE "upward_demo_request" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tenants" TEXT NOT NULL,
    "demoDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_demo_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_demo_request_uuid_key" ON "upward_demo_request"("uuid");

-- CreateIndex
CREATE INDEX "upward_demo_request_email_idx" ON "upward_demo_request"("email");

-- CreateIndex
CREATE INDEX "upward_demo_request_status_idx" ON "upward_demo_request"("status");
