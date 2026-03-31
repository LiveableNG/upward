-- AlterTable
ALTER TABLE "upward_email_log" ADD COLUMN     "body" TEXT;

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

-- CreateIndex
CREATE UNIQUE INDEX "upward_system_email_slug_key" ON "upward_system_email"("slug");

-- CreateIndex
CREATE INDEX "upward_system_email_slug_idx" ON "upward_system_email"("slug");
