'use client'

import { BarChart3, Trophy, Bell, FileText, Zap, ShieldCheck } from 'lucide-react'

const benefits = [
  { icon: <BarChart3 size={14} />, label: 'Track all receipts' },
  { icon: <Trophy size={14} />, label: 'Build rent credit' },
  { icon: <Bell size={14} />, label: 'Payment reminders' },
  { icon: <FileText size={14} />, label: 'Contracts saved' },
  { icon: <Zap size={14} />, label: 'One-tap payments' },
  { icon: <ShieldCheck size={14} />, label: 'Verified history' },
]

export default function BenefitChips({ variant = 'scroll' }: { variant?: 'scroll' | 'grid' }) {
  if (variant === 'grid') {
    return (
      <div className="benefit-chips benefit-chips--grid">
        {benefits.map((b) => (
          <div key={b.label} className="benefit-chip">
            <span className="benefit-chip__icon">{b.icon}</span>
            <span className="benefit-chip__label">{b.label}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="benefit-chips benefit-chips--scroll">
      <div className="benefit-chips__track">
        {benefits.map((b) => (
          <div key={b.label} className="benefit-chip">
            <span className="benefit-chip__icon">{b.icon}</span>
            <span className="benefit-chip__label">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
