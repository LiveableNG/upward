import { NavLink } from 'react-router-dom'
import { Mail, Calendar, LogOut, LayoutDashboard } from 'lucide-react'

interface SidebarProps {
  onLogout: () => void
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Waitlist' },
    { to: '/emails', icon: Mail, label: 'Emails' },
    { to: '/sessions', icon: Calendar, label: 'Sessions' },
  ]

  return (
    <aside
      style={{
        width: '260px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 20px',
      }}
    >
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '20px', color: 'var(--accent)', letterSpacing: '0.1em' }}>
          UPWARD ADMIN
        </h1>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              background: isActive ? 'rgba(217, 119, 87, 0.1)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--muted)',
              transition: 'all 0.2s',
            })}
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onLogout}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          color: 'var(--muted)',
          fontSize: '14px',
          marginTop: 'auto',
          borderRadius: '12px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ef4444'
          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--muted)'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <LogOut size={20} />
        Log Out
      </button>
    </aside>
  )
}
