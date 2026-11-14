-- CreateEnum
CREATE TYPE "GoalTargetType" AS ENUM ('AMOUNT', 'DEADLINE', 'HYBRID', 'CHECKLIST_ACTIONS', 'RECURRING_HABIT', 'VERIFICATION');

-- AlterTable
ALTER TABLE "upward_goal" ADD COLUMN     "defaultDurationDays" INTEGER,
ADD COLUMN     "suggestedAmountKobo" BIGINT,
ADD COLUMN     "targetType" "GoalTargetType" NOT NULL DEFAULT 'CHECKLIST_ACTIONS';

-- AlterTable
ALTER TABLE "upward_user_goal" ALTER COLUMN "goalId" DROP NOT NULL,
ADD COLUMN     "actions" JSONB,
ADD COLUMN     "categorySlug" VARCHAR(50),
ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "icon" VARCHAR(50),
ADD COLUMN     "savedAmountKobo" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "targetAmountKobo" BIGINT,
ADD COLUMN     "targetType" "GoalTargetType" NOT NULL DEFAULT 'CHECKLIST_ACTIONS',
ADD COLUMN     "title" VARCHAR(150);

-- CreateTable
CREATE TABLE "upward_goal_action_template" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "goalId" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_goal_action_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_goal_action_template_uuid_key" ON "upward_goal_action_template"("uuid");

-- CreateIndex
CREATE INDEX "upward_goal_action_template_goalId_sortOrder_idx" ON "upward_goal_action_template"("goalId", "sortOrder");

-- CreateIndex
CREATE INDEX "upward_user_goal_userId_categorySlug_idx" ON "upward_user_goal"("userId", "categorySlug");

-- AddForeignKey
ALTER TABLE "upward_goal_action_template" ADD CONSTRAINT "upward_goal_action_template_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "upward_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
