import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { BlogPost } from '@upward/shared-types'
import { LegalPageIntro } from '@/components/layout/legal-page-intro'
import { BlogUtmCapture } from '@/components/blog/BlogUtmCapture'
import { TrackedCtaLink } from '@/components/blog/TrackedCtaLink'

async function getPost(slug: string): Promise<BlogPost | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
  const response = await fetch(`${apiUrl}/public/blog/posts/${slug}`, {
    cache: 'no-store',
  })
  if (!response.ok) return null
  const payload = await response.json()
  return payload.data || null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Blog post not found | Upward' }

  return {
    title: `${post.title} | Upward`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  return (
    <>
      <BlogUtmCapture />
      <LegalPageIntro
        title={post.title}
        kicker="Blog"
        updated={new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
        subtitle={`By ${post.authorName}`}
      />

      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={post.title}
          style={{ width: '100%', maxHeight: 440, objectFit: 'cover', borderRadius: 18, marginBottom: 24 }}
        />
      )}

      <article
        className="legal-content"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />

      <section className="legal-callout" style={{ marginTop: 24, textAlign: 'center' }}>
        <h3 className="legal-h2" style={{ marginTop: 0 }}>Start your Upward journey</h3>
        <p style={{ marginBottom: 12 }}>Use your rent record to unlock fairer housing opportunities.</p>
        <TrackedCtaLink href="/signup" className="legal-card__link">
          Get started →
        </TrackedCtaLink>
      </section>
    </>
  )
}
