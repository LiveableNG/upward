import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmailComposer from './pages/EmailComposer'
import Sessions from './pages/Sessions'
import DropOffAnalysis from './pages/DropOffAnalysis'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import ChangePassword from './components/ChangePassword'
import './App.css'

interface User {
  id: string
  email: string
  role: string
  mustChangePassword: boolean
}

function App() {
  const [auth, setAuth] = useState<{ token: string; user: User } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const userStr = localStorage.getItem('admin_user')
    if (token && userStr) {
      try {
        setAuth({ token, user: JSON.parse(userStr) })
      } catch {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_user')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (token: string, user: User) => {
    setAuth({ token, user })
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))
  }

  const handleLogout = () => {
    setAuth(null)
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  if (loading) return null

  if (!auth) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      {auth.user.mustChangePassword && (
        <ChangePassword
          token={auth.token}
          onSuccess={(updatedUser) => setAuth({ ...auth, user: updatedUser })}
        />
      )}
      <Layout adminEmail={auth.user.email} adminRole={auth.user.role} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard token={auth.token} />} />
          <Route path="/emails" element={<EmailComposer token={auth.token} />} />
          <Route path="/sessions" element={<Sessions token={auth.token} />} />
          <Route path="/drop-off" element={<DropOffAnalysis token={auth.token} />} />
          {auth.user.role === 'SUPERADMIN' && (
            <Route
              path="/settings"
              element={<Settings token={auth.token} currentAdminId={auth.user.id} />}
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
