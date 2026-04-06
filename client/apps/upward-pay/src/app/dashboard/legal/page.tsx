'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Shield, FileText, ChevronRight, Gavel } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'

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
    <div className="legal-hub-page dashboard--nav-offset">
      <PageHeader title="Legal & Privacy" showBack backPath="/dashboard/me" showSettings={false} />

      <div className="dashboard__main-grid">
        <div className="dashboard__col--left">
          <div className="legal-list">
            {legalItems.map((item, idx) => {
              const Icon = item.icon
              return (
                <div key={idx} className="legal-item" onClick={() => router.push(item.path)}>
                  <div className="legal-item__left">
                    <div className="legal-item__icon-wrap">
                      <Icon size={20} color="var(--clay)" />
                    </div>
                    <div>
                      <span className="legal-item__title">{item.title}</span>
                      <p className="legal-item__sub">{item.subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .legal-list {
          background: var(--surface);
          border-radius: 20px;
          border: 1px solid var(--border);
          overflow: hidden;
          margin: 0 1rem;
        }
        .legal-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1rem;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border);
        }
        .legal-item:last-child {
          border-bottom: none;
        }
        .legal-item:active {
          background: var(--surface2);
        }
        .legal-item__left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .legal-item__icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--clay-faint);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .legal-item__title {
          display: block;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }
        .legal-item__sub {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
