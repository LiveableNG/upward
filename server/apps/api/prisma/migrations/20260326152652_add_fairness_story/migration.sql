-- CreateTable
CREATE TABLE "upward_fairness_story" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "categories" TEXT[],
    "story" TEXT NOT NULL,
    "audioUrl" TEXT,
    "fileUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_fairness_story_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upward_fairness_story_createdAt_idx" ON "upward_fairness_story"("createdAt");
