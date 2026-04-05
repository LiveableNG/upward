import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Mail,
  Calendar,
  Settings,
  BarChart3,
  FlaskConical,
  FileText,
  ShieldCheck,
  CalendarClock,
  History,
  Megaphone,
} from 'lucide-react'

interface SidebarProps {
  isSuperadmin: boolean
  isMobileOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isSuperadmin, isMobileOpen, onClose }) => {
  const [isHovered, setIsHovered] = useState(false)

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Drop-off Analysis', path: '/drop-off', icon: BarChart3 },
    { name: 'A/B Test Stats', path: '/ab-stats', icon: FlaskConical },
    { name: 'Emailing', path: '/emails', icon: Mail },
    { name: 'Campaigns', path: '/campaigns', icon: CalendarClock },
    { name: 'Sessions', path: '/sessions', icon: Calendar },
    { name: 'Announcements', path: '/announcements', icon: Megaphone },
    { name: 'Email Logs', path: '/email-logs', icon: History },
    { name: 'Fairness Stories', path: '/stories', icon: ShieldCheck },
  ]

  if (isSuperadmin) {
    navItems.push({ name: 'System Logs', path: '/logs', icon: FileText })
    navItems.push({ name: 'Settings', path: '/settings', icon: Settings })
  }

  const isExpanded = isHovered || isMobileOpen

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isExpanded ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed-width)',
        height: 'calc(100vh - var(--header-height))',
        backgroundColor: 'var(--white)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'var(--transition)',
        position: 'fixed',
        top: 'var(--header-height)',
        left: 0,
        zIndex: 1001,
        overflow: 'hidden',
        transform: isMobileOpen
          ? 'translateX(0)'
          : window.innerWidth <= 768
            ? 'translateX(-100%)'
            : 'translateX(0)',
      }}
      className="sidebar-responsive"
    >
      <nav
        style={{
          flex: 1,
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (window.innerWidth <= 768) onClose()
            }}
            className={({ isActive }) => (isActive ? 'nav-active' : 'nav-inactive')}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: isExpanded ? 'flex-start' : 'center',
              gap: isExpanded ? '12px' : '0',
              padding: '12px',
              borderRadius: '12px',
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              backgroundColor: isActive ? 'var(--accent-faint)' : 'transparent',
              transition: 'var(--transition)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            })}
          >
            <item.icon size={22} style={{ flexShrink: 0 }} />
            {isExpanded && <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (min-width: 769px) {
          .sidebar-responsive {
            position: sticky !important;
            transform: none !important;
          }
        }
      `}</style>
    </aside>
  )
}

export default Sidebar
