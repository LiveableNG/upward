'use client'

import { useRouter } from 'next/navigation'
import { Shield, FileText, ChevronRight, Gavel } from 'lucide-react'
import { PayPageShell } from '@/features/dashboard/components/payment/PayPageShell'

export default function LegalHubPage() {
  const router = useRouter()

  const legalItems = [
    {
      title: 'Privacy Policy',
      subtitle: 'How we handle your personal data',
      icon: Shield,
      path: '/dashboard/legal/privacy',
    },
    {
      title: 'Terms of Use',
      subtitle: 'Rules for using our platform',
      icon: Gavel,
      path: '/dashboard/legal/terms',
    },
    {
      title: 'Cookies Policy',
      subtitle: 'About how we use cookies',
      icon: FileText,
      path: '/dashboard/legal/cookies',
    },
  ]

  return (
    <PayPageShell
      title="Legal & Privacy"
      showBack
      onBack={() => router.push('/dashboard/me')}
    >
      <div className="profile-page__menu-card">
        {legalItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              type="button"
              className="profile-page__menu-item"
              onClick={() => router.push(item.path)}
            >
              <span className="profile-page__menu-icon profile-page__menu-icon--muted">
                <Icon size={16} />
              </span>
              <span className="profile-page__menu-text">
                <span className="profile-page__menu-title">{item.title}</span>
                <span className="profile-page__menu-desc">{item.subtitle}</span>
              </span>
              <span className="profile-page__menu-trail">
                <ChevronRight size={16} />
              </span>
            </button>
          )
        })}
      </div>

      <p className="sub-page__footer">Upward by GoodTenants · v0.1.0</p>
    </PayPageShell>
  )
}
