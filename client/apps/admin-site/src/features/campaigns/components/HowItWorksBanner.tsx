import React from 'react'
import { Clock, Calendar, UserPlus } from 'lucide-react'

const HOW_IT_WORKS = [
  {
    icon: <Clock size={18} color="#d97757" />,
    title: 'Every Tuesday 19:00 WAT',
    desc: 'Cron job runs automatically — no manual action needed.',
  },
  {
    icon: <Calendar size={18} color="#d97757" />,
    title: 'Week-based targeting',
    desc: 'Users in their 1st week get Week 1 content. 2nd week users get Week 2, etc.',
  },
  {
    icon: <UserPlus size={18} color="#d97757" />,
    title: 'Current users → Week 1',
    desc: 'All existing registered users are treated as enrolled "this week" until next Tuesday.',
  },
]

export const HowItWorksBanner: React.FC = () => {
  return (
    <div
      style={{
        marginBottom: '28px',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(217,119,87,0.08), rgba(217,119,87,0.04))',
        border: '1px solid rgba(217,119,87,0.2)',
        borderRadius: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
      }}
      className="grid-mobile-1"
    >
      {HOW_IT_WORKS.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(217,119,87,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {item.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
              {item.title}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {item.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
