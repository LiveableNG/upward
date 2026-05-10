
-- CreateTable
CREATE TABLE "upward_pm_team_collaboration" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "ownerPmId" INTEGER NOT NULL,
    "collaboratorPmId" INTEGER NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'CUSTOM',
    "status" TEXT NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_pm_team_collaboration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_property_collaboration" (
    "id" SERIAL NOT NULL,
    "propertyId" INTEGER NOT NULL,
    "collaboratorPmId" INTEGER NOT NULL,
    "ownerPmId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_pm_property_collaboration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_pm_activity_log" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "pmId" INTEGER NOT NULL,
    "ownerPmId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_pm_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_team_collaboration_uuid_key" ON "upward_pm_team_collaboration"("uuid");
CREATE INDEX "upward_pm_team_collaboration_ownerPmId_idx" ON "upward_pm_team_collaboration"("ownerPmId");
CREATE INDEX "upward_pm_team_collaboration_collaboratorPmId_idx" ON "upward_pm_team_collaboration"("collaboratorPmId");
CREATE UNIQUE INDEX "upward_pm_team_collaboration_ownerPmId_collaboratorPmId_key" ON "upward_pm_team_collaboration"("ownerPmId", "collaboratorPmId");

-- CreateIndex
CREATE INDEX "upward_pm_property_collaboration_propertyId_idx" ON "upward_pm_property_collaboration"("propertyId");
CREATE INDEX "upward_pm_property_collaboration_collaboratorPmId_idx" ON "upward_pm_property_collaboration"("collaboratorPmId");
CREATE INDEX "upward_pm_property_collaboration_ownerPmId_idx" ON "upward_pm_property_collaboration"("ownerPmId");
CREATE UNIQUE INDEX "upward_pm_property_collaboration_propertyId_collaboratorPm_key" ON "upward_pm_property_collaboration"("propertyId", "collaboratorPmId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_pm_activity_log_uuid_key" ON "upward_pm_activity_log"("uuid");
CREATE INDEX "upward_pm_activity_log_pmId_idx" ON "upward_pm_activity_log"("pmId");
CREATE INDEX "upward_pm_activity_log_ownerPmId_idx" ON "upward_pm_activity_log"("ownerPmId");
CREATE INDEX "upward_pm_activity_log_createdAt_idx" ON "upward_pm_activity_log"("createdAt");

-- AddForeignKey
ALTER TABLE "upward_pm_team_collaboration" ADD CONSTRAINT "upward_pm_team_collaboration_ownerPmId_fkey" FOREIGN KEY ("ownerPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "upward_pm_team_collaboration" ADD CONSTRAINT "upward_pm_team_collaboration_collaboratorPmId_fkey" FOREIGN KEY ("collaboratorPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_property_collaboration" ADD CONSTRAINT "upward_pm_property_collaboration_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "upward_pm_property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "upward_pm_property_collaboration" ADD CONSTRAINT "upward_pm_property_collaboration_collaboratorPmId_fkey" FOREIGN KEY ("collaboratorPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_pm_activity_log" ADD CONSTRAINT "upward_pm_activity_log_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "upward_pm_activity_log" ADD CONSTRAINT "upward_pm_activity_log_ownerPmId_fkey" FOREIGN KEY ("ownerPmId") REFERENCES "upward_property_manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
