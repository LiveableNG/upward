'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'primary'
  isPending?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary',
  isPending = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={AlertCircle}
      maxWidth={420}
      footer={
        <>
          <button 
            type="button" 
            className="btn btn--secondary" 
            style={{ flex: 1, height: 48 }} 
            onClick={onClose}
            disabled={isPending}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className={`btn ${type === 'danger' ? 'btn--danger' : 'btn--primary'}`} 
            style={{ flex: 1, height: 48 }} 
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div style={{ padding: '8px 0' }}>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
      </div>
      
      <style jsx>{`
        :global(.upward-modal__icon) {
          background: ${type === 'danger' ? '#fef2f2' : 'var(--bg)'} !important;
          color: ${type === 'danger' ? '#ef4444' : 'var(--text-secondary)'} !important;
        }
      `}</style>
    </Modal>
  )
}
