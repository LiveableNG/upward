'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, BellRing } from 'lucide-react'

export default function NotificationsPage() {
  const router = useRouter()

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Notifications</h2>
        </div>
      </header>

      <section className="dashboard__section" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ padding: '24px', background: 'var(--surface)', borderRadius: '50%', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BellRing size={48} color="var(--border-solid)" />
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>You're all caught up!</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '280px' }}>
          There are no new notifications or messages for now. We'll let you know when something comes up.
        </p>
      </section>
    </div>
  )
}
