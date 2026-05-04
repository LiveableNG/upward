-- AlterTable
ALTER TABLE "upward_announcement" ADD COLUMN     "url" TEXT;

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

-- CreateIndex
CREATE INDEX "upward_device_token_userId_idx" ON "upward_device_token"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_device_token_userId_token_key" ON "upward_device_token"("userId", "token");

-- CreateIndex
CREATE UNIQUE INDEX "upward_support_ticket_uuid_key" ON "upward_support_ticket"("uuid");

-- CreateIndex
CREATE INDEX "upward_support_ticket_userId_idx" ON "upward_support_ticket"("userId");

-- CreateIndex
CREATE INDEX "upward_support_ticket_status_idx" ON "upward_support_ticket"("status");

-- AddForeignKey
ALTER TABLE "upward_device_token" ADD CONSTRAINT "upward_device_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_support_ticket" ADD CONSTRAINT "upward_support_ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
