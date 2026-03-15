import { useState } from 'react'
import { Lock, User } from 'lucide-react'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simple client-side validation as requested
    if (username === 'admin' && password === 'upward2025') {
      onLogin()
    } else {
      setError('Invalid credentials. Hint: admin / upward2025')
    }
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}
    >
      <form onSubmit={handleSubmit} className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--accent)', fontSize: '24px', marginBottom: '8px' }}>
            Admin Login
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            Please enter your credentials to continue
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}
          >
            Username
          </label>
          <div style={{ position: 'relative' }}>
            <User
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              style={{ width: '100%', paddingLeft: '40px', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              color: 'var(--muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
            }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <Lock
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)',
              }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', paddingLeft: '40px', boxSizing: 'border-box' }}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
          Sign In
        </button>
      </form>
    </div>
  )
}
