import {
  GraduationCap,
  Users,
  Share2,
  Gift,
  Briefcase,
} from 'lucide-react'
import type { UniversityTab } from '../types'

interface UniversityTabNavProps {
  activeTab: UniversityTab
  onTabChange: (tab: UniversityTab) => void
  totalApplications: number
  totalEarlyAccess: number
  totalTrafficSources: number
  totalReferrals: number
  totalHireRequests: number
}

export const UniversityTabNav: React.FC<UniversityTabNavProps> = ({
  activeTab,
  onTabChange,
  totalApplications,
  totalEarlyAccess,
  totalTrafficSources,
  totalReferrals,
  totalHireRequests,
}) => {
  const tabs = [
    {
      id: 'APPLICATIONS' as UniversityTab,
      label: `Full Student Applications (${totalApplications})`,
      icon: GraduationCap,
    },
    {
      id: 'EARLY_ACCESS' as UniversityTab,
      label: `Early Access & Info Leads (${totalEarlyAccess})`,
      icon: Users,
    },
    {
      id: 'HIRE_REQUESTS' as UniversityTab,
      label: `Company Hiring Inquiries (${totalHireRequests})`,
      icon: Briefcase,
    },
    {
      id: 'TRAFFIC' as UniversityTab,
      label: `Traffic & Referral Sources (${totalTrafficSources})`,
      icon: Share2,
    },
    {
      id: 'REFERRALS' as UniversityTab,
      label: `Friend Referrals (10% Rewards) (${totalReferrals})`,
      icon: Gift,
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '12px',
        flexWrap: 'wrap',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: isActive ? '#8A4A2A' : 'transparent',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon size={16} />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
