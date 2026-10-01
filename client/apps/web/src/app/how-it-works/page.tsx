import type { Metadata } from 'next'
import Link from 'next/link'
import '@/styles/legal.css'
import '@/styles/how-it-works.css'
import { MarketingHeader } from '@/components/layout/marketing-header'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { HowItWorksSimulator } from './HowItWorksSimulator'
import {
  ArrowRight,
  Smartphone
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'How It Works — Direct Rent Payments & Credibility Score | Upward',
  description:
    'Pay rent directly to your landlord via bank transfer while building your official Upward Credibility Score. Learn how our secure, frictionless rent rails work in 6 simple steps.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    title: 'How Upward Works — Pay Rent & Build Credibility',
    description:
      'Transfer rent to your landlord just like any bank app, with direct settlement and smart narration. Turn your on-time rent into verified reputation and mortgage access.',
    url: 'https://upward.goodtenants.io/how-it-works',
    siteName: 'Upward'
  }
}

export default function HowItWorksPage() {
  return (
    <div className="legal-page hiw-page">
      <MarketingHeader />

      <main>
        {/* Hero Section */}
        <section className="hiw-hero">
          <div className="hiw-container">
            <h1 className="hiw-hero__title">
              Pay rent like any <span className="hiw-nowrap">bank app.</span>{' '}
              <br className="hiw-desktop-br" />
              Get recognized like <em className="accent">never before.</em>
            </h1>

            <p className="hiw-hero__lead">
              Send rent straight to your landlord’s bank account via online payment or instant bank transfer.
              Your landlord receives the funds with your verified name and property in the bank narration, even if they
              are not on Upward. Meanwhile, every on-time payment builds your Credibility Score and verified Rent Passport.
            </p>

            {/* Hero CTAs */}
            <div className="hiw-hero__actions">
              <Link href="/signup" className="hiw-btn-primary">
                Create Account &amp; Pay Rent <ArrowRight size={16} />
              </Link>
              <a href="#interactive-demo" className="hiw-btn-secondary">
                Watch Step-by-Step Flow
              </a>
            </div>
          </div>
        </section>

        {/* Interactive Visual Simulator Section */}
        <section className="hiw-walkthrough-section">
          <div className="hiw-container">
            <HowItWorksSimulator />
          </div>
        </section>

        {/* Bottom CTA Banner (Light Tone to Match the Site) */}
        <section className="hiw-bottom-cta">
          <div className="hiw-container">
            <div className="hiw-bottom-cta__box">
              <h2>Ready to turn your rent payments into your greatest asset?</h2>
              <p>
                Join thousands of forward-thinking Nigerian renters who pay rent with complete peace of mind,
                build verified financial reputation, and unlock mortgage opportunities.
              </p>
              <div className="hiw-bottom-cta__actions">
                <Link href="/signup" className="hiw-btn-primary" style={{ padding: '16px 36px', fontSize: '16px' }}>
                  Sign Up &amp; Pay Rent <ArrowRight size={18} />
                </Link>
                <a
                  href="https://wa.me/2348175437146?text=Hi%20Upward%2C%20I%20have%20questions%20about%20paying%20rent."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hiw-btn-secondary"
                  style={{ padding: '15px 28px', fontSize: '15px' }}
                >
                  <Smartphone size={16} /> Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  )
}
