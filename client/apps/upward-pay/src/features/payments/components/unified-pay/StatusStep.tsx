'use client'

import React from 'react'
import { XCircle, AlertCircle } from 'lucide-react'
import { UpwardLogo } from '@/components/PoweredByUpward'

interface StatusStepProps {
  title: string
  message: string
  type: 'error' | 'cancelled'
  onAction: () => void
  actionLabel: string
}

export function StatusStep({
  title,
  message,
  type,
  onAction,
  actionLabel
}: StatusStepProps) {
  return (
    <div className="status-view">
      <div className="status-card">
        <div className={`status-icon status-icon--${type}`}>
          {type === 'error' ? <AlertCircle size={40} /> : <XCircle size={40} />}
        </div>
        <h2 className="status-title">{title}</h2>
        <p className="status-text">{message}</p>
        <button className="btn btn--primary btn--full btn--pill status-btn" onClick={onAction}>
          {actionLabel}
        </button>
        <div className="status-footer">
          <UpwardLogo size={20} className="opacity-20" />
        </div>
      </div>

      <style jsx>{`
        .status-view {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(circle at 80% 0%, var(--clay-faint), transparent 360px), var(--oat-dim);
        }
        .status-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg);
          border-radius: 40px;
          padding: 56px 40px 40px;
          text-align: center;
          box-shadow: 0 40px 100px rgba(0,0,0,0.06);
          border: 1px solid var(--border-solid);
          animation: cardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes cardAppear {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .status-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          animation: iconPop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .status-icon--error {
          background: #fee2e2;
          color: #ef4444;
        }
        .status-icon--cancelled {
          background: var(--surface);
          color: var(--text-muted);
        }
        @keyframes iconPop {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .status-title {
          font-size: 24px;
          font-weight: 900;
          color: var(--text);
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }
        .status-text {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 40px;
        }
        .status-btn {
          height: 60px;
          font-weight: 800;
        }
        .status-footer {
          margin-top: 40px;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}
