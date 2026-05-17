import { showToast } from '@upward/client-core'

export function BenefitsGrid({
  onOpenSignup,
}: {
  onOpenSignup?: (email?: string) => void
}) {
  const handleHeroEmail = async () => {
    const emailEl = document.getElementById('hero-email-grid') as HTMLInputElement
    const email = emailEl?.value.trim() ?? ''
    if (!email || !email.includes('@')) {
      showToast('Please enter a valid email address.', true)
      return
    }
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
      title: 'Rent Your Next Home with Ease',
      desc: 'Still renting? Discover great homes and get prioritised by trusted owners and property managers.',
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
      title: 'Exclusive Financial Benefits',
      desc: 'Unlock rent discounts, flexible payment plans, and affordable financing for household essentials.',
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
      title: 'From Renter to Homeowner',
      desc: 'Graduate into the Homeowners Collective and access friendly single-digit financing for your first home.',
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
      title: 'Rent Passport',
      desc: 'Turn your verified rental history into a trusted credit profile—use it to access financing and home access, even when moving abroad.',
    },
  ]

  return (
    <section
      id="how"
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
              e.currentTarget.style.borderColor = 'var(--accent-muted)'
              e.currentTarget.style.transform = 'translateY(-6px)'
              e.currentTarget.style.background = 'var(--accent-faint)'
              e.currentTarget.style.boxShadow = '0 20px 40px -15px var(--hover-shadow)'
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
                background: 'var(--accent-faint)',
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


      <style jsx>{`
        @media (max-width: 1200px) {
          .benefits-grid-container {
            gap: 14px !important;
          }
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
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
