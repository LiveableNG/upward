-- AlterTable
ALTER TABLE "upward_offering" ADD COLUMN     "isPromoted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "promoBadge" VARCHAR(50),
ADD COLUMN     "promoCoverImage" VARCHAR(500),
ADD COLUMN     "promoPriority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promoSubtitle" VARCHAR(255),
ADD COLUMN     "promoTitle" VARCHAR(150);

-- CreateIndex
CREATE INDEX "upward_offering_isPromoted_status_idx" ON "upward_offering"("isPromoted", "status");
