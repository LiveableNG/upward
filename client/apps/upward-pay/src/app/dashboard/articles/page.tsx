'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, ChevronRight, Share2, Bookmark } from 'lucide-react'

const ARTICLES = [
  {
    uuid: '1',
    title: 'Tackling the Housing Crisis in Africa: The Upward Vision',
    excerpt: 'How we are building a more transparent and accessible housing market for everyone across the continent.',
    date: 'March 25, 2026',
    author: 'Toluwani O.',
    category: 'Market Insight',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&auto=format&fit=crop&q=60'
  },
  {
    uuid: '2',
    title: 'Understanding Your Credit Score as a Tenant',
    excerpt: 'Your rent payments can now help you build credit. Learn how Upward tracks and reports your reliability.',
    date: 'March 20, 2026',
    author: 'Grace A.',
    category: 'Education',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1554224155-1696413575b8?w=800&auto=format&fit=crop&q=60'
  },
  {
    uuid: '3',
    title: '5 Tips for Saving for Your First Home',
    excerpt: 'Managing your rent is the first step towards homeownership. Here are five practical tips for potential homeowners.',
    date: 'March 15, 2026',
    author: 'David S.',
    category: 'Personal Finance',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=60'
  }
]

export default function ArticlesPage() {
  const router = useRouter()

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Insights</h2>
        </div>
        <div className="dashboard__header-right">
              <Bookmark size={20} className="text-muted" />
        </div>
      </header>

      <div className="articles__list" style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
         {ARTICLES.map((article) => (
           <article key={article.uuid} className="article-card">
              <div className="article-card__image-container">
                 <img src={article.image} alt={article.title} className="article-card__image" />
                 <span className="article-card__badge">{article.category}</span>
              </div>
              
              <div className="article-card__content" style={{ padding: '16px 4px' }}>
                 <div className="article-card__meta" style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    <span>{article.date}</span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                 </div>
                 
                 <h3 className="article-card__title" style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', lineHeight: '1.3' }}>
                    {article.title}
                 </h3>
                 
                 <p className="article-card__excerpt" style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '16px' }}>
                    {article.excerpt}
                 </p>
                 
                 <div className="article-card__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>{article.author[0]}</div>
                       <span style={{ fontSize: '12px', fontWeight: '500' }}>{article.author}</span>
                    </div>
                    
                    <button className="btn btn--link btn--sm" style={{ padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                       Read More <ChevronRight size={14} />
                    </button>
                 </div>
              </div>
           </article>
         ))}
      </div>

      <div className="dashboard__empty" style={{ margin: '40px 0' }}>
         <p>You&apos;ve reached the end for now! Check back daily for more insights.</p>
      </div>
      
      <style jsx>{`
        .article-card__image-container {
          position: relative;
          width: 100%;
          height: 180px;
          border-radius: 16px;
          overflow: hidden;
        }
        .article-card__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .article-card:hover .article-card__image {
          transform: scale(1.05);
        }
        .article-card__badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          color: #000;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          border-radius: 20px;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  )
}
