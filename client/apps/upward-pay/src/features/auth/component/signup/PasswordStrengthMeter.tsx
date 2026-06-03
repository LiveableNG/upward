'use client'

import React from 'react'
import { Check, X, ShieldCheck, ShieldAlert, Shield } from 'lucide-react'

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

  const { text, color, fill } = getStrength()

  return (
    <div className="psm">
      {/* Strength bar + label row */}
      <div className="psm__row">
        <div className="psm__segments">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="psm__seg"
              style={{
                background: i < metCount ? color : 'var(--surface2)',
                transition: 'background 0.35s ease',
                boxShadow: i < metCount && metCount === 3 ? `0 0 6px ${color}66` : 'none',
              }}
            />
          ))}
        </div>
        <span className="psm__label" style={{ color }}>
          {text}
        </span>
      </div>

      {/* Compact requirements row */}
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

      <style jsx>{`
        .psm {
          margin-top: 8px;
          animation: psm-in 0.2s ease-out;
        }
        @keyframes psm-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .psm__row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 7px;
        }
        .psm__segments {
          display: flex;
          gap: 4px;
          flex: 1;
        }
        .psm__seg {
          flex: 1;
          height: 3px;
          border-radius: 99px;
        }
        .psm__label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
          min-width: 40px;
          text-align: right;
        }
        .psm__reqs {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 12px;
        }
        .psm__req {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          color: var(--text-muted);
          transition: color 0.25s;
          line-height: 1;
        }
        .psm__req.met {
          color: #22c55e;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
