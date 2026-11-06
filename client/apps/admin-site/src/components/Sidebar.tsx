import React, { useState, useEffect, useMemo } from 'react'
import { NavLink, useLocation, Link } from 'react-router-dom'
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
  MapPin,
  MousePointer,
  Sparkles,
  Inbox,
  Download,
  FlaskConical,
  Target,
  ShoppingBag,
  BarChart3,
  TrendingDown,
  GraduationCap,
  Lock,
  ChevronDown,
  ArrowLeft,
  Truck,
  ShieldAlert,
} from 'lucide-react'

interface SidebarProps {
  isSuperadmin: boolean
  isMobileOpen: boolean
  onClose: () => void
}

interface NavItem {
  name: string
  path: string
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>
}

interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

const isProd =
  import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.MODE === 'production'
const showSandboxTools = import.meta.env.VITE_SHOW_SANDBOX_TOOLS === 'true' || !isProd
const COLLAPSED_STORAGE_KEY = 'upward_admin_collapsed_nav_sections'

const Sidebar: React.FC<SidebarProps> = ({ isSuperadmin, isMobileOpen, onClose }) => {
  const location = useLocation()
  const [isHovered, setIsHovered] = useState(false)
  const isExpanded = isHovered || isMobileOpen

  // Section collapse state with localStorage persistence
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      // ignore
    }
    return {}
  })

  const isCommerceWorkspace = location.pathname.startsWith('/commerce')

  // ── Construct Structured Nav Sections ──────────────────────────
  const sections: NavSection[] = useMemo(() => {
    if (isCommerceWorkspace) {
      return [
        {
          id: 'commerce-catalog',
          title: 'Catalog & Merchandising',
          items: [
            { name: 'Overview', path: '/commerce', icon: LayoutDashboard },
            { name: 'Goals Catalog', path: '/commerce/goals', icon: Target },
            { name: 'Categories', path: '/commerce/categories', icon: Sparkles },
            { name: 'Offerings & Bundles', path: '/commerce/offerings', icon: ShoppingBag },
            { name: 'Vendors & Partners', path: '/commerce/vendors', icon: Landmark },
          ],
        },
        {
          id: 'commerce-ops',
          title: 'Fulfilment & Operations',
          items: [
            { name: 'Orders & Fulfilment', path: '/commerce/orders', icon: Truck },
            { name: 'Inquiries & Disputes', path: '/commerce/disputes', icon: ShieldAlert },
          ],
        },
      ]
    }

    const list: NavSection[] = []

    // 1. Overview
    list.push({
      id: 'overview',
      title: 'Overview',
      items: [{ name: 'Dashboard', path: '/', icon: LayoutDashboard }],
    })

    // 2. Product & Telemetry
    list.push({
      id: 'product',
      title: 'Product',
      items: [
        { name: 'App Releases', path: '/app-releases', icon: Download },
        { name: 'App Telemetry', path: '/app-activity', icon: Smartphone },
      ],
    })

    // 3. Operations
    const opsItems: NavItem[] = [
      { name: 'Settlements & Payouts', path: '/settlements', icon: Landmark },
      { name: 'Requests Hub', path: '/requests', icon: Inbox },
      { name: 'Verifications', path: '/verifications', icon: ShieldCheck },
      { name: 'Upward Academy', path: '/university-early-access', icon: GraduationCap },
      { name: 'Bulk Import Queue', path: '/bulk-imports', icon: FileText },
      { name: 'Area Price Guide', path: '/area-price-guide', icon: MapPin },
    ]
    if (showSandboxTools) {
      opsItems.push({ name: 'Fee Overrides', path: '/overrides', icon: SlidersHorizontal })
      opsItems.push({ name: 'Fairness Stories', path: '/stories', icon: ShieldCheck })
    }
    list.push({
      id: 'operations',
      title: 'Operations',
      items: opsItems,
    })

    // 4. Lifestyle & Commerce Workspace
    list.push({
      id: 'lifestyle-commerce',
      title: 'Commerce',
      items: [
        { name: 'Commerce & Lifestyle', path: '/commerce', icon: ShoppingBag },
      ],
    })

    // 5. Growth & Marketing
    const growthItems: NavItem[] = [
      { name: 'Email Composer', path: '/emails', icon: Mail },
    ]
    if (showSandboxTools) {
      growthItems.push({ name: 'Waitlist Campaigns', path: '/campaigns', icon: CalendarClock })
    }
    growthItems.push(
      { name: 'Email Sequences', path: '/email-sequences', icon: Mail },
      { name: 'WhatsApp Sequences', path: '/whatsapp-sequences', icon: Megaphone },
      { name: 'Announcements', path: '/announcements', icon: Megaphone },
      { name: 'Blog Posts', path: '/blog', icon: FileText },
      { name: 'Email Click Tracking', path: '/email-tracking', icon: MousePointer },
    )
    list.push({
      id: 'growth-marketing',
      title: 'Growth & Marketing',
      items: growthItems,
    })

    // 6. Support & Retention
    list.push({
      id: 'support',
      title: 'Support & Retention',
      items: [
        { name: 'Support Tickets', path: '/support', icon: LifeBuoy },
        { name: 'Communication Logs', path: '/email-logs', icon: History },
        { name: 'Invitation Tracker', path: '/invitation-tracker', icon: Activity },
        { name: 'Drop-off Analysis', path: '/drop-off', icon: TrendingDown },
      ],
    })

    // 7. Developer & Security
    const devItems: NavItem[] = [
      { name: 'Rental Onboarding A/B', path: '/experiments/rental-onboarding', icon: FlaskConical },
      { name: 'A/B Test Stats', path: '/ab-stats', icon: BarChart3 },
    ]
    if (showSandboxTools) {
      devItems.push({ name: 'Demo Bank Simulator', path: '/demo-bank', icon: Landmark })
    }
    if (isSuperadmin) {
      devItems.push({ name: 'User Feedback', path: '/feedback', icon: MessageSquare })
      if (showSandboxTools) {
        devItems.push({ name: 'Dev Email Sandbox', path: '/dev-emails', icon: Mail })
        devItems.push({ name: 'Dev Document AI Sandbox', path: '/dev-document-ai', icon: Sparkles })
      }
      devItems.push(
        { name: 'Webhook Logs', path: '/webhooks', icon: Webhook },
        { name: 'System Logs', path: '/logs', icon: FileText },
        { name: 'Internal Accounts', path: '/internal-accounts', icon: Lock },
      )
    }
    if (devItems.length > 0) {
      list.push({
        id: 'developer-security',
        title: 'Developer & Security',
        items: devItems,
      })
    }

    // 8. Administration
    if (isSuperadmin) {
      list.push({
        id: 'administration',
        title: 'Administration',
        items: [{ name: 'Settings', path: '/settings', icon: Settings }],
      })
    }

    return list
  }, [isSuperadmin, isCommerceWorkspace])

  // ── Auto-expand section containing current active path ─────────
  useEffect(() => {
    const currentPath = location.pathname
    const matchedSection = sections.find((sec) =>
      sec.items.some((item) => {
        if (item.path === '/') {
          return currentPath === '/' || currentPath === '/dashboard'
        }
        return currentPath === item.path || currentPath.startsWith(item.path + '/')
      }),
    )

    if (matchedSection && collapsedSections[matchedSection.id]) {
      setCollapsedSections((prev) => {
        const next = { ...prev, [matchedSection.id]: false }
        try {
          localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next))
        } catch {
          // ignore
        }
        return next
      })
    }
  }, [location.pathname, sections, collapsedSections])

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] }
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
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
        transform: isMobileOpen
          ? 'translateX(0)'
          : window.innerWidth <= 768
            ? 'translateX(-100%)'
            : 'translateX(0)',
      }}
      className="sidebar sidebar-responsive"
      aria-label="Admin Navigation"
    >
      <nav className="sidebar__nav">
        {isCommerceWorkspace && (
          <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <Link
              to="/dashboard"
              className="sidebar__link"
              style={{
                background: 'var(--surface-hover)',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: 12.5,
                padding: isExpanded ? '8px 12px' : '8px 0',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                textDecoration: 'none',
              }}
              title="Return to Main Admin Dashboard"
            >
              <ArrowLeft size={16} style={{ flexShrink: 0, color: 'var(--accent)' }} />
              {isExpanded && <span style={{ marginLeft: 6 }}>Exit to Main Admin</span>}
            </Link>
          </div>
        )}
        {sections.map((section, idx) => {
          const isSectionCollapsed = Boolean(collapsedSections[section.id])
          return (
            <div key={section.id} className="sidebar__section">
              {/* Header / Divider */}
              {isExpanded ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="sidebar__section-toggle"
                  aria-expanded={!isSectionCollapsed}
                  title={isSectionCollapsed ? `Expand ${section.title}` : `Collapse ${section.title}`}
                >
                  <span className="sidebar__section-title">
                    {section.title}
                    <span className="sidebar__section-count">({section.items.length})</span>
                  </span>
                  <ChevronDown
                    size={13}
                    style={{
                      color: 'var(--text-muted)',
                      transform: isSectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      flexShrink: 0,
                    }}
                  />
                </button>
              ) : (
                idx > 0 && <hr className="sidebar__divider" />
              )}

              {/* Items List */}
              {(!isSectionCollapsed || !isExpanded) && (
                <div className="sidebar__items-list">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      title={item.name}
                      onClick={() => {
                        if (window.innerWidth <= 768) onClose()
                      }}
                      className={({ isActive }) => {
                        const effectiveActive =
                          item.path === '/'
                            ? location.pathname === '/' || location.pathname === '/dashboard'
                            : item.path === '/commerce'
                              ? location.pathname === '/commerce' || location.pathname === '/commerce/' || location.pathname === '/commerce/overview'
                              : isActive || location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                        return effectiveActive
                          ? `sidebar__link sidebar__link--active ${!isExpanded ? 'sidebar__link--collapsed' : ''}`
                          : `sidebar__link ${!isExpanded ? 'sidebar__link--collapsed' : ''}`
                      }}
                    >
                      <item.icon size={20} style={{ flexShrink: 0 }} />
                      {isExpanded && <span className="sidebar__link-text">{item.name}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <style>{`
        .sidebar {
          background-color: var(--white);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          will-change: width;
          contain: layout paint;
          position: fixed;
          left: 0;
          z-index: 1001;
          overflow: hidden;
        }

        .sidebar__nav {
          flex: 1;
          padding: 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sidebar__section {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar__section-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 6px 10px;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          transition: var(--transition);
        }

        .sidebar__section-toggle:hover {
          background-color: var(--surface-hover);
        }

        .sidebar__section-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .sidebar__section-count {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-muted);
          opacity: 0.7;
        }

        .sidebar__items-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
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
          padding: 9px 12px;
          border-radius: 8px;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 13.5px;
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
