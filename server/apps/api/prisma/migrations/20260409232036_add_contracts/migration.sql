-- CreateTable
CREATE TABLE "upward_user_contract" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "userPropertyId" INTEGER,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_user_contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_contract_uuid_key" ON "upward_user_contract"("uuid");

-- CreateIndex
CREATE INDEX "upward_user_contract_userId_idx" ON "upward_user_contract"("userId");

-- CreateIndex
CREATE INDEX "upward_user_contract_userPropertyId_idx" ON "upward_user_contract"("userPropertyId");

-- AddForeignKey
ALTER TABLE "upward_user_contract" ADD CONSTRAINT "upward_user_contract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_contract" ADD CONSTRAINT "upward_user_contract_userPropertyId_fkey" FOREIGN KEY ("userPropertyId") REFERENCES "upward_user_property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
