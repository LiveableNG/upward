import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ConfirmProvider } from './components/common'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmailComposer from './pages/EmailComposer'
import DropOffAnalysis from './pages/DropOffAnalysis'
import Settings from './pages/Settings'
import ABTestStats from './pages/ABTestStats'
import Logs from './pages/Logs'
import AppActivity from './pages/AppActivity'
import Feedback from './pages/Feedback'
import DevEmails from './pages/DevEmails'
import FairnessStories from './pages/FairnessStories'
import WaitlistCampaigns from './pages/WaitlistCampaigns'
import EmailLogs from './pages/EmailLogs'
import Announcements from './pages/Announcements'
import SupportTickets from './pages/SupportTickets'
import Verifications from './pages/Verifications'
import Webhooks from './pages/Webhooks'
import DemoBank from './pages/DemoBank'
import UserDetail from './pages/UserDetail'
import PmDetail from './pages/PmDetail'
import Layout from './components/Layout'
import OverridesPage from './pages/Overrides'
import BlogPosts from './pages/BlogPosts'
import InternalAccounts from './pages/InternalAccounts'
import InvitationTracker from './pages/InvitationTracker'
import WhatsappSequences from './pages/WhatsappSequences'
import EmailSequences from './pages/EmailSequences'
import { SequenceQueue } from './pages/SequenceQueue'
import { BulkImportQueue } from './pages/BulkImportQueue'
import { BulkImportDetail } from './pages/BulkImportDetail'

import ChangePassword from './components/ChangePassword'
import './App.css'
const isProd =
  import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.MODE === 'production'
const showSandboxTools = import.meta.env.VITE_SHOW_SANDBOX_TOOLS === 'true' || !isProd

function AppRoutes() {
  const { auth, loading, logout, setAuth } = useAuth()

  React.useEffect(() => {
    if (auth?.user?.role === 'DEVELOPER') {
      document.body.dataset.theme = 'developer'
    } else {
      delete document.body.dataset.theme
    }
  }, [auth?.user?.role])

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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={<Dashboard token={auth.token} adminRole={auth.user.role} />}
          />
          <Route
            path="/overrides"
            element={<OverridesPage token={auth.token} adminRole={auth.user.role} />}
          />
          <Route path="/metrics" element={<Navigate to="/dashboard" replace />} />
          <Route path="/users/:uuid" element={<UserDetail token={auth.token} />} />
          <Route path="/pms/:uuid" element={<PmDetail token={auth.token} />} />
          <Route
            path="/emails"
            element={<EmailComposer token={auth.token} adminEmail={auth.user.email} />}
          />
          <Route path="/email-logs" element={<EmailLogs token={auth.token} />} />
          <Route path="/invitation-tracker" element={<InvitationTracker token={auth.token} />} />
          <Route path="/sessions" element={<Navigate to="/" replace />} />
          <Route path="/drop-off" element={<DropOffAnalysis token={auth.token} />} />
          <Route path="/ab-stats" element={<ABTestStats token={auth.token} />} />
          <Route
            path="/stories"
            element={<FairnessStories token={auth.token} adminRole={auth.user.role} />}
          />
          <Route path="/campaigns" element={<WaitlistCampaigns token={auth.token} />} />
          <Route path="/announcements" element={<Announcements token={auth.token} />} />
          <Route path="/blog" element={<BlogPosts token={auth.token} />} />
          <Route path="/whatsapp-sequences" element={<WhatsappSequences token={auth.token} />} />
          <Route path="/email-sequences" element={<EmailSequences token={auth.token} />} />
          <Route path="/sequence-queue" element={<SequenceQueue token={auth.token} />} />
          <Route path="/bulk-imports" element={<BulkImportQueue token={auth.token} />} />
          <Route path="/bulk-imports/:id" element={<BulkImportDetail token={auth.token} />} />

          <Route path="/support" element={<SupportTickets token={auth.token} />} />
          <Route path="/verifications" element={<Verifications token={auth.token} />} />
          {showSandboxTools && (
            <Route path="/demo-bank" element={<DemoBank token={auth.token} />} />
          )}
          {(auth.user.role === 'SUPERADMIN' || auth.user.role === 'DEVELOPER') && (
            <>
              <Route
                path="/settings"
                element={<Settings token={auth.token} currentAdminId={auth.user.id} />}
              />
              <Route path="/logs" element={<Logs token={auth.token} />} />
              <Route path="/app-activity" element={<AppActivity token={auth.token} />} />
              <Route path="/feedback" element={<Feedback token={auth.token} />} />
              {showSandboxTools && (
                <Route path="/dev-emails" element={<DevEmails token={auth.token} />} />
              )}
              <Route path="/webhooks" element={<Webhooks token={auth.token} />} />
              <Route path="/internal-accounts" element={<InternalAccounts token={auth.token} />} />
              <Route
                path="/whatsapp-sequences"
                element={<WhatsappSequences token={auth.token} />}
              />
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
      <ConfirmProvider>
        <AppRoutes />
      </ConfirmProvider>
    </AuthProvider>
  )
}

export default App
