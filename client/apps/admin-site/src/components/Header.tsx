import React from 'react'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  adminEmail: string
  adminRole: string
  onLogout: () => void
}

const Header: React.FC<HeaderProps> = ({ adminEmail, adminRole, onLogout }) => {
  return (
    <header
      className="glass"
      style={{
        height: 'var(--header-height)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            background: 'var(--accent-faint)',
            borderRadius: '10px',
            border: '1px solid var(--accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src="/favicon.svg" alt="Upward" style={{ width: '70%', height: '70%' }} />
        </div>
        <div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              margin: 0,
              background: 'linear-gradient(135deg, #111827 0%, #d97757 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            UPWARD{' '}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                WebkitTextFillColor: 'initial',
              }}
            >
              By GoodTenants
            </span>
          </h1>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            lineHeight: 1.2,
          }}
        >
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{adminEmail}</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {adminRole}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onLogout}
            className="icon-btn"
            style={{
              background: 'var(--accent-faint)',
              border: '1px solid var(--accent-muted)',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
