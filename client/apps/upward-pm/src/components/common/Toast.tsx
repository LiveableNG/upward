'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { generateId } from '@/lib/utils'
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = generateId('toast')
      const newToast: Toast = {
        id,
        type,
        message,
        title:
          title || (type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification'),
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

  const toastContainer = mounted ? createPortal(
    <div className="toast-container">
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
      </div>,
      document.body
    ) : null

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toastContainer}
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
