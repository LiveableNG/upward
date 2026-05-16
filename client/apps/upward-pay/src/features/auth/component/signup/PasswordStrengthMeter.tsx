import React from 'react'
import { Check, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'

interface PasswordStrengthMeterProps {
  password?: string
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  const requirements = [
    { label: 'Min. 8 characters', regex: /.{8,}/ },
    { label: 'At least one uppercase', regex: /[A-Z]/ },
    { label: 'At least one number or symbol', regex: /[0-9!@#$%^&*(),.?":{}|<>]/ },
  ]

  const metCount = requirements.filter(req => req.regex.test(password)).length
  const strength = password.length === 0 ? 0 : (metCount / requirements.length) * 100

  const getStrengthLabel = () => {
    if (password.length === 0) return { text: 'Too Short', color: 'var(--text-muted)' }
    if (metCount === 1) return { text: 'Weak', color: 'var(--error)' }
    if (metCount === 2) return { text: 'Moderate', color: 'var(--warning)' }
    if (metCount === 3) return { text: 'Strong', color: 'var(--success)' }
    return { text: 'Too Short', color: 'var(--text-muted)' }
  }

  const label = getStrengthLabel()

  return (
    <div className="password-meter">
      <div className="password-meter__header">
        <div className="password-meter__strength">
           {metCount === 3 ? <ShieldCheck size={14} color="var(--success)" /> : 
            metCount >= 1 ? <ShieldAlert size={14} color={label.color} /> : 
            <Shield size={14} color="var(--text-muted)" />}
           <span style={{ color: label.color, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
             {label.text}
           </span>
        </div>
      </div>
      
      <div className="password-meter__bar-container">
        <div 
          className="password-meter__bar" 
          style={{ 
            width: `${strength}%`, 
            backgroundColor: label.color,
            boxShadow: metCount === 3 ? '0 0 8px rgba(34, 197, 94, 0.4)' : 'none'
          }} 
        />
      </div>

      <ul className="password-meter__requirements">
        {requirements.map((req, idx) => {
          const isMet = req.regex.test(password)
          return (
            <li key={idx} className={isMet ? 'met' : ''}>
              {isMet ? <Check size={12} /> : <X size={12} />}
              {req.label}
            </li>
          )
        })}
      </ul>

      <style jsx>{`
        .password-meter {
          margin-top: 12px;
          padding: 12px;
          background: var(--surface);
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .password-meter__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .password-meter__strength {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .password-meter__bar-container {
          height: 4px;
          background: var(--surface2);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .password-meter__bar {
          height: 100%;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .password-meter__requirements {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .password-meter__requirements li {
          font-size: 11px;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .password-meter__requirements li.met {
          color: var(--success);
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
