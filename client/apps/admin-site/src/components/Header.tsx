import React from 'react'
import { LogOut, Menu, X } from 'lucide-react'

interface HeaderProps {
  adminEmail: string
  adminRole: string
  onLogout: () => void
  onToggleMobileMenu: () => void
  isMobileMenuOpen: boolean
}

const Header: React.FC<HeaderProps> = ({
  adminEmail,
  adminRole,
  onLogout,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) => {
  const avatarLetter = adminEmail ? adminEmail.charAt(0).toUpperCase() : 'A'

  return (
    <header
      className="glass"
      style={{
        height: 'var(--header-height)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '1px solid var(--border)',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onToggleMobileMenu}
          className="mobile-only"
          style={{
            background: 'none',
            border: 'none',
            padding: '8px',
            color: 'var(--text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--accent-faint)',
            borderRadius: '8px',
            border: '1px solid var(--accent-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img src="/favicon.svg" alt="Upward" style={{ width: '65%', height: '65%' }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1
            style={{
              fontSize: '16px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              margin: 0,
              background: 'linear-gradient(135deg, var(--text) 0%, var(--accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            UPWARD
          </h1>
          <span
            className="desktop-only"
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              backgroundColor: 'var(--surface-hover)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid var(--border)',
            }}
          >
            Admin Console
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* User Identity Info */}
        <div
          className="desktop-only"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            borderRight: '1px solid var(--border)',
            paddingRight: '16px',
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface-hover)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {avatarLetter}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              lineHeight: 1.3,
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              {adminEmail}
            </span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: adminRole === 'SUPERADMIN' ? 'rgba(99, 102, 241, 0.08)' : 'var(--accent-faint)',
                color: adminRole === 'SUPERADMIN' ? '#6366f1' : 'var(--accent)',
                border: `1px solid ${adminRole === 'SUPERADMIN' ? 'rgba(99, 102, 241, 0.15)' : 'var(--accent-muted)'}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: '2px',
              }}
            >
              {adminRole}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex' }}>
          <button
            onClick={onLogout}
            className="icon-btn"
            title="Logout"
            style={{
              background: 'var(--surface-hover)',
              border: '1px solid var(--border)',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              transition: 'var(--transition)',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
