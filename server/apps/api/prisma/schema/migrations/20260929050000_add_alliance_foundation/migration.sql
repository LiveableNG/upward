-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_alliance_pm_profile" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "enabledAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "pmTitle" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_alliance_pm_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_alliance_qualification" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_alliance_qualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "upward_alliance_pm_qualification" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "qualificationId" INTEGER NOT NULL,
    "assignedByAdminId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_alliance_pm_qualification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_pm_profile_uuid_key" ON "upward_alliance_pm_profile"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_pm_profile_pmId_key" ON "upward_alliance_pm_profile"("pmId");
CREATE INDEX IF NOT EXISTS "upward_alliance_pm_profile_pmId_idx" ON "upward_alliance_pm_profile"("pmId");
CREATE INDEX IF NOT EXISTS "upward_alliance_pm_profile_isEnabled_idx" ON "upward_alliance_pm_profile"("isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_qualification_uuid_key" ON "upward_alliance_qualification"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_qualification_slug_key" ON "upward_alliance_qualification"("slug");
CREATE INDEX IF NOT EXISTS "upward_alliance_qualification_slug_idx" ON "upward_alliance_qualification"("slug");
CREATE INDEX IF NOT EXISTS "upward_alliance_qualification_isActive_idx" ON "upward_alliance_qualification"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_pm_qualification_uuid_key" ON "upward_alliance_pm_qualification"("uuid");
CREATE UNIQUE INDEX IF NOT EXISTS "upward_alliance_pm_qualification_pmId_qualificationId_key" ON "upward_alliance_pm_qualification"("pmId", "qualificationId");
CREATE INDEX IF NOT EXISTS "upward_alliance_pm_qualification_pmId_idx" ON "upward_alliance_pm_qualification"("pmId");
CREATE INDEX IF NOT EXISTS "upward_alliance_pm_qualification_qualificationId_idx" ON "upward_alliance_pm_qualification"("qualificationId");
CREATE INDEX IF NOT EXISTS "upward_alliance_pm_qualification_assignedByAdminId_idx" ON "upward_alliance_pm_qualification"("assignedByAdminId");

-- AddForeignKey
ALTER TABLE "upward_alliance_pm_profile" ADD CONSTRAINT "upward_alliance_pm_profile_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_pm_qualification" ADD CONSTRAINT "upward_alliance_pm_qualification_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_pm_qualification" ADD CONSTRAINT "upward_alliance_pm_qualification_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "upward_alliance_qualification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_alliance_pm_qualification" ADD CONSTRAINT "upward_alliance_pm_qualification_assignedByAdminId_fkey" FOREIGN KEY ("assignedByAdminId") REFERENCES "upward_admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
