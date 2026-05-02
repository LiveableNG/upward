-- CreateTable
CREATE TABLE "upward_feedback" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER,
    "email" TEXT,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_feedback_uuid_key" ON "upward_feedback"("uuid");

-- CreateIndex
CREATE INDEX "upward_feedback_userId_idx" ON "upward_feedback"("userId");

-- CreateIndex
CREATE INDEX "upward_feedback_type_idx" ON "upward_feedback"("type");

-- CreateIndex
CREATE INDEX "upward_feedback_createdAt_idx" ON "upward_feedback"("createdAt");

-- AddForeignKey
ALTER TABLE "upward_feedback" ADD CONSTRAINT "upward_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
