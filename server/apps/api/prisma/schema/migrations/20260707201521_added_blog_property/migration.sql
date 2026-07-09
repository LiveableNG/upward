-- CreateTable
CREATE TABLE "upward_payment_proof" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "transactionId" INTEGER,
    "paymentRequestId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "uploadedByUserId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_payment_proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_manual_account" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT,
    "userPropertyId" INTEGER,
    "pmPropertyId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_manual_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_blog_post" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "authorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_blog_post_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_payment_proof_uuid_key" ON "upward_payment_proof"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_payment_proof_transactionId_key" ON "upward_payment_proof"("transactionId");

-- CreateIndex
CREATE INDEX "upward_payment_proof_paymentRequestId_idx" ON "upward_payment_proof"("paymentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_manual_account_uuid_key" ON "upward_manual_account"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_manual_account_userPropertyId_key" ON "upward_manual_account"("userPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_manual_account_pmPropertyId_key" ON "upward_manual_account"("pmPropertyId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_blog_post_uuid_key" ON "upward_blog_post"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "upward_blog_post_slug_key" ON "upward_blog_post"("slug");

-- CreateIndex
CREATE INDEX "upward_blog_post_slug_idx" ON "upward_blog_post"("slug");

-- CreateIndex
CREATE INDEX "upward_blog_post_status_idx" ON "upward_blog_post"("status");

-- CreateIndex
CREATE INDEX "upward_blog_post_publishedAt_idx" ON "upward_blog_post"("publishedAt");

-- CreateIndex
CREATE INDEX "upward_blog_post_createdAt_idx" ON "upward_blog_post"("createdAt");

-- AddForeignKey
ALTER TABLE "upward_payment_proof" ADD CONSTRAINT "upward_payment_proof_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "upward_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_payment_proof" ADD CONSTRAINT "upward_payment_proof_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "upward_payment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_manual_account" ADD CONSTRAINT "upward_manual_account_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_manual_account" ADD CONSTRAINT "upward_manual_account_pmPropertyId_fkey" FOREIGN KEY ("pmPropertyId") REFERENCES "upward_pm_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
