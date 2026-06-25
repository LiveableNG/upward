-- AlterTable
ALTER TABLE "upward_user" ADD COLUMN "authProvider" TEXT NOT NULL DEFAULT 'email';
ALTER TABLE "upward_user" ADD COLUMN "providerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_providerId_key" ON "upward_user"("providerId");
