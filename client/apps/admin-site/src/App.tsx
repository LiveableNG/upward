import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmailComposer from './pages/EmailComposer'
import Sessions from './pages/Sessions'
import Sidebar from './components/Sidebar'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const auth = localStorage.getItem('admin_auth')
    if (auth === 'true') setIsAuthenticated(true)
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
    localStorage.setItem('admin_auth', 'true')
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('admin_auth')
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Sidebar onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/emails" element={<EmailComposer />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
