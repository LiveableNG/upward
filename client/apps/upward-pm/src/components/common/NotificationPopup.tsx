'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePmPopups, usePmNotificationActions } from '@/features/pm/hooks/usePmNotifications'
import { CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NotificationPopup() {
  const router = useRouter()
  const { data: popups = [], refetch } = usePmPopups()
  const { markRead } = usePmNotificationActions()
  const [activePopup, setActivePopup] = useState<any>(null)

  // Show the first unread popup in the queue
  useEffect(() => {
    if (popups.length > 0 && !activePopup) {
      setActivePopup(popups[0])
    }
  }, [popups, activePopup])

  if (!activePopup) return null

  const handleDismiss = () => {
    // Mark as read/seen on backend
    markRead.mutate(activePopup.uuid, {
      onSuccess: () => {
        setActivePopup(null)
        refetch() // Fetch any remaining popups in queue
      }
    })
  }

  const handleAction = () => {
    const url = activePopup.url || '/dashboard'
    markRead.mutate(activePopup.uuid, {
      onSuccess: () => {
        setActivePopup(null)
        refetch()
        router.push(url)
      }
    })
  }

  const isSuccess = activePopup.type === 'PAYMENT_COMPLETED'

  return (
    <div className="popup-overlay" onClick={handleDismiss}>
      <div 
        className={cn(
          "popup-card", 
          isSuccess ? "popup-card--success" : "popup-card--warning"
        )} 
        onClick={e => e.stopPropagation()}
      >
        <button className="popup-card__close-btn" onClick={handleDismiss}>
          <X size={18} />
        </button>

        <div className="popup-card__body">
          <div className={cn(
            "popup-card__badge-wrap",
            isSuccess ? "popup-card__badge-wrap--success" : "popup-card__badge-wrap--warning"
          )}>
            <div className="popup-card__badge-pulse" />
            {isSuccess ? (
              <CheckCircle2 size={36} className="text-white" />
            ) : (
              <AlertCircle size={36} className="text-white" />
            )}
          </div>

          <h2 className="popup-card__title">
            {activePopup.title}
          </h2>
          <p className="popup-card__message">
            {activePopup.message}
          </p>

          <div className="popup-card__actions">
            <button 
              className={cn(
                "btn popup-card__action-btn",
                isSuccess ? "popup-card__action-btn--success" : "popup-card__action-btn--warning"
              )}
              onClick={handleAction}
            >
              <span>{isSuccess ? 'View Transaction History' : 'Go to Properties'}</span>
              <ArrowRight size={16} />
            </button>
            <button className="popup-card__dismiss-btn" onClick={handleDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .popup-card {
          background: var(--surface);
          border-radius: 28px;
          border: 1px solid var(--border-strong);
          width: 440px;
          max-width: 90%;
          position: relative;
          overflow: hidden;
          padding: 36px 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(0, 0, 0, 0.05);
          animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .popup-card--success {
          box-shadow: 0 25px 50px -12px rgba(22, 101, 52, 0.15), 0 0 40px rgba(22, 101, 52, 0.05);
          border-color: rgba(22, 101, 52, 0.1);
        }

        .popup-card--warning {
          box-shadow: 0 25px 50px -12px rgba(234, 88, 12, 0.15), 0 0 40px rgba(234, 88, 12, 0.05);
          border-color: rgba(234, 88, 12, 0.1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .popup-card__close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: var(--ivory-dim);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .popup-card__close-btn:hover {
          background: var(--border-light);
          color: var(--text);
          transform: rotate(90deg);
        }

        .popup-card__body {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .popup-card__badge-wrap {
          width: 80px;
          height: 80px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin-bottom: 24px;
        }

        .popup-card__badge-wrap--success {
          background: var(--forest);
          box-shadow: 0 10px 20px var(--forest-glow);
        }

        .popup-card__badge-wrap--warning {
          background: #ea580c;
          box-shadow: 0 10px 20px rgba(234, 88, 12, 0.3);
        }

        .popup-card__badge-pulse {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 24px;
          opacity: 0.4;
          animation: pulseGlow 2s infinite ease-out;
        }

        .popup-card__badge-wrap--success .popup-card__badge-pulse {
          box-shadow: 0 0 0 12px var(--forest);
        }

        .popup-card__badge-wrap--warning .popup-card__badge-pulse {
          box-shadow: 0 0 0 12px #ea580c;
        }

        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.4); opacity: 0; }
        }

        .popup-card__title {
          font-size: 24px;
          font-weight: 850;
          color: var(--text);
          margin: 0 0 12px 0;
          letter-spacing: -0.02em;
        }

        .popup-card__message {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0 0 32px 0;
          font-weight: 500;
        }

        .popup-card__actions {
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: 12px;
        }

        .popup-card__action-btn {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          font-size: 14px;
          font-weight: 750;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .popup-card__action-btn--success {
          background: var(--forest);
          color: white;
          box-shadow: 0 4px 12px var(--forest-glow);
        }

        .popup-card__action-btn--success:hover {
          background: var(--forest-hover);
          transform: translateY(-2px);
          box-shadow: 0 6px 16px var(--forest-glow);
        }

        .popup-card__action-btn--warning {
          background: #ea580c;
          color: white;
          box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);
        }

        .popup-card__action-btn--warning:hover {
          background: #d97706;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(234, 88, 12, 0.35);
        }

        .popup-card__dismiss-btn {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .popup-card__dismiss-btn:hover {
          background: var(--ivory-dim);
          border-color: var(--border-strong);
          color: var(--text);
        }
      `}</style>
    </div>
  )
}
