-- CreateTable
CREATE TABLE "upward_email_link" (
    "id" TEXT NOT NULL,
    "communicationLogId" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "firstClickedAt" TIMESTAMP(3),
    "lastClickedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_email_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_email_link_click" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "upward_email_link_click_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_email_link_communicationLogId_idx" ON "upward_email_link"("communicationLogId");

-- CreateIndex
CREATE INDEX "upward_email_link_click_linkId_idx" ON "upward_email_link_click"("linkId");

-- AddForeignKey
ALTER TABLE "upward_email_link" ADD CONSTRAINT "upward_email_link_communicationLogId_fkey" FOREIGN KEY ("communicationLogId") REFERENCES "upward_communication_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_email_link_click" ADD CONSTRAINT "upward_email_link_click_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "upward_email_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;
