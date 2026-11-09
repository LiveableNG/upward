import React from 'react'
import { BarChart3, Target, FolderTree, Package, Store } from 'lucide-react'
import type { GoalTab } from '../types'

interface GoalTabNavProps {
  activeTab: GoalTab
  onTabChange: (tab: GoalTab) => void
  totalGoals: number
  totalCategories: number
  totalOfferings: number
  totalVendors: number
}

export const GoalTabNav: React.FC<GoalTabNavProps> = ({
  activeTab,
  onTabChange,
  totalGoals,
  totalCategories,
  totalOfferings,
  totalVendors,
}) => {
  const tabs = [
    {
      id: 'OVERVIEW' as GoalTab,
      label: 'Overview & Analytics',
      icon: BarChart3,
    },
    {
      id: 'GOALS' as GoalTab,
      label: `Goals (${totalGoals})`,
      icon: Target,
    },
    {
      id: 'CATEGORIES' as GoalTab,
      label: `Categories (${totalCategories})`,
      icon: FolderTree,
    },
    {
      id: 'OFFERINGS' as GoalTab,
      label: `Offerings & Packages (${totalOfferings})`,
      icon: Package,
    },
    {
      id: 'VENDORS' as GoalTab,
      label: `Commerce Vendors (${totalVendors})`,
      icon: Store,
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '2px',
      }}
      className="scroll-x"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              border: 'none',
              background: 'transparent',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: isActive ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'var(--transition)',
            }}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
