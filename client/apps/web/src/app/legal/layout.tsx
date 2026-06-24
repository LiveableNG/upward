import '@/styles/legal.css'
import { MarketingFooter } from '@/components/layout/marketing-footer'
import { MarketingHeader } from '@/components/layout/marketing-header'

export default function LegalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal-page">
      <MarketingHeader />
      <main className="legal-main">{children}</main>
      <MarketingFooter />
    </div>
  )
}
