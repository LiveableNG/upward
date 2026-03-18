'use client'
import Link from 'next/link'

export function Footer({
  onSetView,
  onOpenSignup,
  trackInteraction,
}: {
  onSetView?: (view: 'home' | 'why') => void
  onOpenSignup?: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trackInteraction?: (type: string, target: string, metadata?: any) => void
}) {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '80px 40px 40px',
        position: 'relative',
        zIndex: 1,
        background: 'var(--bg)',
        color: 'var(--text)',
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
              ['/?view=why', 'Why Upward?'],
              ['/?view=home#how', 'How it Works'],
              ['/?signup=true', 'Join Live'],
              ['/?view=why#faq', 'FAQ'],
            ].map(([href, label]) => (
              <li key={label}>
                <Link
                  href={href ?? '#'}
                  onClick={(e) => {
                    if (trackInteraction)
                      trackInteraction(
                        'CLICK',
                        `FOOTER_LINK_${label?.toUpperCase().replace(/\s+/g, '_')}`,
                      )
                    if (onSetView) {
                      e.preventDefault()
                      if (label === 'Why Upward?' || label === 'FAQ') {
                        onSetView('why')
                        if (label === 'FAQ') {
                          setTimeout(() => {
                            const el = document.getElementById('faq')
                            if (el) {
                              const top = el.getBoundingClientRect().top + window.pageYOffset - 80
                              window.scrollTo({ top, behavior: 'smooth' })
                            }
                          }, 150)
                        }
                      } else if (label === 'Join Live') {
                        if (onOpenSignup) onOpenSignup()
                      } else if (label === 'How it Works') {
                        onSetView('home')
                        setTimeout(() => {
                          const el = document.getElementById('how')
                          if (el) {
                            const top = el.getBoundingClientRect().top + window.pageYOffset - 80
                            window.scrollTo({ top, behavior: 'smooth' })
                          }
                        }, 100)
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
            {(
              [
                ['Privacy Policy', '/legal/privacy'],
                ['Terms of Use', '/legal/terms'],
                ['Cookie Policy', '/legal/cookies'],
                ['Legal Notice', '/legal/notice'],
              ] as [string, string][]
            ).map(([label, href]) => (
              <li key={label}>
                <Link
                  href={href as string}
                  onClick={() => {
                    if (trackInteraction)
                      trackInteraction(
                        'CLICK',
                        `LEGAL_LINK_${label.toUpperCase().replace(/\s+/g, '_')}`,
                      )
                  }}
                  target={href !== '#' ? '_blank' : undefined}
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
        <div
          style={{ display: 'flex', gap: '32px', alignItems: 'center' }}
          className="footer-bottom-group"
        >
          <div
            style={{ display: 'flex', gap: '20px', alignItems: 'center' }}
            className="footer-contact"
          >
            <a
              href="mailto:hello@goodtenants.africa"
              onClick={() => {
                if (trackInteraction) trackInteraction('CLICK', 'CONTACT_EMAIL')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: 'var(--muted)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              hello@goodtenants.africa
            </a>
            <a
              href="tel:09040969943"
              onClick={() => {
                if (trackInteraction) trackInteraction('CLICK', 'CONTACT_PHONE')
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: 'var(--muted)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              09040969943
            </a>
          </div>
          <div style={{ display: 'flex', gap: '20px' }} className="footer-socials">
            {[
              { name: 'Twitter', href: 'https://x.com/UseGoodTenants' },
              { name: 'LinkedIn', href: 'https://www.linkedin.com/company/good-tenants/' },
              { name: 'Instagram', href: 'https://www.instagram.com/usegoodtenants' },
            ].map((social) => (
              <Link
                key={social.name}
                href={social.href}
                onClick={() => {
                  if (trackInteraction)
                    trackInteraction('CLICK', `SOCIAL_LINK_${social.name.toUpperCase()}`)
                }}
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
          .footer-contact {
            justify-content: center;
            flex-wrap: wrap;
            gap: 16px !important;
          }
          .footer-bottom-group {
            flex-direction: column;
            gap: 20px !important;
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
