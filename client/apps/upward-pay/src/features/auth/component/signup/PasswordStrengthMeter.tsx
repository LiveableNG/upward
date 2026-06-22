'use client'

import React from 'react'
import { Check, X } from 'lucide-react'

interface PasswordStrengthMeterProps {
  password?: string
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  const requirements = [
    { label: 'Min. 8 characters', regex: /.{8,}/ },
    { label: 'One uppercase letter', regex: /[A-Z]/ },
    { label: 'One number or symbol', regex: /[0-9!@#$%^&*(),.?":{}|<>]/ },
  ]

  const metCount = requirements.filter(req => req.regex.test(password)).length

  const getStrength = () => {
    if (password.length === 0) return { text: 'Too short', color: 'var(--text-muted)', fill: 0 }
    if (metCount === 1) return { text: 'Weak', color: '#ef4444', fill: 33 }
    if (metCount === 2) return { text: 'Fair', color: '#f59e0b', fill: 66 }
    return { text: 'Strong', color: '#22c55e', fill: 100 }
  }

  const { text, color } = getStrength()

  return (
    <div className="psm">
      <div className="psm__row">
        <div className="psm__segments">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="psm__seg"
              style={{
                background: i < metCount ? color : 'var(--surface2)',
                boxShadow: i < metCount && metCount === 3 ? `0 0 6px ${color}66` : 'none',
              }}
            />
          ))}
        </div>
        <span className="psm__label" style={{ color }}>
          {text}
        </span>
      </div>

      <div className="psm__reqs">
        {requirements.map((req, idx) => {
          const met = req.regex.test(password)
          return (
            <span key={idx} className={`psm__req ${met ? 'met' : ''}`}>
              {met ? <Check size={10} strokeWidth={2.5} /> : <X size={10} strokeWidth={2.5} />}
              {req.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
