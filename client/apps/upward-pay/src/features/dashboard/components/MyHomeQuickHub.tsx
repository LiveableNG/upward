'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { UserCheck, Receipt, Wrench, FileText } from 'lucide-react'

export function MyHomeQuickHub() {
  const router = useRouter()

  const tiles = [
    {
      id: 'visitors',
      icon: <UserCheck size={18} color="var(--skin-primary, #c2501f)" />,
      iconBg: 'var(--shell-tint, #fbede5)',
      title: 'Visitor Pass',
      desc: 'Gate access code',
      href: '/dashboard/my-home?tab=visitors',
    },
    {
      id: 'bills',
      icon: <Receipt size={18} color="#2563eb" />,
      iconBg: 'rgba(37, 99, 235, 0.08)',
      title: 'Estate Bills',
      desc: 'Service charge & power',
      href: '/dashboard/my-home?tab=bills',
    },
    {
      id: 'repairs',
      icon: <Wrench size={18} color="#d97706" />,
      iconBg: 'rgba(217, 119, 6, 0.08)',
      title: 'Maintenance',
      desc: 'Report repair ticket',
      href: '/dashboard/my-home?tab=complaints',
    },
    {
      id: 'documents',
      icon: <FileText size={18} color="#16a34a" />,
      iconBg: 'rgba(22, 163, 74, 0.08)',
      title: 'Tenancy Records',
      desc: 'Lease & digital receipts',
      href: '/dashboard/receipts',
    },
  ]

  return (
    <div className="myhome-hub">
      <div className="dash-home__section-head" style={{ marginBottom: 10 }}>
        <h2 className="dash-home__section-title">My Home Operations</h2>
        <button
          type="button"
          className="dash-home__section-link"
          onClick={() => router.push('/dashboard/my-home')}
        >
          Open Hub →
        </button>
      </div>

      <div className="myhome-hub__grid">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="myhome-tile"
            onClick={() => router.push(tile.href)}
          >
            <div className="myhome-tile__icon" style={{ background: tile.iconBg }}>
              {tile.icon}
            </div>
            <div className="myhome-tile__body">
              <span className="myhome-tile__title">{tile.title}</span>
              <span className="myhome-tile__desc">{tile.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
