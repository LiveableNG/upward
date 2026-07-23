import type { Metadata } from 'next'
import '@/styles/legal.css'
import '@/styles/request-a-home.css'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { MarketingHeader } from '@/components/layout/marketing-header'
import { RequestAHomeForm } from './RequestAHomeForm'

export const metadata: Metadata = {
  title: 'Request a Home',
  description:
    'Tell Upward what apartment you need. NIESV-verified agents match you — scam-protected, no browsing required.',
  alternates: { canonical: '/request-a-home' },
}

export default function RequestAHomePage() {
  return (
    <div className="legal-page rah-page">
      <MarketingHeader />
      <main className="legal-main rah-main">
        <RequestAHomeForm />
      </main>
      <MarketingFooter />
    </div>
  )
}
