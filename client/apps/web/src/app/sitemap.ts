import { type MetadataRoute } from 'next'

interface BlogPostSitemapItem {
  slug: string
  updatedAt: string
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

  let blogEntries: MetadataRoute.Sitemap = []
  try {
    const response = await fetch(`${apiUrl}/public/blog/posts`, { next: { revalidate: 300 } })
    if (response.ok) {
      const payload = await response.json()
      const posts: BlogPostSitemapItem[] = payload.data || []
      blogEntries = posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.7,
      }))
    }
  } catch {
    blogEntries = []
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...blogEntries,
  ]
}
