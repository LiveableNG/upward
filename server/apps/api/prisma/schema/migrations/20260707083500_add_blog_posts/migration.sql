-- Create blog post table for public content publishing.
CREATE TABLE "upward_blog_post" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "authorName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upward_blog_post_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "upward_blog_post_uuid_key" ON "upward_blog_post"("uuid");
CREATE UNIQUE INDEX "upward_blog_post_slug_key" ON "upward_blog_post"("slug");
CREATE INDEX "upward_blog_post_slug_idx" ON "upward_blog_post"("slug");
CREATE INDEX "upward_blog_post_status_idx" ON "upward_blog_post"("status");
CREATE INDEX "upward_blog_post_publishedAt_idx" ON "upward_blog_post"("publishedAt");
CREATE INDEX "upward_blog_post_createdAt_idx" ON "upward_blog_post"("createdAt");
