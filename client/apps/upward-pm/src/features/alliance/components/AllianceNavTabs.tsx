'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, List, Users, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AllianceNavTabsProps {
  activeTab?: 'discover' | 'my-listings' | 'referrals' | 'commissions'
  counts?: {
    listings?: number
    referrals?: number
    commissions?: number
  }
}

export function AllianceNavTabs({ activeTab, counts }: AllianceNavTabsProps) {
  const pathname = usePathname()

  const tabs = [
    {
      id: 'discover',
      label: 'Discover Network',
      href: '/alliance/discover',
      icon: Compass,
      isActive: activeTab === 'discover' || pathname === '/alliance/discover' || pathname.startsWith('/alliance/discover/'),
      count: undefined,
    },
    {
      id: 'my-listings',
      label: 'My Listings',
      href: '/alliance/listings',
      icon: List,
      isActive: activeTab === 'my-listings' || pathname === '/alliance/listings' || pathname.startsWith('/alliance/listings/'),
      count: counts?.listings,
    },
    {
      id: 'referrals',
      label: 'Referrals & Leads',
      href: '/alliance/referrals',
      icon: Users,
      isActive: activeTab === 'referrals' || pathname === '/alliance/referrals' || pathname.startsWith('/alliance/referrals/'),
      count: counts?.referrals,
    },
    {
      id: 'commissions',
      label: 'Commissions',
      href: '/alliance/commissions',
      icon: DollarSign,
      isActive: activeTab === 'commissions' || pathname === '/alliance/commissions' || pathname.startsWith('/alliance/commissions/'),
      count: counts?.commissions,
    },
  ]

  return (
    <nav className="alliance-segmented-nav" aria-label="Alliance sections">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              'alliance-segmented-tab',
              tab.isActive && 'alliance-segmented-tab--active'
            )}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="alliance-segmented-tab__badge">{tab.count}</span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
