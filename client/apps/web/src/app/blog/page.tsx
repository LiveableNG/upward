import Link from 'next/link'
import type { BlogPost } from '@upward/shared-types'
import { LegalPageIntro } from '@/components/layout/legal-page-intro'
import { BlogUtmCapture } from '@/components/blog/BlogUtmCapture'
import { TrackedCtaLink } from '@/components/blog/TrackedCtaLink'

async function getPosts(): Promise<BlogPost[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
  const response = await fetch(`${apiUrl}/public/blog/posts`, {
    cache: 'no-store',
  })

  if (!response.ok) return []
  const payload = await response.json()
  return payload.data || []
}

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <>
      <BlogUtmCapture />
      <LegalPageIntro
        title="Upward Blog"
        kicker="Insights"
        subtitle="Housing, renting, credibility, and stories that help renters and partners build wealth."
      />

      <section className="legal-card-grid">
        {posts.length === 0 ? (
          <div className="legal-callout">No published posts yet.</div>
        ) : (
          posts.map((post) => (
            <article key={post.uuid} className="legal-card">
              {post.coverImageUrl && (
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 14 }}
                />
              )}
              <p className="legal-card__desc">
                {post.authorName} ·{' '}
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              <h2 className="legal-card__title" style={{ marginTop: 10 }}>
                <Link href={`/blog/${post.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {post.title}
                </Link>
              </h2>
              <p className="legal-card__desc">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="legal-card__link">
                Read article →
              </Link>
            </article>
          ))
        )}
      </section>

      <section className="legal-callout" style={{ marginTop: 20, textAlign: 'center' }}>
        <h3 className="legal-h2" style={{ marginTop: 0 }}>Ready to build with your rent?</h3>
        <p style={{ marginBottom: 12 }}>
          Open your Upward account and start building your housing credibility.
        </p>
        <TrackedCtaLink href="/signup" className="legal-card__link">
          Get started →
        </TrackedCtaLink>
      </section>
    </>
  )
}
