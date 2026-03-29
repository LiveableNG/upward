'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Home } from 'lucide-react'

export default function PropertiesPage() {
  const router = useRouter()

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header dashboard__header--mobile">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Properties</h2>
        </div>
        <div className="dashboard__header-right">
             <Search size={20} />
        </div>
      </header>

      {/* ── DESKTOP HEADER ── */}
      <header className="dashboard__header--desktop">
        <div className="dashboard__desktop-header-left">
          <h1 className="dashboard__desktop-title">Properties</h1>
          <p className="dashboard__desktop-subtitle">Manage your lease spaces</p>
        </div>
        <div className="dashboard__desktop-header-right">
             <Search size={20} />
        </div>
      </header>

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          <div className="dashboard__empty" style={{ marginTop: '120px' }}>
        <div style={{ animation: 'bounce 2s infinite', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <style>{`
            @keyframes bounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-15px); }
            }
          `}</style>
          <Home size={64} color="var(--clay)" />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text)' }}>Find Your Next Home</h3>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>A curated list of apartments for rent will be available here soon.</p>
        </div>
        </div>
        
        <div className="dashboard__col--right">
          <section className="dashboard__section">
            <div className="dashboard__adverts">
               <div className="dashboard__ad-card dashboard__ad-card--primary" onClick={() => router.push('/dashboard')}>
                  <div className="dashboard__ad-badge">Update</div>
                  <h4 className="dashboard__ad-title">Access Dashboard</h4>
                  <p className="dashboard__ad-desc">Head back to your dashboard to view your insights.</p>
                  <div className="dashboard__ad-icon"><Home size={40} /></div>
               </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
