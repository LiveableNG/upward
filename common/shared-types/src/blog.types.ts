export type BlogPostStatus = 'DRAFT' | 'PUBLISHED'

export interface BlogPost {
  id: string
  uuid: string
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  coverImageUrl?: string | null
  authorName: string
  status: BlogPostStatus
  publishedAt?: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CreateBlogPostDto {
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  coverImageUrl?: string
  authorName: string
}

export interface UpdateBlogPostDto {
  title?: string
  slug?: string
  excerpt?: string
  contentHtml?: string
  coverImageUrl?: string
  authorName?: string
}
