'use client'
import Link from 'next/link'

export function Footer({ onSetView }: { onSetView?: (view: 'home' | 'why') => void }) {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '80px 40px 40px',
        position: 'relative',
        zIndex: 1,
      }}
      className="container-padding footer-section"
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: '60px',
          marginBottom: '64px',
        }}
        className="footer-grid"
      >
        <div className="footer-brand">
          <h3
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '24px',
              letterSpacing: '-0.03em',
              marginBottom: '16px',
              background: 'var(--heading-mix)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            Don&apos;t just pay rent,
            <br />
            build with it.
          </h3>
          <p
            style={{ fontSize: '15px', color: 'var(--muted)', maxWidth: '340px', lineHeight: 1.7 }}
            className="footer-p"
          >
            We help everyday renters unlock the financing they deserve through verified housing
            credibility. Your rent is your resume.
          </p>
        </div>

        <div className="footer-links-col">
          <h4
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '12px',
              marginBottom: '20px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text)',
            }}
          >
            Equity
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              ['#why', 'Our Vision'],
              ['#how', 'How it Works'],
              ['#ambassador', 'Ambassador'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <li key={label}>
                <Link
                  href={href ?? '#'}
                  onClick={(e) => {
                    if (onSetView) {
                      if (label === 'Our Vision' || label === 'FAQ') {
                        if (onSetView) onSetView('why')
                        else {
                          e.preventDefault()
                        }
                      } else if (label === 'Ambassador' || label === 'How it Works') {
                        if (onSetView) onSetView('home')
                        if (label === 'How it Works') {
                          setTimeout(() => {
                            const el = document.getElementById('how')
                            if (el) el.scrollIntoView({ behavior: 'smooth' })
                          }, 100)
                        }
                      }
                    }
                  }}
                  style={{
                    fontSize: '13px',
                    color: 'var(--muted)',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-links-col">
          <h4
            style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 800,
              fontSize: '12px',
              marginBottom: '20px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'var(--text)',
            }}
          >
            Legal
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[['Privacy Policy'], ['Terms of Use'], ['Cookie Policy']].map(([label]) => (
              <li key={label}>
                <Link
                  href="#"
                  style={{
                    fontSize: '13px',
                    color: 'var(--muted)',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          paddingTop: '32px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        className="footer-bottom-stack"
      >
        <p
          style={{
            fontSize: '11px',
            color: 'var(--muted)',
            letterSpacing: '0.05em',
          }}
          className="footer-copy"
        >
          © 2026 UPWARD by GoodTenants. <br className="mobile-only" />
          All Rights Reserved.
        </p>
        <div style={{ display: 'flex', gap: '24px' }} className="footer-socials">
          {[
            { name: 'LinkedIn', href: 'https://www.linkedin.com/company/good-tenants/' },
            { name: 'Instagram', href: 'https://www.instagram.com/usegoodtenants' },
          ].map((social) => (
            <Link
              key={social.name}
              href={social.href}
              target={social.href !== '#' ? '_blank' : undefined}
              rel={social.href !== '#' ? 'noopener noreferrer' : undefined}
              style={{
                fontSize: '11px',
                color: 'var(--muted)',
                textDecoration: 'none',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
            >
              {social.name}
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 48px !important;
          }
          .footer-brand {
            grid-column: span 2;
            margin-bottom: 20px;
          }
        }
        @media (max-width: 600px) {
          .footer-section {
            padding: 60px 24px 40px !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            text-align: center;
          }
          .footer-brand {
            grid-column: span 1;
          }
          .footer-brand h3 {
            margin-left: auto;
            margin-right: auto;
          }
          .footer-p {
            margin-left: auto;
            margin-right: auto;
          }
          .footer-bottom-stack {
            flex-direction: column-reverse;
            gap: 24px;
            text-align: center;
          }
          .footer-socials {
            justify-content: center;
          }
          .mobile-only {
            display: block;
          }
        }
        @media (min-width: 601px) {
          .mobile-only {
            display: none;
          }
        }
      `}</style>
    </footer>
  )
}
