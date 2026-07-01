import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
  adminEmail: string
  adminRole: string
  onLogout: () => void
}

const pathMetadata: Record<string, { name: string; category?: string }> = {
  '/dashboard': { name: 'Dashboard' },
  '/emails': { name: 'Email Composer', category: 'Communications' },
  '/email-logs': { name: 'Email Logs', category: 'Communications' },
  '/campaigns': { name: 'Campaigns', category: 'Overview' },
  '/announcements': { name: 'Announcements', category: 'Communications' },
  '/support': { name: 'Support Tickets', category: 'Operations & Support' },
  '/verifications': { name: 'Verifications', category: 'Operations & Support' },
  '/stories': { name: 'Fairness Stories', category: 'Operations & Support' },
  '/demo-bank': { name: 'Demo Bank Simulator', category: 'Developer & Security' },
  '/app-activity': { name: 'App Activity Logs', category: 'Developer & Security' },
  '/feedback': { name: 'User Feedback', category: 'Developer & Security' },
  '/dev-emails': { name: 'Dev Email Sandbox', category: 'Developer & Security' },
  '/webhooks': { name: 'Webhook Logs', category: 'Developer & Security' },
  '/logs': { name: 'System Logs', category: 'Developer & Security' },
  '/settings': { name: 'Settings', category: 'Administration' },
}

const Breadcrumbs: React.FC = () => {
  const location = useLocation()
  const path = location.pathname

  if (path === '/login') return null

  let info = pathMetadata[path]
  if (!info) {
    if (path.startsWith('/users/')) {
      info = { name: 'User Profile Details', category: 'Overview' }
    } else if (path.startsWith('/pms/')) {
      info = { name: 'Property Manager Details', category: 'Overview' }
    } else {
      info = {
        name: path
          .split('/')
          .filter(Boolean)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(' '),
      }
    }
  }

  return (
    <div className="breadcrumbs-wrapper">
      <nav className="breadcrumbs" aria-label="breadcrumb">
        <Link to="/dashboard">
          <Home size={14} />
          <span>Home</span>
        </Link>
        <span className="breadcrumbs-separator">
          <ChevronRight size={14} />
        </span>
        {info.category && (
          <>
            <span className="breadcrumbs-category">{info.category}</span>
            <span className="breadcrumbs-separator">
              <ChevronRight size={14} />
            </span>
          </>
        )}
        {path !== '/dashboard' && path !== '/' ? (
          <span className="breadcrumbs-current">{info.name}</span>
        ) : (
          <span className="breadcrumbs-current">Overview</span>
        )}
      </nav>
    </div>
  )
}

const Layout: React.FC<LayoutProps> = ({ children, adminEmail, adminRole, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  const isSuperadmin = adminRole === 'SUPERADMIN'

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}
    >
      <Header
        adminEmail={adminEmail}
        adminRole={adminRole}
        onLogout={onLogout}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        <Sidebar
          isSuperadmin={isSuperadmin}
          isMobileOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="mobile-only"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
            }}
          />
        )}
        <main
          className="main-content fade-in"
          style={{
            flex: 1,
            overflowY: 'auto',
            height: 'calc(100vh - var(--header-height))',
            width: '100%',
          }}
        >
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
