-- AlterTable
ALTER TABLE "upward_property_manager" ADD COLUMN "invitedByUserId" INTEGER;

-- CreateIndex
CREATE INDEX "upward_property_manager_invitedByUserId_idx" ON "upward_property_manager"("invitedByUserId");

-- AddForeignKey
ALTER TABLE "upward_property_manager" ADD CONSTRAINT "upward_property_manager_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "upward_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
