'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePmPopups, usePmNotificationActions } from '@/features/pm/hooks/usePmNotifications'
import { CheckCircle2, AlertCircle, X, ArrowRight, Wallet, Calendar, AlertTriangle, ChevronRight, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

// Emoji sanitizer regex helper
const cleanEmoji = (text: string): string => {
  if (!text) return ''
  return text.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, '').trim()
}

export function NotificationPopup() {
  const router = useRouter()
  const { data: popups = [], refetch } = usePmPopups()
  const { markRead, markAllRead } = usePmNotificationActions()
  const [activePopup, setActivePopup] = useState<any>(null)

  // Sync activePopup when popups change
  useEffect(() => {
    if (popups.length === 1) {
      setActivePopup(popups[0])
    } else {
      setActivePopup(null)
    }
  }, [popups])

  if (popups.length === 0) return null

  const isMultiple = popups.length > 1

  const handleDismissSingle = () => {
    if (!activePopup) return
    markRead.mutate(activePopup.uuid, {
      onSuccess: () => {
        setActivePopup(null)
        refetch()
      }
    })
  }

  const handleActionSingle = () => {
    if (!activePopup) return
    const url = activePopup.url || '/dashboard'
    markRead.mutate(activePopup.uuid, {
      onSuccess: () => {
        setActivePopup(null)
        refetch()
        router.push(url)
      }
    })
  }

  const handleIndividualAction = (popup: any) => {
    const url = popup.url || '/dashboard'
    markRead.mutate(popup.uuid, {
      onSuccess: () => {
        refetch()
        router.push(url)
      }
    })
  }

  const handleDismissAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        refetch()
      }
    })
  }

  // --- Layout Helper for Multiple Updates ---
  if (isMultiple) {
    return (
      <div className="popup-overlay" onClick={handleDismissAll}>
        <div className="popup-card popup-card--multiple" onClick={e => e.stopPropagation()}>
          <button className="popup-card__close-btn" onClick={handleDismissAll} title="Dismiss All">
            <X size={18} />
          </button>

          <div className="popup-card__body">
            <div className="popup-card__badge-wrap popup-card__badge-wrap--multiple">
              <div className="popup-card__badge-pulse" />
              <Bell size={36} className="text-white" />
            </div>

            <h2 className="popup-card__title">New Activity & Updates</h2>
            <p className="popup-card__message" style={{ marginBottom: 24 }}>
              You have {popups.length} unread updates waiting for your review.
            </p>

            <div className="popup-card__list">
              {popups.map((popup: any) => {
                const type = popup.type
                const cleanTitle = cleanEmoji(popup.title)
                const cleanMsg = cleanEmoji(popup.message)

                return (
                  <div key={popup.uuid} className="popup-item">
                    <div className={cn("popup-item__icon-wrap", `popup-item__icon-wrap--${type.toLowerCase()}`)}>
                      {type === 'PAYMENT_COMPLETED' && <Wallet size={18} />}
                      {type === 'PAYMENT_DUE' && <Calendar size={18} />}
                      {type === 'PAYMENT_OVERDUE' && <AlertTriangle size={18} />}
                      {type !== 'PAYMENT_COMPLETED' && type !== 'PAYMENT_DUE' && type !== 'PAYMENT_OVERDUE' && <Bell size={18} />}
                    </div>
                    <div className="popup-item__details">
                      <h4 className="popup-item__title">{cleanTitle}</h4>
                      <p className="popup-item__msg">{cleanMsg}</p>
                    </div>
                    <button 
                      className="popup-item__action-btn" 
                      onClick={() => handleIndividualAction(popup)}
                      title="View Details"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="popup-card__actions" style={{ width: '100%' }}>
              <button className="popup-card__dismiss-all-btn" onClick={handleDismissAll}>
                Dismiss All Updates
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
            backdrop-filter: blur(10px);
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
            width: 480px;
            max-width: 90%;
            position: relative;
            overflow: hidden;
            padding: 36px 28px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 40px rgba(0, 0, 0, 0.05);
            animation: scaleUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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

          .popup-card__badge-wrap--multiple {
            background: var(--accent);
            box-shadow: 0 10px 20px var(--accent-faint);
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

          .popup-card__badge-wrap--multiple .popup-card__badge-pulse {
            box-shadow: 0 0 0 12px var(--accent);
          }

          @keyframes pulseGlow {
            0% { transform: scale(1); opacity: 0.4; }
            100% { transform: scale(1.4); opacity: 0; }
          }

          .popup-card__title {
            font-size: 22px;
            font-weight: 850;
            color: var(--text);
            margin: 0 0 8px 0;
            letter-spacing: -0.02em;
          }

          .popup-card__message {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.5;
            margin: 0;
            font-weight: 500;
          }

          .popup-card__list {
            width: 100%;
            max-height: 260px;
            overflow-y: auto;
            margin-bottom: 28px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding-right: 4px;
          }

          .popup-card__list::-webkit-scrollbar {
            width: 6px;
          }
          .popup-card__list::-webkit-scrollbar-track {
            background: transparent;
          }
          .popup-card__list::-webkit-scrollbar-thumb {
            background: var(--border-strong);
            border-radius: 3px;
          }

          .popup-item {
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 12px 14px;
            background: var(--ivory-dim);
            border-radius: 16px;
            border: 1px solid var(--border);
            transition: all 0.2s ease;
            text-align: left;
          }

          .popup-item:hover {
            transform: translateY(-1px);
            border-color: var(--border-strong);
            background: var(--surface-hover);
          }

          .popup-item__icon-wrap {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .popup-item__icon-wrap--payment_completed {
            background: rgba(34, 197, 94, 0.1);
            color: var(--success);
          }

          .popup-item__icon-wrap--payment_due {
            background: rgba(217, 119, 6, 0.1);
            color: #d97706;
          }

          .popup-item__icon-wrap--payment_overdue {
            background: rgba(239, 68, 68, 0.1);
            color: var(--error);
          }

          .popup-item__details {
            flex: 1;
            min-width: 0;
          }

          .popup-item__title {
            font-size: 13px;
            font-weight: 800;
            color: var(--text);
            margin: 0 0 2px 0;
          }

          .popup-item__msg {
            font-size: 11.5px;
            color: var(--text-secondary);
            margin: 0;
            line-height: 1.4;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .popup-item__action-btn {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
          }

          .popup-item__action-btn:hover {
            background: var(--forest);
            border-color: var(--forest);
            color: white;
          }

          .popup-card__dismiss-all-btn {
            width: 100%;
            height: 48px;
            border-radius: 14px;
            background: var(--forest);
            color: white;
            font-size: 14px;
            font-weight: 750;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: var(--shadow-forest);
          }

          .popup-card__dismiss-all-btn:hover {
            background: var(--forest-hover);
            transform: translateY(-2px);
          }
        `}</style>
      </div>
    )
  }

  // --- Layout Helper for Single Update ---
  if (!activePopup) return null

  const isCompleted = activePopup.type === 'PAYMENT_COMPLETED'
  const isOverdue = activePopup.type === 'PAYMENT_OVERDUE'
  const isDue = activePopup.type === 'PAYMENT_DUE'

  const cleanTitle = cleanEmoji(activePopup.title)
  const cleanMsg = cleanEmoji(activePopup.message)

  return (
    <div className="popup-overlay" onClick={handleDismissSingle}>
      <div 
        className={cn(
          "popup-card", 
          isCompleted && "popup-card--completed",
          isDue && "popup-card--due",
          isOverdue && "popup-card--overdue"
        )} 
        onClick={e => e.stopPropagation()}
      >
        <button className="popup-card__close-btn" onClick={handleDismissSingle}>
          <X size={18} />
        </button>

        <div className="popup-card__body">
          <div className={cn(
            "popup-card__badge-wrap",
            isCompleted && "popup-card__badge-wrap--completed",
            isDue && "popup-card__badge-wrap--due",
            isOverdue && "popup-card__badge-wrap--overdue"
          )}>
            <div className="popup-card__badge-pulse" />
            {isCompleted && <Wallet size={36} className="text-white" />}
            {isDue && <Calendar size={36} className="text-white" />}
            {isOverdue && <AlertTriangle size={36} className="text-white" />}
            {!isCompleted && !isDue && !isOverdue && <Bell size={36} className="text-white" />}
          </div>

          <h2 className="popup-card__title">
            {cleanTitle}
          </h2>
          <p className="popup-card__message">
            {cleanMsg}
          </p>

          <div className="popup-card__actions">
            <button 
              className={cn(
                "btn popup-card__action-btn",
                isCompleted && "popup-card__action-btn--completed",
                isDue && "popup-card__action-btn--due",
                isOverdue && "popup-card__action-btn--overdue"
              )}
              onClick={handleActionSingle}
            >
              <span>
                {isCompleted ? 'View Payment Details' : 'View Unit Details'}
              </span>
              <ArrowRight size={16} />
            </button>
            <button className="popup-card__dismiss-btn" onClick={handleDismissSingle}>
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
          backdrop-filter: blur(10px);
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

        .popup-card--completed {
          box-shadow: 0 25px 50px -12px rgba(22, 101, 52, 0.15), 0 0 40px rgba(22, 101, 52, 0.05);
          border-color: rgba(22, 101, 52, 0.2);
        }

        .popup-card--due {
          box-shadow: 0 25px 50px -12px rgba(217, 119, 6, 0.15), 0 0 40px rgba(217, 119, 6, 0.05);
          border-color: rgba(217, 119, 6, 0.2);
        }

        .popup-card--overdue {
          box-shadow: 0 25px 50px -12px rgba(239, 68, 68, 0.15), 0 0 40px rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.2);
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

        .popup-card__badge-wrap--completed {
          background: var(--forest);
          box-shadow: 0 10px 20px var(--forest-glow);
        }

        .popup-card__badge-wrap--due {
          background: #d97706;
          box-shadow: 0 10px 20px rgba(217, 119, 6, 0.3);
        }

        .popup-card__badge-wrap--overdue {
          background: var(--error);
          box-shadow: 0 10px 20px rgba(239, 68, 68, 0.3);
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

        .popup-card__badge-wrap--completed .popup-card__badge-pulse {
          box-shadow: 0 0 0 12px var(--forest);
        }

        .popup-card__badge-wrap--due .popup-card__badge-pulse {
          box-shadow: 0 0 0 12px #d97706;
        }

        .popup-card__badge-wrap--overdue .popup-card__badge-pulse {
          box-shadow: 0 0 0 12px var(--error);
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

        .popup-card__action-btn--completed {
          background: var(--forest);
          color: white;
          box-shadow: var(--shadow-forest);
        }

        .popup-card__action-btn--completed:hover {
          background: var(--forest-hover);
          transform: translateY(-2px);
        }

        .popup-card__action-btn--due {
          background: #d97706;
          color: white;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
        }

        .popup-card__action-btn--due:hover {
          background: #b45309;
          transform: translateY(-2px);
        }

        .popup-card__action-btn--overdue {
          background: var(--error);
          color: white;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }

        .popup-card__action-btn--overdue:hover {
          background: #dc2626;
          transform: translateY(-2px);
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
