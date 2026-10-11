-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_admin_tenant_note" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "adminId" TEXT,
    "adminEmail" TEXT,
    "adminName" TEXT,
    "category" TEXT NOT NULL DEFAULT 'PAID_OUTSIDE',
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_admin_tenant_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_admin_tenant_note_uuid_key" ON "upward_admin_tenant_note"("uuid");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_admin_tenant_note_userId_idx" ON "upward_admin_tenant_note"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_admin_tenant_note_category_idx" ON "upward_admin_tenant_note"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "upward_admin_tenant_note_createdAt_idx" ON "upward_admin_tenant_note"("createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_admin_tenant_note_userId_fkey'
    ) THEN
        ALTER TABLE "upward_admin_tenant_note" ADD CONSTRAINT "upward_admin_tenant_note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'upward_admin_tenant_note_adminId_fkey'
    ) THEN
        ALTER TABLE "upward_admin_tenant_note" ADD CONSTRAINT "upward_admin_tenant_note_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "upward_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
