export function BenefitsGrid({ onOpenSignup }: { onOpenSignup?: (email?: string) => void }) {
  const handleHeroEmail = async () => {
    const emailEl = document.getElementById('hero-email-grid') as HTMLInputElement
    const email = emailEl?.value.trim() ?? ''
    if (!email || !email.includes('@')) {
      const t = document.getElementById('toast')
      const msgEl = document.getElementById('toast-msg')
      if (t && msgEl) {
        msgEl.textContent = 'Please enter a valid email address.'
        t.classList.add('toast-show')
        setTimeout(() => t.classList.remove('toast-show'), 3000)
      }
      return
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => {})
    if (onOpenSignup) onOpenSignup(email)
  }
  const cards = [
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      title: 'Your next rental at ease',
      desc: 'Find homes with ease and get prioritized by agents and landlords.',
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      ),
      title: 'Exclusive financial benefits',
      desc: 'Claim discounts, flexible payment plans from partner managers.',
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      ),
      title: 'Renter to homeowner',
      desc: 'Access high quality, titled homes with long-term equity options.',
    },
    {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
      title: 'Single digit home loans',
      desc: 'Get single digit home financing to buy homes.',
    },
  ]

  return (
    <section
      style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        paddingTop: '20px',
        gap: '24px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridAutoRows: '1fr',
          gap: '16px',
          width: '100%',
        }}
        className="benefits-grid-container"
      >
        {cards.map(({ icon, title, desc }) => (
          <div
            key={title}
            style={{
              background: 'var(--surface2)',
              padding: '24px 20px',
              cursor: 'default',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              gap: '12px',
              willChange: 'transform',
              transition:
                'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(217, 119, 87, 0.3)'
              e.currentTarget.style.transform = 'translateY(-6px)'
              e.currentTarget.style.background = 'rgba(217, 119, 87, 0.03)'
              e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(0,0,0,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.background = 'var(--surface2)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                minHeight: '56px',
                background: 'rgba(217, 119, 87, 0.12)',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <h3
              style={{
                fontFamily: 'var(--font-head)',
                fontWeight: 800,
                fontSize: '18px',
                color: 'var(--text)',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--muted)',
                lineHeight: 1.6,
              }}
            >
              {desc}
            </p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '24px', width: '100%', animation: 'fadeUp 0.7s 0.4s ease both' }}>
        <div style={{ display: 'flex', gap: '12px', maxWidth: '560px' }} className="stack-mobile">
          <input
            id="hero-email-grid"
            type="email"
            placeholder="Enter your email address"
            style={{
              flex: 1.5,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              padding: '16px 24px',
              borderRadius: '12px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <button
            onClick={handleHeroEmail}
            style={{
              flex: 1,
              background: 'var(--accent)',
              color: '#0A0A0F',
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '14px',
              letterSpacing: '0.05em',
              padding: '16px 28px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e68a6b'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(217, 119, 87, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = ''
              e.currentTarget.style.boxShadow = ''
            }}
          >
            Get Priority Access
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--muted)',
            marginTop: '16px',
            opacity: 0.6,
            fontStyle: 'italic',
          }}
        >
          * Be the first to build a verified rental history and unlock rewards.
        </p>
      </div>

      <style jsx>{`
        @media (max-width: 1200px) {
          .benefits-grid-container {
            gap: 14px !important;
          }
        }
        @media (max-width: 640px) {
          .benefits-grid-container {
            grid-template-columns: 1fr !important;
            grid-auto-rows: auto !important;
          }
        }
      `}</style>
    </section>
  )
}
