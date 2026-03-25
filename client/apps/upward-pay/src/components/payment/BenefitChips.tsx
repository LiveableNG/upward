'use client'

const benefits = [
  { icon: '📊', label: 'Track all receipts' },
  { icon: '🏆', label: 'Build rent credit' },
  { icon: '🔔', label: 'Payment reminders' },
  { icon: '📄', label: 'Contracts saved' },
  { icon: '⚡', label: 'One-tap payments' },
  { icon: '🛡️', label: 'Verified history' },
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
