import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Mail,
  Settings,
  FileText,
  ShieldCheck,
  CalendarClock,
  History,
  Megaphone,
  LifeBuoy,
  Webhook,
  Smartphone,
  Landmark,
  MessageSquare,
  SlidersHorizontal,
  Activity,
} from 'lucide-react'

interface SidebarProps {
  isSuperadmin: boolean
  isMobileOpen: boolean
  onClose: () => void
}

interface NavItem {
  name: string
  path: string
  icon: React.ComponentType<any>
}

interface NavSection {
  title: string
  items: NavItem[]
}

const isProd = import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.MODE === 'production'
const showSandboxTools = import.meta.env.VITE_SHOW_SANDBOX_TOOLS === 'true' || !isProd

const Sidebar: React.FC<SidebarProps> = ({ isSuperadmin, isMobileOpen, onClose }) => {
  const [isHovered, setIsHovered] = useState(false)
  const isExpanded = isHovered || isMobileOpen

  // Construct Grouped Sections
  const sections: NavSection[] = []

  // 1. Overview
  const overviewItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  ]
  if (showSandboxTools) {
    overviewItems.push({ name: 'Campaigns', path: '/campaigns', icon: CalendarClock })
    overviewItems.push({ name: 'Fee Overrides', path: '/overrides', icon: SlidersHorizontal })
  }
  sections.push({
    title: 'Overview',
    items: overviewItems,
  })

  // 2. Operations & Support
  const opsItems: NavItem[] = [
    { name: 'Support Tickets', path: '/support', icon: LifeBuoy },
    { name: 'Verifications', path: '/verifications', icon: ShieldCheck },
  ]
  if (showSandboxTools) {
    opsItems.push({ name: 'Fairness Stories', path: '/stories', icon: ShieldCheck })
  }
  sections.push({
    title: 'Ops & Support',
    items: opsItems,
  })

  // 3. Communications
  sections.push({
    title: 'Communications',
    items: [
      { name: 'Emailing', path: '/emails', icon: Mail },
      { name: 'Announcements', path: '/announcements', icon: Megaphone },
      { name: 'Blog', path: '/blog', icon: FileText },
      { name: 'Communication Logs', path: '/email-logs', icon: History },
      { name: 'Invitation Tracker', path: '/invitation-tracker', icon: Activity },
    ],
  })

  // 4. Developer & Security
  const devItems: NavItem[] = []
  if (showSandboxTools) {
    devItems.push({ name: 'Demo Bank Simulator', path: '/demo-bank', icon: Landmark })
  }
  if (isSuperadmin) {
    if (showSandboxTools) {
      devItems.push({ name: 'App Activity Logs', path: '/app-activity', icon: Smartphone })
    }
    devItems.push({ name: 'User Feedback', path: '/feedback', icon: MessageSquare })
    if (showSandboxTools) {
      devItems.push({ name: 'Dev Email Sandbox', path: '/dev-emails', icon: Mail })
    }
    devItems.push({ name: 'Webhook Logs', path: '/webhooks', icon: Webhook })
    devItems.push({ name: 'System Logs', path: '/logs', icon: FileText })
  }
  if (devItems.length > 0) {
    sections.push({
      title: 'Dev & Security',
      items: devItems,
    })
  }

  // 5. Administration
  if (isSuperadmin) {
    sections.push({
      title: 'Administration',
      items: [{ name: 'Settings', path: '/settings', icon: Settings }],
    })
  }

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isExpanded ? 'var(--sidebar-width)' : 'var(--sidebar-collapsed-width)',
        height: 'calc(100vh - var(--header-height))',
        top: 'var(--header-height)',
        // GPU-accelerated mobile overlay; no transform needed on desktop (sticky layout)
        transform: isMobileOpen
          ? 'translateX(0)'
          : window.innerWidth <= 768
            ? 'translateX(-100%)'
            : 'translateX(0)',
      }}
      className="sidebar sidebar-responsive"
    >
      <nav className="sidebar__nav">
        {sections.map((section, idx) => (
          <div key={section.title} className="sidebar__section">
            {/* Show section header only when expanded, otherwise show a separator line (except for the first item) */}
            {isExpanded ? (
              <div className="sidebar__section-title">{section.title}</div>
            ) : (
              idx > 0 && <hr className="sidebar__divider" />
            )}

            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth <= 768) onClose()
                }}
                className={({ isActive }) =>
                  isActive
                    ? `sidebar__link sidebar__link--active ${!isExpanded ? 'sidebar__link--collapsed' : ''}`
                    : `sidebar__link ${!isExpanded ? 'sidebar__link--collapsed' : ''}`
                }
              >
                <item.icon size={20} style={{ flexShrink: 0 }} />
                {isExpanded && <span className="sidebar__link-text">{item.name}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <style>{`
        .sidebar {
          background-color: var(--white);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          /* Scope transition to only width + transform — avoids full style recalc */
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          /* Promote to its own compositor layer — changes won't reflow surrounding content */
          will-change: width;
          /* Prevent sidebar changes from invalidating surrounding layout/paint */
          contain: layout paint;
          position: fixed;
          left: 0;
          z-index: 1001;
          overflow: hidden;
        }

        .sidebar__nav {
          flex: 1;
          padding: 20px 12px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar__section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar__section-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0 12px;
          margin-bottom: 6px;
          opacity: 0.8;
        }

        .sidebar__divider {
          border: none;
          border-top: 1px solid var(--border);
          margin: 6px 8px;
        }

        .sidebar__link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 14px;
          transition: var(--transition);
          white-space: nowrap;
          overflow: hidden;
          text-decoration: none;
        }

        .sidebar__link:hover {
          color: var(--text);
          background-color: var(--surface-hover);
        }

        .sidebar__link--active {
          color: var(--accent) !important;
          background-color: var(--accent-faint) !important;
          font-weight: 600;
        }

        .sidebar__link--collapsed {
          justify-content: center;
          gap: 0;
          padding: 10px 0;
        }

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
