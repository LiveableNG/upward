-- Fix foreign key constraint for upward_pm_property.splitProfileId
ALTER TABLE "upward_pm_property" DROP CONSTRAINT IF EXISTS "upward_pm_property_splitProfileId_fkey";
ALTER TABLE "upward_pm_property" ADD CONSTRAINT "upward_pm_property_splitProfileId_fkey" FOREIGN KEY ("splitProfileId") REFERENCES "upward_pm_split_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
