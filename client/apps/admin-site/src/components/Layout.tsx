import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: React.ReactNode
  adminEmail: string
  adminRole: string
  onLogout: () => void
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
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
