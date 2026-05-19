-- CreateTable
CREATE TABLE "upward_dev_email_preview" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_dev_email_preview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_dev_email_preview_uuid_key" ON "upward_dev_email_preview"("uuid");

-- CreateIndex
CREATE INDEX "upward_dev_email_preview_to_idx" ON "upward_dev_email_preview"("to");

-- CreateIndex
CREATE INDEX "upward_dev_email_preview_createdAt_idx" ON "upward_dev_email_preview"("createdAt");
