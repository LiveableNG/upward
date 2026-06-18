'use client'
import { showToast } from '@upward/client-core'

export function TellAFriend() {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://upward.goodtenants.io'
  const caption = `Tired of paying rent with nothing to show for it? Upward is changing that — turning your rental history into a passport to home ownership. Join me: ${webUrl} #RentPassport #Upward`

  return (
    <section
      id="share"
      style={{
        padding: '80px 40px',
        maxWidth: '1280px',
        margin: '0 auto',
        position: 'relative',
        zIndex: 1,
      }}
      className="container-padding"
    >
      <div
        style={{
          background: 'linear-gradient(135deg, var(--accent-faint) 0%, var(--nav-bg) 100%)',
          border: '1px solid var(--accent-muted)',
          borderRadius: '24px',
          padding: '64px 48px',
          textAlign: 'center',
        }}
        className="share-card"
      >
        <div
          style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 500,
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            letterSpacing: '-0.04em',
            marginBottom: '16px',
            lineHeight: 1.15,
          }}
        >
          Tell a Friend. Build a Movement.
        </div>
        <p
          style={{
            fontSize: '16px',
            color: 'var(--muted)',
            marginBottom: '40px',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.7,
          }}
        >
          Every person you refer helps build the movement. Share Upward and help your community win.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap' as const,
          }}
        >
          {[
            {
              label: 'WhatsApp',
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              ),
              onClick: () =>
                window.open('https://wa.me/?text=' + encodeURIComponent(caption), '_blank'),
            },
            {
              label: 'Twitter / X',
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              ),
              onClick: () =>
                window.open(
                  'https://twitter.com/intent/tweet?text=' + encodeURIComponent(caption),
                  '_blank',
                ),
            },
            {
              label: 'LinkedIn',
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              ),
              onClick: async () => {
                try {
                  await navigator.clipboard.writeText(caption)
                  showToast('Caption copied! Paste it in your LinkedIn post.')

                  setTimeout(() => {
                    window.open(
                      'https://www.linkedin.com/sharing/share-offsite/?url=' +
                        encodeURIComponent(webUrl),
                      '_blank',
                    )
                  }, 1200) // delay so user sees the toast
                } catch {
                  window.open(
                    'https://www.linkedin.com/sharing/share-offsite/?url=' +
                      encodeURIComponent(webUrl),
                    '_blank',
                  )
                }
              },
            },
            {
              label: 'Copy Link',
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              ),
              onClick: () =>
                navigator.clipboard
                  .writeText(caption)
                  .then(() => showToast('Caption copied to clipboard!')),
            },
          ].map(({ label, icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '14px 24px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--surface2)',
                color: 'var(--text)',
                fontFamily: 'var(--font-body)',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: 600,
              }}
              className="share-btn"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-muted)'
                e.currentTarget.style.background = 'var(--accent-faint)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--surface2)'
                e.currentTarget.style.transform = ''
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div
          style={{
            marginTop: '40px',
            padding: '24px 32px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            fontSize: '14px',
            color: 'var(--muted)',
            maxWidth: '640px',
            marginLeft: 'auto',
            marginRight: 'auto',
            textAlign: 'left',
            position: 'relative',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-head)',
              fontSize: '48px',
              color: 'var(--accent)',
              opacity: 0.2,
              position: 'absolute',
              top: '-12px',
              left: '16px',
              lineHeight: 1,
            }}
          >
            &quot;
          </span>
          <span
            style={{ display: 'block', paddingLeft: '24px', lineHeight: 1.6, fontStyle: 'italic' }}
          >
            Tired of paying rent with nothing to show for it? Upward is changing that — turning your
            rental history into a passport to home ownership. Join me and start building your rental
            credibility: {webUrl}
            #RentPassport #Upward
          </span>
        </div>
      </div>

      <style>{`
                @media (max-width: 768px) {
                    .share-card {
                        padding: 40px 24px !important;
                    }
                    .share-btn {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>
    </section>
  )
}
