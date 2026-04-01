'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  BellRing, 
  ShieldCheck, 
  CreditCard, 
  Trophy, 
  Sparkles, 
  Megaphone, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react'

// --- MOCK ANNOUNCEMENTS ---
const MOCK_ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'New Feature: Rent Credit Report',
    desc: 'You can now download your professional tenant credibility report to share with potential landlords.',
    date: '2 hours ago',
    type: 'feature',
    isRead: false,
    icon: <Sparkles size={18} />
  },
  {
    id: 'ann-2',
    title: 'Maintenace Complete',
    desc: 'Our payment systems are fully restored. Thank you for your patience.',
    date: 'Yesterday',
    type: 'info',
    isRead: true,
    icon: <Megaphone size={18} />
  },
  {
    id: 'ann-3',
    title: 'Achievement Unlocked!',
    desc: 'You have paid 3 months of rent consecutively. Your credibility score just got a boost!',
    date: '3 days ago',
    type: 'reward',
    isRead: true,
    icon: <Trophy size={18} />
  }
]

// --- MOCK ACTIONS (Normally these would come from an API/State) ---
const MOCK_ACTIONS = [
  {
    id: 'act-kyc',
    title: 'Complete Landlord KYC',
    desc: 'Verify your ID and residency for LivableNG/HQ-9-24 to boost your trust score.',
    type: 'kyc',
    priority: 'high',
    buttonText: 'Complete Now'
  },
  {
    id: 'act-payment',
    title: 'Rent Due: Sunshine Properties',
    desc: 'Your rent for March (₦180,000) is pending. Pay now to avoid late fees.',
    type: 'payment',
    priority: 'medium',
    buttonText: 'Pay ₦180,000'
  }
]


export default function ActivityHubPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'actions' | 'announcements'>('actions')

  return (
    <div className="dashboard dashboard--nav-offset">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
           <button className="dashboard__back" onClick={() => router.push('/dashboard')}>
             <ArrowLeft size={20} />
           </button>
           <h2 className="dashboard__title">Activity Hub</h2>
        </div>
      </header>

      <section className="dashboard__section" style={{ maxWidth: '1100px', margin: '16px auto', padding: '0 20px', width: '100%' }}>
        {/* TABS SWITCHER */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px', 
          background: 'var(--surface)', 
          padding: '6px', 
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-solid)' 
        }}>
          {(() => {
            const actionsCount = MOCK_ACTIONS.length
            const unreadNewsCount = MOCK_ANNOUNCEMENTS.filter(a => !a.isRead).length
            
            return (
              <>
                <button 
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    borderRadius: 'var(--radius-md)', 
                    border: 'none', 
                    background: activeTab === 'actions' ? 'var(--bg)' : 'transparent', 
                    color: activeTab === 'actions' ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '14px',
                    boxShadow: activeTab === 'actions' ? '0 2px 10px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setActiveTab('actions')}
                >
                  <Clock size={16} /> Actions
                  {actionsCount > 0 && (
                    <span style={{ 
                      background: 'var(--clay)', 
                      color: '#fff', 
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      borderRadius: '10px',
                      marginLeft: '4px'
                    }}>{actionsCount}</span>
                  )}
                </button>
                <button 
                  style={{ 
                    flex: 1, 
                    padding: '12px', 
                    borderRadius: 'var(--radius-md)', 
                    border: 'none', 
                    background: activeTab === 'announcements' ? 'var(--bg)' : 'transparent',
                    color: activeTab === 'announcements' ? 'var(--text)' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '14px',
                    boxShadow: activeTab === 'announcements' ? '0 2px 10px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setActiveTab('announcements')}
                >
                  <Megaphone size={16} /> News
                  {unreadNewsCount > 0 && (
                    <span style={{ 
                      background: 'var(--clay)', 
                      color: '#fff', 
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      borderRadius: '10px',
                      marginLeft: '4px'
                    }}>{unreadNewsCount}</span>
                  )}
                </button>
              </>
            )
          })()}
        </div>

        {/* ACTIONS TAB */}
        {activeTab === 'actions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {MOCK_ACTIONS.map(action => (
              <div 
                key={action.id} 
                className={action.type === 'kyc' ? 'kyc-card' : ''}
                style={action.type !== 'kyc' ? {
                  background: 'var(--surface)',
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-solid)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                } : {}}
              >
                {action.type === 'kyc' ? (
                   <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="kyc-card__icon-wrap">
                        <ClipboardCheck size={20} />
                      </div>
                      <span className="kyc-card__badge" style={{ animation: 'pulseDot 2s infinite' }}>High Priority</span>
                    </div>
                    <div>
                      <h3 className="kyc-card__title" style={{ fontSize: '18px' }}>{action.title}</h3>
                      <p className="kyc-card__desc" style={{ fontSize: '14px', opacity: 0.9 }}>{action.desc}</p>
                    </div>
                    <button className="kyc-card__btn" style={{ height: '48px' }} onClick={() => router.push('/dashboard/kyc')}>
                      {action.buttonText}
                    </button>
                   </>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        background: 'var(--clay-faint)', 
                        color: 'var(--clay)', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <CreditCard size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{action.title}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Pending Payment</p>
                      </div>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {action.desc}
                    </p>
                    <button className="btn btn--primary btn--full" onClick={() => router.push('/pay')}>
                      {action.buttonText}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MOCK_ANNOUNCEMENTS.map(ann => (
              <div 
                key={ann.id} 
                style={{ 
                  background: 'var(--surface)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-lg)', 
                  border: '1px solid var(--border-solid)',
                  display: 'flex',
                  gap: '16px',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
              >
                {!ann.isRead && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '16px', 
                    right: '16px', 
                    width: '8px', 
                    height: '8px', 
                    background: 'var(--clay)', 
                    borderRadius: '50%' 
                  }} />
                )}
                <div style={{ 
                  width: '44px', 
                  height: '44px', 
                  background: ann.isRead ? 'var(--bg)' : 'var(--clay-faint)', 
                  color: ann.isRead ? 'var(--text-muted)' : 'var(--clay)', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {ann.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: ann.isRead ? 600 : 700, color: 'var(--text)' }}>
                      {ann.title}
                    </h3>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                    {ann.desc}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {ann.date}
                  </span>
                </div>
                <div style={{ alignSelf: 'center', color: 'var(--border-solid)' }}>
                  <ChevronRight size={18} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
