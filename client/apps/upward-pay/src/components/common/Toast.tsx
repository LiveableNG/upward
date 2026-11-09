'use client'

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { generateId } from '@/lib/utils'
import { haptics } from '@/lib/haptics'
import '@/styles/toast.css'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message: string
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void
    error: (message: string, title?: string) => void
    info: (message: string, title?: string) => void
  }
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

function sanitizeToastMessage(message: string, type: ToastType): string {
  if (!message || typeof message !== 'string') {
    return type === 'error' ? 'An unexpected error occurred. Please try again.' : ''
  }

  let cleaned = message
    .replace(/https?:\/\/[^\s)]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (/timed out/i.test(cleaned)) {
    return 'Request timed out. Please check your internet connection and try again.'
  }
  if (/failed to fetch|network error|load failed|unable to reach server/i.test(cleaned)) {
    return 'Unable to connect. Please check your internet connection and try again.'
  }
  if (/internal server error|status code 500/i.test(cleaned)) {
    return 'Something went wrong on our end. Please try again shortly.'
  }

  cleaned = cleaned
    .replace(/\s+(for|at|to)\s*[.:,;]?$/i, '.')
    .replace(/\s*\.\s*\./g, '.')
    .trim()

  return cleaned || (type === 'error' ? 'An unexpected error occurred. Please try again.' : '')
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, rawMessage: string, title?: string) => {
      const id = generateId('toast')
      const message = sanitizeToastMessage(rawMessage, type)
      const newToast: Toast = {
        id,
        type,
        message,
        title:
          title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification'),
      }

      if (type === 'success') {
        haptics.success()
      } else if (type === 'error') {
        haptics.error()
      } else {
        haptics.light()
      }

      setToasts((prev) => [...prev, newToast])

      // Auto-remove after 5 seconds
      setTimeout(() => removeToast(id), 5000)
    },
    [removeToast],
  )

  const toast = {
    success: (message: string, title?: string) => addToast('success', message, title),
    error: (message: string, title?: string) => addToast('error', message, title),
    info: (message: string, title?: string) => addToast('info', message, title),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>
            <div className="toast__icon">
              {t.type === 'success' && <CheckCircle2 size={24} />}
              {t.type === 'error' && <XCircle size={24} />}
              {(t.type === 'info' || !t.type) && <Info size={24} />}
            </div>
            <div className="toast__content">
              <div className="toast__title">{t.title}</div>
              <div className="toast__message">{t.message}</div>
            </div>
            <button className="toast__close" onClick={() => removeToast(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context.toast
}
