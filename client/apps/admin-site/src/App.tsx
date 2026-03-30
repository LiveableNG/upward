import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmailComposer from './pages/EmailComposer'
import Sessions from './pages/Sessions'
import DropOffAnalysis from './pages/DropOffAnalysis'
import Settings from './pages/Settings'
import ABTestStats from './pages/ABTestStats'
import Logs from './pages/Logs'
import FairnessStories from './pages/FairnessStories'
import WaitlistCampaigns from './pages/WaitlistCampaigns'
import Layout from './components/Layout'
import ChangePassword from './components/ChangePassword'
import './App.css'

function AppRoutes() {
  const { auth, loading, logout, setAuth } = useAuth()

  if (loading) return null

  if (!auth) {
    return <Login />
  }

  return (
    <BrowserRouter>
      {auth.user.mustChangePassword && (
        <ChangePassword
          token={auth.token}
          onSuccess={(updatedUser) => setAuth({ ...auth, user: updatedUser })}
        />
      )}
      <Layout adminEmail={auth.user.email} adminRole={auth.user.role} onLogout={logout}>
        <Routes>
          <Route path="/" element={<Dashboard token={auth.token} adminRole={auth.user.role} />} />
          <Route path="/emails" element={<EmailComposer token={auth.token} />} />
          <Route path="/sessions" element={<Sessions token={auth.token} />} />
          <Route path="/drop-off" element={<DropOffAnalysis token={auth.token} />} />
          <Route path="/ab-stats" element={<ABTestStats token={auth.token} />} />
          <Route
            path="/stories"
            element={<FairnessStories token={auth.token} adminRole={auth.user.role} />}
          />
          <Route path="/campaigns" element={<WaitlistCampaigns token={auth.token} />} />
          {auth.user.role === 'SUPERADMIN' && (
            <>
              <Route
                path="/settings"
                element={<Settings token={auth.token} currentAdminId={auth.user.id} />}
              />
              <Route path="/logs" element={<Logs token={auth.token} />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
