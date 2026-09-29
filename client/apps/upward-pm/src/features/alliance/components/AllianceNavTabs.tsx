'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, List, Award, Users, DollarSign } from 'lucide-react'

interface AllianceNavTabsProps {
  activeTab?: 'discover' | 'my-listings' | 'referrals' | 'commissions'
}

export function AllianceNavTabs({ activeTab }: AllianceNavTabsProps) {
  const pathname = usePathname()
  const isDiscover = activeTab === 'discover' || pathname.startsWith('/alliance/discover')
  const isMyListings = activeTab === 'my-listings' || pathname.startsWith('/alliance/listings')
  const isReferrals = activeTab === 'referrals' || pathname.startsWith('/alliance/referrals')
  const isCommissions = activeTab === 'commissions' || pathname.startsWith('/alliance/commissions')

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}
    >
      <Link
        href="/alliance/discover"
        className="btn btn--text"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: isDiscover ? 700 : 500,
          color: isDiscover ? 'var(--forest)' : 'var(--text-secondary)',
          borderBottom: isDiscover ? '2px solid var(--forest)' : '2px solid transparent',
          borderRadius: 0,
          textDecoration: 'none',
        }}
      >
        <Compass size={18} />
        Discover Network
      </Link>

      <Link
        href="/alliance/listings"
        className="btn btn--text"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: isMyListings ? 700 : 500,
          color: isMyListings ? 'var(--forest)' : 'var(--text-secondary)',
          borderBottom: isMyListings ? '2px solid var(--forest)' : '2px solid transparent',
          borderRadius: 0,
          textDecoration: 'none',
        }}
      >
        <List size={18} />
        My Listings
      </Link>

      <Link
        href="/alliance/referrals"
        className="btn btn--text"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: isReferrals ? 700 : 500,
          color: isReferrals ? 'var(--forest)' : 'var(--text-secondary)',
          borderBottom: isReferrals ? '2px solid var(--forest)' : '2px solid transparent',
          borderRadius: 0,
          textDecoration: 'none',
        }}
      >
        <Users size={18} />
        My Referrals & Leads
      </Link>

      <Link
        href="/alliance/commissions"
        className="btn btn--text"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          fontSize: '14px',
          fontWeight: isCommissions ? 700 : 500,
          color: isCommissions ? 'var(--forest)' : 'var(--text-secondary)',
          borderBottom: isCommissions ? '2px solid var(--forest)' : '2px solid transparent',
          borderRadius: 0,
          textDecoration: 'none',
        }}
      >
        <DollarSign size={18} />
        Commissions
      </Link>
    </div>
  )
}
