'use client'

export function AmbassadorSection({ onOpenSignup }: { onOpenSignup: () => void }) {
  const sessions = [
    {
      title: 'Learn More & Ask Questions',
      info: 'Every Tuesday · 7:00 PM WAT',
      badge: 'Register',
      live: false,
    },
    {
      title: 'Information Session',
      info: 'Every Wednesday · 12:00 PM WAT',
      badge: 'Register',
      live: false,
    },
    {
      title: 'Learn More & Ask Questions',
      info: 'Every Thursday · 7:00 PM WAT',
      badge: 'Register',
      live: false,
    },
    {
      title: 'Live Info Session',
      info: 'Every Saturday · 10:00 AM WAT',
      badge: '● Live',
      live: true,
    },
  ]

  return (
    <section
      id="ambassador"
      style={{ padding: '80px 40px', position: 'relative', zIndex: 1 }}
      className="container-padding"
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          padding: '64px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '64px',
          alignItems: 'center',
        }}
        className="grid-stack-mobile ambassador-card"
      >
        <div>
          <div className="section-label" style={{ marginBottom: '16px' }}>
            Learn More
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.04em',
              marginBottom: '16px',
            }}
          >
            Want to be part of something bigger?
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: 'var(--muted)',
              lineHeight: 1.7,
              marginBottom: '32px',
            }}
          >
            Join one of our live information sessions to learn how Upward works, ask questions, and
            explore how you can become a community ambassador and earn rewards.
          </p>
          <button
            onClick={() => onOpenSignup()}
            style={{
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#d8ff6e'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.transform = ''
            }}
          >
            Become an Ambassador
            <svg
              width="16"
              height="16"
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sessions.map(({ title, info, badge, live }) => (
            <div
              key={title}
              onClick={() => onOpenSignup()}
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(217, 119, 87, 0.4)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.transform = ''
              }}
            >
              <div style={{ paddingRight: '12px' }}>
                <h5
                  style={{
                    fontFamily: 'var(--font-head)',
                    fontWeight: 700,
                    fontSize: '15px',
                    marginBottom: '6px',
                  }}
                >
                  {title}
                </h5>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{info}</p>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  padding: '6px 12px',
                  borderRadius: '100px',
                  flexShrink: 0,
                  background: live ? 'rgba(123,245,196,0.1)' : 'rgba(217, 119, 87, 0.1)',
                  color: live ? '#7bf5c4' : 'var(--accent)',
                  border: `1px solid ${live ? 'rgba(123,245,196,0.2)' : 'rgba(217, 119, 87, 0.2)'}`,
                  fontWeight: 700,
                }}
              >
                {badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
                @media (max-width: 768px) {
                    .ambassador-card {
                        padding: 40px 24px !important;
                        text-align: center;
                    }
                    .ambassador-card button {
                        width: 100%;
                    }
                }
            `}</style>
    </section>
  )
}
