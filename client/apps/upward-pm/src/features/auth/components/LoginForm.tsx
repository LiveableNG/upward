'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Mail, 
  Lock, 
  ChevronRight
} from 'lucide-react'
import { useLogin } from '../hooks/useLogin'
import { useRequestOTP } from '../hooks/useOtp'

export const LoginForm = () => {
  const [useOtp, setUseOtp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useLogin()
  const requestOtpMutation = useRequestOTP()

  const loading = loginMutation.isPending || requestOtpMutation.isPending

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (useOtp) {
      requestOtpMutation.mutate({ email, context: 'LOGIN' })
    } else {
      loginMutation.mutate({ email, password })
    }
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h2 className="auth-card__title">Welcome back</h2>
        <p className="auth-card__subtitle">
          {useOtp 
            ? "Enter your email to receive a secure login code." 
            : "Sign in to manage your property portfolio."
          }
        </p>
      </div>

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <div className="input-wrapper">
            <Mail size={18} className="input-icon" />
            <input 
              type="email" 
              className="form-input form-input--with-icon" 
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {!useOtp && (
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--forest)', fontWeight: 600 }}>
                Forgot?
              </Link>
            </div>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input 
                type="password" 
                className="form-input form-input--with-icon" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
        )}

        <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
          {loading ? "Please wait..." : (useOtp ? "Send Code" : "Sign In")} 
          <ChevronRight size={18} />
        </button>

        <div className="auth-separator">Or continue with</div>

        <button 
          type="button" 
          className="auth-btn auth-btn--secondary"
          onClick={() => setUseOtp(!useOtp)}
        >
          {useOtp ? "Login with password" : "Login with verification code"}
        </button>

        <div className="auth-footer">
          Don't have an account? <Link href="/signup">Create one for free</Link>
        </div>
      </form>
    </div>
  )
}
