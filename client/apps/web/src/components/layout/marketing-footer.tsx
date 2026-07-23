'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Twitter, Linkedin } from 'lucide-react'

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
