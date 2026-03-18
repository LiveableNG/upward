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
  const isSuperadmin = adminRole === 'SUPERADMIN'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header adminEmail={adminEmail} adminRole={adminRole} onLogout={onLogout} />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar isSuperadmin={isSuperadmin} />
        <main
          className="main-content fade-in"
          style={{ flex: 1, overflowY: 'auto', height: 'calc(100vh - var(--header-height))' }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
