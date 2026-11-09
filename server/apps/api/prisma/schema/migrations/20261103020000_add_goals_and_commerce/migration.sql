-- CreateEnum
CREATE TYPE "GoalPublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OfferingType" AS ENUM ('PRODUCT', 'SERVICE', 'PACKAGE', 'BUNDLE');

-- CreateEnum
CREATE TYPE "OfferingPricingModel" AS ENUM ('FIXED', 'RANGE', 'STARTING_AT', 'QUOTE_REQUIRED');

-- CreateEnum
CREATE TYPE "UserGoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "upward_goal_category" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "iconName" VARCHAR(50) NOT NULL DEFAULT 'Target',
    "coverImage" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalPublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_goal_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_goal" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "tagline" VARCHAR(255),
    "description" TEXT,
    "iconName" VARCHAR(50),
    "heroImage" VARCHAR(500),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalPublishStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_user_goal" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" INTEGER NOT NULL,
    "status" "UserGoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetDate" TIMESTAMP(3),
    "notes" TEXT,
    "progressPct" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_user_goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_goal_collection" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "goalId" INTEGER NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "subtitle" VARCHAR(255),
    "description" TEXT,
    "badge" VARCHAR(50),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "GoalPublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_goal_collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_commerce_vendor" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logoUrl" VARCHAR(500),
    "email" VARCHAR(150),
    "phone" VARCHAR(50),
    "website" VARCHAR(255),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_commerce_vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_offering" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "vendorId" INTEGER,
    "type" "OfferingType" NOT NULL,
    "pricingModel" "OfferingPricingModel" NOT NULL DEFAULT 'FIXED',
    "title" VARCHAR(200) NOT NULL,
    "subtitle" VARCHAR(255),
    "description" TEXT,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'NGN',
    "price" DOUBLE PRECISION,
    "minPrice" DOUBLE PRECISION,
    "maxPrice" DOUBLE PRECISION,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "stockCount" INTEGER,
    "deliveryAvailable" BOOLEAN NOT NULL DEFAULT true,
    "leadTimeDays" INTEGER,
    "status" "GoalPublishStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_offering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_offering_media" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "offeringId" INTEGER NOT NULL,
    "mediaUrl" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(50) NOT NULL DEFAULT 'image/jpeg',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_offering_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_package_item" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "packageId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "overridePrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_package_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upward_goal_offering" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "goalId" INTEGER NOT NULL,
    "offeringId" INTEGER NOT NULL,
    "collectionId" INTEGER,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "relevanceScore" INTEGER NOT NULL DEFAULT 100,
    "curatorNote" VARCHAR(255),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upward_goal_offering_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "upward_goal_category_uuid_key" ON "upward_goal_category"("uuid");
CREATE UNIQUE INDEX "upward_goal_category_slug_key" ON "upward_goal_category"("slug");
CREATE INDEX "upward_goal_category_slug_idx" ON "upward_goal_category"("slug");
CREATE INDEX "upward_goal_category_status_sortOrder_idx" ON "upward_goal_category"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "upward_goal_uuid_key" ON "upward_goal"("uuid");
CREATE UNIQUE INDEX "upward_goal_slug_key" ON "upward_goal"("slug");
CREATE INDEX "upward_goal_categoryId_idx" ON "upward_goal"("categoryId");
CREATE INDEX "upward_goal_slug_idx" ON "upward_goal"("slug");
CREATE INDEX "upward_goal_status_sortOrder_idx" ON "upward_goal"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "upward_user_goal_uuid_key" ON "upward_user_goal"("uuid");
CREATE INDEX "upward_user_goal_userId_status_idx" ON "upward_user_goal"("userId", "status");
CREATE INDEX "upward_user_goal_goalId_idx" ON "upward_user_goal"("goalId");
CREATE UNIQUE INDEX "upward_user_goal_userId_goalId_key" ON "upward_user_goal"("userId", "goalId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_goal_collection_uuid_key" ON "upward_goal_collection"("uuid");
CREATE INDEX "upward_goal_collection_goalId_status_sortOrder_idx" ON "upward_goal_collection"("goalId", "status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "upward_commerce_vendor_uuid_key" ON "upward_commerce_vendor"("uuid");
CREATE UNIQUE INDEX "upward_commerce_vendor_slug_key" ON "upward_commerce_vendor"("slug");
CREATE INDEX "upward_commerce_vendor_slug_idx" ON "upward_commerce_vendor"("slug");
CREATE INDEX "upward_commerce_vendor_isActive_idx" ON "upward_commerce_vendor"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "upward_offering_uuid_key" ON "upward_offering"("uuid");
CREATE INDEX "upward_offering_type_status_idx" ON "upward_offering"("type", "status");
CREATE INDEX "upward_offering_vendorId_idx" ON "upward_offering"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_offering_media_uuid_key" ON "upward_offering_media"("uuid");
CREATE INDEX "upward_offering_media_offeringId_sortOrder_idx" ON "upward_offering_media"("offeringId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "upward_package_item_uuid_key" ON "upward_package_item"("uuid");
CREATE INDEX "upward_package_item_packageId_idx" ON "upward_package_item"("packageId");
CREATE INDEX "upward_package_item_componentId_idx" ON "upward_package_item"("componentId");
CREATE UNIQUE INDEX "upward_package_item_packageId_componentId_key" ON "upward_package_item"("packageId", "componentId");

-- CreateIndex
CREATE UNIQUE INDEX "upward_goal_offering_uuid_key" ON "upward_goal_offering"("uuid");
CREATE INDEX "upward_goal_offering_goalId_isRecommended_idx" ON "upward_goal_offering"("goalId", "isRecommended");
CREATE INDEX "upward_goal_offering_offeringId_idx" ON "upward_goal_offering"("offeringId");
CREATE INDEX "upward_goal_offering_collectionId_idx" ON "upward_goal_offering"("collectionId");
CREATE UNIQUE INDEX "upward_goal_offering_goalId_offeringId_collectionId_key" ON "upward_goal_offering"("goalId", "offeringId", "collectionId");

-- AddForeignKey
ALTER TABLE "upward_goal" ADD CONSTRAINT "upward_goal_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "upward_goal_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_goal" ADD CONSTRAINT "upward_user_goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "upward_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_user_goal" ADD CONSTRAINT "upward_user_goal_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "upward_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_goal_collection" ADD CONSTRAINT "upward_goal_collection_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "upward_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_offering" ADD CONSTRAINT "upward_offering_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "upward_commerce_vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_offering_media" ADD CONSTRAINT "upward_offering_media_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "upward_offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_package_item" ADD CONSTRAINT "upward_package_item_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "upward_offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_package_item" ADD CONSTRAINT "upward_package_item_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "upward_offering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_goal_offering" ADD CONSTRAINT "upward_goal_offering_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "upward_goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_goal_offering" ADD CONSTRAINT "upward_goal_offering_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "upward_offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upward_goal_offering" ADD CONSTRAINT "upward_goal_offering_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "upward_goal_collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

