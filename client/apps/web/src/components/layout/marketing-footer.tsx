'use client'

import Link from 'next/link'
import { Linkedin } from 'lucide-react'

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

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

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="marketing-footer__container">
        <div className="marketing-footer__top">
          <div className="marketing-footer__brand-col">
            <Link href="/" className="marketing-footer__brand">
              <div className="marketing-footer__logo">
                <img src="/favicon.svg" alt="Upward" />
              </div>
              <span className="marketing-footer__name">UPWARD</span>
            </Link>
            <p className="marketing-footer__tagline">
              Africa&apos;s first credit-building platform dedicated to making housing affordable and
              accessible for the next generation of homeowners.
            </p>
            <div className="marketing-footer__socials">
              <a
                href="https://x.com/useupward"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (formerly Twitter)"
              >
                <XIcon />
              </a>
              <a
                href="https://www.tiktok.com/@useupward"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                <TikTokIcon />
              </a>
              <a
                href="https://www.linkedin.com/company/useupward/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          <div className="marketing-footer__cols">
            <div className="marketing-footer__col">
              <b>Product</b>
              <Link href="/request-a-home">Request a Home</Link>
              <Link href="/for-landlord">Landlords</Link>
              <Link href="/for-pm">Property Managers</Link>
              <Link href="/blog">Blog</Link>
            </div>
            <div className="marketing-footer__col">
              <b>Legal</b>
              <Link href="/legal/privacy">Privacy Policy</Link>
              <Link href="/legal/terms">Terms of Use</Link>
              <Link href="/legal/cookies">Cookie Policy</Link>
              <Link href="/legal/notice">Legal Notice</Link>
            </div>
            <div className="marketing-footer__col">
              <b>Contact</b>
              <a href="mailto:hello@goodtenants.africa">hello@goodtenants.africa</a>
              <a href="tel:09040969943">09040969943</a>
            </div>
          </div>
        </div>

        <div className="marketing-footer__bottom">
          <div>© 2026 Upward by GoodTenants. All rights reserved. Registered in Nigeria.</div>
          <div>Built for Nigerian renters, landlords &amp; property managers.</div>
        </div>
      </div>
    </footer>
  )
}
