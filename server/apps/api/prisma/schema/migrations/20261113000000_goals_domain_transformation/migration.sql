-- Migration: 20261113000000_goals_domain_transformation
-- Target PostgreSQL Schema: public
-- Description: Clean Architecture and Domain Integrity Transformation for Goals

BEGIN;

-- ============================================================================
-- STEP 1: PREFLIGHT INTEGRITY ASSERTIONS & ABORT CONDITIONS
-- ============================================================================
DO $$
DECLARE
  v_dup_adoptions INTEGER;
  v_orphan_users INTEGER;
  v_orphan_goals INTEGER;
  v_missing_categories INTEGER;
  v_invalid_progress INTEGER;
  v_invalid_statuses INTEGER;
BEGIN
  -- 1. Check duplicate catalogue adoptions
  SELECT COUNT(*) INTO v_dup_adoptions
  FROM (
    SELECT "userId", "goalId"
    FROM "public"."upward_user_goal"
    WHERE "goalId" IS NOT NULL
    GROUP BY "userId", "goalId"
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_adoptions > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT BLOCKED: Found % duplicate (userId, goalId) tuples in upward_user_goal.', v_dup_adoptions;
  END IF;

  -- 2. Check for orphaned users
  SELECT COUNT(*) INTO v_orphan_users
  FROM "public"."upward_user_goal" ug
  LEFT JOIN "public"."upward_user" u ON ug."userId" = u."id"
  WHERE u."id" IS NULL;

  IF v_orphan_users > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT BLOCKED: Found % upward_user_goal records referencing non-existent upward_user IDs.', v_orphan_users;
  END IF;

  -- 3. Check for orphaned catalogue goals
  SELECT COUNT(*) INTO v_orphan_goals
  FROM "public"."upward_user_goal" ug
  LEFT JOIN "public"."upward_goal" g ON ug."goalId" = g."id"
  WHERE ug."goalId" IS NOT NULL AND g."id" IS NULL;

  IF v_orphan_goals > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT BLOCKED: Found % upward_user_goal records referencing invalid upward_goal IDs.', v_orphan_goals;
  END IF;

  -- 4. Check for catalogue goals missing categories
  SELECT COUNT(*) INTO v_missing_categories
  FROM "public"."upward_user_goal" ug
  JOIN "public"."upward_goal" g ON ug."goalId" = g."id"
  LEFT JOIN "public"."upward_goal_category" c ON g."categoryId" = c."id"
  WHERE c."id" IS NULL;

  IF v_missing_categories > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT BLOCKED: Found % upward_user_goal records whose catalogue goals point to missing categories.', v_missing_categories;
  END IF;

  -- 5. Check for invalid progressPct values
  SELECT COUNT(*) INTO v_invalid_progress
  FROM "public"."upward_user_goal"
  WHERE "progressPct" < 0 OR "progressPct" > 100;

  IF v_invalid_progress > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT BLOCKED: Found % upward_user_goal records with progressPct outside 0..100 range.', v_invalid_progress;
  END IF;

  -- 6. Check for invalid UserGoalStatus values
  SELECT COUNT(*) INTO v_invalid_statuses
  FROM "public"."upward_user_goal"
  WHERE "status"::text NOT IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

  IF v_invalid_statuses > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT BLOCKED: Found % upward_user_goal records with unrecognized status enum values.', v_invalid_statuses;
  END IF;

  RAISE NOTICE 'PREFLIGHT PASSED: All preflight data integrity assertions succeeded.';
END $$;

-- ============================================================================
-- STEP 2: CREATE NEW ENUM TYPES IN PUBLIC SCHEMA
-- ============================================================================
CREATE TYPE "public"."GoalProgressSource" AS ENUM ('MILESTONES', 'MANUAL_PERCENT', 'TARGET_AMOUNT', 'RENT_VAULT', 'STATUS_ONLY');
CREATE TYPE "public"."GoalMilestoneStatus" AS ENUM ('PENDING', 'COMPLETED');
CREATE TYPE "public"."GoalInterestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'CONTACTED', 'FULFILLED', 'CLOSED');
CREATE TYPE "public"."HousingAdoptionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED', 'RELEASED');

-- ============================================================================
-- STEP 3: ADD NEW COLUMNS TO upward_user_goal
-- Note: completedAt already exists in public.upward_user_goal and is NOT added here.
-- ============================================================================
ALTER TABLE "public"."upward_user_goal"
  ADD COLUMN "categoryId" INTEGER,
  ADD COLUMN "historicalTitle" VARCHAR(255),
  ADD COLUMN "customTitle" VARCHAR(255),
  ADD COLUMN "customDescription" TEXT,
  ADD COLUMN "progressSource" "public"."GoalProgressSource" DEFAULT 'MANUAL_PERCENT',
  ADD COLUMN "currentAmountMinor" BIGINT,
  ADD COLUMN "targetAmountMinor" BIGINT,
  ADD COLUMN "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "pausedAt" TIMESTAMP(3),
  ADD COLUMN "lastVerifiedBalanceMinor" BIGINT,
  ADD COLUMN "verifiedSourceUuid" VARCHAR(36),
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "userPropertyId" INTEGER,
  ADD COLUMN "rentVaultId" INTEGER;

-- ============================================================================
-- STEP 4: BACKFILL HISTORICAL TITLE & CATEGORY SNAPSHOTS
-- Populated exclusively from verified parent upward_goal relation.
-- ============================================================================
UPDATE "public"."upward_user_goal" ug
SET 
  "categoryId" = g."categoryId",
  "historicalTitle" = g."title"
FROM "public"."upward_goal" g
WHERE ug."goalId" = g."id";

-- ============================================================================
-- STEP 5: VERIFY BACKFILL & ENFORCE NOT NULL CONSTRAINTS
-- ============================================================================
DO $$
DECLARE
  v_unresolved INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_unresolved
  FROM "public"."upward_user_goal"
  WHERE "categoryId" IS NULL OR "historicalTitle" IS NULL;

  IF v_unresolved > 0 THEN
    RAISE EXCEPTION 'MIGRATION HALTED: % legacy user goals could not have categoryId or historicalTitle resolved from catalogue goals.', v_unresolved;
  END IF;
END $$;

ALTER TABLE "public"."upward_user_goal" 
  ALTER COLUMN "categoryId" SET NOT NULL,
  ALTER COLUMN "historicalTitle" SET NOT NULL,
  ALTER COLUMN "progressSource" SET NOT NULL;

-- ============================================================================
-- STEP 6: ALTER goalId TO DROP NOT NULL (SUPPORTS CUSTOM GOALS)
-- ============================================================================
ALTER TABLE "public"."upward_user_goal" ALTER COLUMN "goalId" DROP NOT NULL;

-- ============================================================================
-- STEP 7: BACKFILL PROGRESS SOURCE (PRESERVING EXACT HISTORY)
-- All legacy records receive MANUAL_PERCENT. No timestamps or values inferred.
-- ============================================================================
UPDATE "public"."upward_user_goal"
SET "progressSource" = 'MANUAL_PERCENT'::"public"."GoalProgressSource"
WHERE "progressSource" IS NULL;

-- ============================================================================
-- STEP 8: UPDATE FOREIGN KEYS & REFERENTIAL ACTIONS TO RESTRICT
-- ============================================================================
-- 1. Replace upward_goal -> upward_goal_category FK
ALTER TABLE "public"."upward_goal"
  DROP CONSTRAINT "upward_goal_categoryId_fkey",
  ADD CONSTRAINT "upward_goal_categoryId_fkey" 
    FOREIGN KEY ("categoryId") REFERENCES "public"."upward_goal_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2. Replace upward_user_goal -> upward_goal FK
ALTER TABLE "public"."upward_user_goal"
  DROP CONSTRAINT "upward_user_goal_goalId_fkey",
  ADD CONSTRAINT "upward_user_goal_goalId_fkey" 
    FOREIGN KEY ("goalId") REFERENCES "public"."upward_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. Add upward_user_goal -> upward_goal_category FK
ALTER TABLE "public"."upward_user_goal"
  ADD CONSTRAINT "upward_user_goal_categoryId_fkey" 
    FOREIGN KEY ("categoryId") REFERENCES "public"."upward_goal_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Add upward_user_goal -> upward_user_property FK
ALTER TABLE "public"."upward_user_goal"
  ADD CONSTRAINT "upward_user_goal_userPropertyId_fkey" 
    FOREIGN KEY ("userPropertyId") REFERENCES "public"."upward_user_property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. Add upward_user_goal -> upward_rent_vault FK
ALTER TABLE "public"."upward_user_goal"
  ADD CONSTRAINT "upward_user_goal_rentVaultId_fkey" 
    FOREIGN KEY ("rentVaultId") REFERENCES "public"."upward_rent_vault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- STEP 9: DOMAIN CHECK CONSTRAINTS & IMMUTABILITY TRIGGER ON upward_user_goal
-- ============================================================================
-- Mutual exclusivity: Catalogue goal vs Custom goal
ALTER TABLE "public"."upward_user_goal"
  ADD CONSTRAINT "chk_user_goal_type_exclusivity"
  CHECK (
    ("goalId" IS NOT NULL AND "customTitle" IS NULL) OR
    ("goalId" IS NULL AND "customTitle" IS NOT NULL)
  );

-- Custom title non-empty after trimming
ALTER TABLE "public"."upward_user_goal"
  ADD CONSTRAINT "chk_user_goal_custom_title_nonempty"
  CHECK ("customTitle" IS NULL OR LENGTH(TRIM("customTitle")) > 0);

-- Historical title non-empty
ALTER TABLE "public"."upward_user_goal"
  ADD CONSTRAINT "chk_user_goal_historical_title_nonempty"
  CHECK (LENGTH(TRIM("historicalTitle")) > 0);

-- Housing resource mutual exclusivity on user goal
ALTER TABLE "public"."upward_user_goal"
  ADD CONSTRAINT "chk_user_goal_housing_resource_exclusive"
  CHECK (NOT ("userPropertyId" IS NOT NULL AND "rentVaultId" IS NOT NULL));

-- Rent vault progress requires target amount
ALTER TABLE "public"."upward_user_goal"
  ADD CONSTRAINT "chk_user_goal_rent_vault_target"
  CHECK ("progressSource" != 'RENT_VAULT' OR "targetAmountMinor" IS NOT NULL);

-- Indexes on upward_user_goal
CREATE INDEX "upward_user_goal_categoryId_idx" ON "public"."upward_user_goal"("categoryId");
CREATE INDEX "upward_user_goal_userPropertyId_idx" ON "public"."upward_user_goal"("userPropertyId");
CREATE INDEX "upward_user_goal_rentVaultId_idx" ON "public"."upward_user_goal"("rentVaultId");

-- Partial unique indexes preventing multiple active goals for same housing resource
CREATE UNIQUE INDEX "uq_user_goal_active_property" 
  ON "public"."upward_user_goal"("userPropertyId") 
  WHERE "userPropertyId" IS NOT NULL AND "status" != 'ARCHIVED';

CREATE UNIQUE INDEX "uq_user_goal_active_vault" 
  ON "public"."upward_user_goal"("rentVaultId") 
  WHERE "rentVaultId" IS NOT NULL AND "status" != 'ARCHIVED';

-- Database trigger enforcing snapshot immutability
CREATE OR REPLACE FUNCTION "public"."trg_upward_user_goal_immutability"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."historicalTitle" IS DISTINCT FROM OLD."historicalTitle" THEN
    RAISE EXCEPTION 'DOM_ERR: historicalTitle is immutable once set.';
  END IF;
  IF NEW."categoryId" IS DISTINCT FROM OLD."categoryId" THEN
    RAISE EXCEPTION 'DOM_ERR: categoryId is immutable once set.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_upward_user_goal_immutability" ON "public"."upward_user_goal";
CREATE TRIGGER "trg_upward_user_goal_immutability"
  BEFORE UPDATE ON "public"."upward_user_goal"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."trg_upward_user_goal_immutability"();

-- ============================================================================
-- STEP 10: CREATE NEW DOMAIN TABLES IN PUBLIC SCHEMA
-- ============================================================================
-- 1. upward_goal_milestone
CREATE TABLE "public"."upward_goal_milestone" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "userGoalId" INTEGER NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "status" "public"."GoalMilestoneStatus" NOT NULL DEFAULT 'PENDING',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "targetDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "upward_goal_milestone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "upward_goal_milestone_uuid_key" ON "public"."upward_goal_milestone"("uuid");
CREATE INDEX "upward_goal_milestone_userGoalId_sortOrder_idx" ON "public"."upward_goal_milestone"("userGoalId", "sortOrder");
CREATE INDEX "upward_goal_milestone_userGoalId_status_idx" ON "public"."upward_goal_milestone"("userGoalId", "status");

ALTER TABLE "public"."upward_goal_milestone"
  ADD CONSTRAINT "upward_goal_milestone_userGoalId_fkey" 
    FOREIGN KEY ("userGoalId") REFERENCES "public"."upward_user_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. upward_goal_interest
CREATE TABLE "public"."upward_goal_interest" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "userGoalId" INTEGER NOT NULL,
  "serviceType" VARCHAR(100) NOT NULL,
  "status" "public"."GoalInterestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "notes" TEXT,
  "adminNotes" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "upward_goal_interest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "upward_goal_interest_uuid_key" ON "public"."upward_goal_interest"("uuid");
CREATE UNIQUE INDEX "upward_goal_interest_userGoalId_key" ON "public"."upward_goal_interest"("userGoalId");
CREATE INDEX "upward_goal_interest_status_idx" ON "public"."upward_goal_interest"("status");
CREATE INDEX "upward_goal_interest_serviceType_idx" ON "public"."upward_goal_interest"("serviceType");

ALTER TABLE "public"."upward_goal_interest"
  ADD CONSTRAINT "upward_goal_interest_userGoalId_fkey" 
    FOREIGN KEY ("userGoalId") REFERENCES "public"."upward_user_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. upward_goal_interest_history
CREATE TABLE "public"."upward_goal_interest_history" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "interestId" INTEGER NOT NULL,
  "version" INTEGER NOT NULL,
  "serviceType" VARCHAR(100) NOT NULL,
  "status" "public"."GoalInterestStatus" NOT NULL,
  "notes" TEXT,
  "adminNotes" TEXT,
  "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "upward_goal_interest_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "upward_goal_interest_history_uuid_key" ON "public"."upward_goal_interest_history"("uuid");
CREATE UNIQUE INDEX "upward_goal_interest_history_interestId_version_key" ON "public"."upward_goal_interest_history"("interestId", "version");
CREATE INDEX "upward_goal_interest_history_interestId_snapshotAt_idx" ON "public"."upward_goal_interest_history"("interestId", "snapshotAt");

ALTER TABLE "public"."upward_goal_interest_history"
  ADD CONSTRAINT "upward_goal_interest_history_interestId_fkey" 
    FOREIGN KEY ("interestId") REFERENCES "public"."upward_goal_interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. upward_housing_adoption_decision
CREATE TABLE "public"."upward_housing_adoption_decision" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "userPropertyId" INTEGER,
  "rentVaultId" INTEGER,
  "userGoalId" INTEGER,
  "status" "public"."HousingAdoptionStatus" NOT NULL DEFAULT 'PENDING',
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "upward_housing_adoption_decision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "upward_housing_adoption_decision_uuid_key" ON "public"."upward_housing_adoption_decision"("uuid");
CREATE UNIQUE INDEX "upward_housing_adoption_decision_userGoalId_key" ON "public"."upward_housing_adoption_decision"("userGoalId");
CREATE INDEX "upward_housing_adoption_decision_userId_status_idx" ON "public"."upward_housing_adoption_decision"("userId", "status");
CREATE INDEX "upward_housing_adoption_decision_userPropertyId_idx" ON "public"."upward_housing_adoption_decision"("userPropertyId");
CREATE INDEX "upward_housing_adoption_decision_rentVaultId_idx" ON "public"."upward_housing_adoption_decision"("rentVaultId");

ALTER TABLE "public"."upward_housing_adoption_decision"
  ADD CONSTRAINT "upward_housing_adoption_decision_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "public"."upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."upward_housing_adoption_decision"
  ADD CONSTRAINT "upward_housing_adoption_decision_userPropertyId_fkey" 
    FOREIGN KEY ("userPropertyId") REFERENCES "public"."upward_user_property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."upward_housing_adoption_decision"
  ADD CONSTRAINT "upward_housing_adoption_decision_rentVaultId_fkey" 
    FOREIGN KEY ("rentVaultId") REFERENCES "public"."upward_rent_vault"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "public"."upward_housing_adoption_decision"
  ADD CONSTRAINT "upward_housing_adoption_decision_userGoalId_fkey" 
    FOREIGN KEY ("userGoalId") REFERENCES "public"."upward_user_goal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- STEP 11: CONSTRAINTS ON upward_housing_adoption_decision
-- ============================================================================
ALTER TABLE "public"."upward_housing_adoption_decision"
  ADD CONSTRAINT "chk_housing_adoption_resource_exclusive"
  CHECK (
    ("userPropertyId" IS NOT NULL AND "rentVaultId" IS NULL) OR
    ("userPropertyId" IS NULL AND "rentVaultId" IS NOT NULL)
  );

ALTER TABLE "public"."upward_housing_adoption_decision"
  ADD CONSTRAINT "chk_housing_adoption_status_link"
  CHECK (
    ("status" IN ('ACCEPTED', 'RELEASED') AND "userGoalId" IS NOT NULL) OR
    ("status" IN ('PENDING', 'DISMISSED') AND "userGoalId" IS NULL)
  );

-- Partial unique indexes preventing multiple active ACCEPTED decisions for same resource
CREATE UNIQUE INDEX "uq_housing_adoption_property_accepted" 
  ON "public"."upward_housing_adoption_decision"("userPropertyId") 
  WHERE "status" = 'ACCEPTED';

CREATE UNIQUE INDEX "uq_housing_adoption_vault_accepted" 
  ON "public"."upward_housing_adoption_decision"("rentVaultId") 
  WHERE "status" = 'ACCEPTED';
    
COMMIT;
