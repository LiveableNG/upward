'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Twitter, Linkedin } from 'lucide-react'

function TikTokIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.82-3.53V3h-3.18v12.49a2.59 2.59 0 1 1-2.05-2.54V9.72a6.03 6.03 0 1 0 4.82 5.91V9.18a8.01 8.01 0 0 0 4.23 1.22V7.26a4.79 4.79 0 0 1 0-.57Z" />
    </svg>
  )
}

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/legal/privacy' },
  { label: 'Terms of Use', href: '/legal/terms' },
  { label: 'Cookie Policy', href: '/legal/cookies' },
  { label: 'Legal Notice', href: '/legal/notice' },
] as const

export function MarketingFooter() {
  const pathname = usePathname()

  return (
    <footer className="marketing-footer">
      <div className="marketing-footer__inner">
        <div className="marketing-footer__brand">
          <div className="marketing-footer__logo">
            <img src="/favicon.svg" alt="Upward" />
          </div>
          <span className="marketing-footer__name">UPWARD</span>
        </div>

        <p className="marketing-footer__tagline">
          Africa&apos;s first credit-building platform dedicated to making housing affordable and
          accessible for the next generation of homeowners.
        </p>

        <div className="marketing-footer__contact">
          <a href="mailto:hello@goodtenants.africa">hello@goodtenants.africa</a>
          <a href="tel:09040969943">09040969943</a>
        </div>

        <div className="marketing-footer__socials">
          <a
            href="https://x.com/useupward"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Twitter size={16} />
            Twitter
          </a>
          <a
            href="https://www.tiktok.com/@useupward"
            target="_blank"
            rel="noopener noreferrer"
          >
            <TikTokIcon />
            TikTok
          </a>
          <a
            href="https://www.linkedin.com/company/useupward/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Linkedin size={16} />
            LinkedIn
          </a>
        </div>

        <nav className="marketing-footer__legal" aria-label="Legal">
            <Link href="/blog" className={pathname.startsWith('/blog') ? 'is-active' : undefined}>
              Blog
            </Link>
          {LEGAL_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href ? 'is-active' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="marketing-footer__copy">
          <p>© 2026 Upward by GoodTenants. All rights reserved. Registered in Nigeria.</p>
        </div>
      </div>
    </footer>
  )
}
