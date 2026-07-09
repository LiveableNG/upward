'use client'

import React from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface PaymentConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  amount: number
  currency: string
  isFullRequired?: boolean
  onManualTransfer?: () => void
}

export function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  amount,
  currency,
  isFullRequired,
  onManualTransfer
}: PaymentConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[var(--clay-faint)] rounded-lg">
              <AlertCircle size={20} className="text-[var(--clay)]" />
            </div>
            <h3 className="modal-card__title">Confirm Payment</h3>
          </div>
          <button className="modal-card__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-card__body py-6">
          <div className="text-center mb-6">
            <p className="text-[var(--text-secondary)] text-sm mb-2">You are about to pay</p>
            <h2 className="text-3xl font-extrabold text-[var(--text)]">
              {formatCurrency(amount, currency)}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-[var(--surface2)] border border-[var(--border-solid)] rounded-2xl flex gap-3">
              <CheckCircle2 size={18} className="text-[var(--success)] flex-shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">
                Do you agree to pay the amount entered above?
              </p>
            </div>

            <div className="p-4 bg-[var(--clay-faint)] border border-orange-200 rounded-2xl flex gap-3">
              <AlertCircle size={18} className="text-[var(--clay)] flex-shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed text-[var(--text)]">
                {isFullRequired ? (
                  <><strong>Full payment only.</strong> This invoice does not allow partial payments. Ensure the amount above is the complete balance owed before proceeding.</>
                ) : (
                  <><strong>Partial Payments:</strong> Please note that the processing fee is enforced on every single partial payment transaction. Additionally, transferring less than the amount specified will trigger an underpayment refund.</>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="modal-card__footer flex flex-col gap-3 pt-2">
          <button 
            className="btn btn--primary btn--full btn--pill py-4 text-base font-bold shadow-xl"
            onClick={onConfirm}
          >
            Agree & Proceed to Pay (Online)
          </button>
          {onManualTransfer && (
            <button 
              className="btn btn--secondary btn--full btn--pill py-4 text-base font-bold"
              style={{ background: 'var(--surface)', color: 'var(--text)' }}
              onClick={onManualTransfer}
            >
              Submit Proof of Payment
            </button>
          )}
          <button 
            className="btn btn--ghost btn--full btn--pill py-4 text-base font-medium"
            style={{ border: 'none', background: 'transparent' }}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-card {
          background: var(--bg);
          width: 100%;
          max-width: 420px;
          border-radius: 32px;
          border: 1px solid var(--border-solid);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-card__header {
          padding: 24px 24px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-card__title {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
        }
        .modal-card__close {
          background: var(--surface);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          cursor: pointer;
        }
        .modal-card__body {
          padding: 0 24px 24px;
        }
        .modal-card__footer {
          padding: 16px 24px 24px;
          background: var(--surface2);
        }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 8px; }
        .gap-3 { gap: 12px; }
        .p-2 { padding: 8px; }
        .p-4 { padding: 16px; }
        .py-6 { padding-top: 24px; padding-bottom: 24px; }
        .py-4 { padding-top: 16px; padding-bottom: 16px; }
        .pt-2 { padding-top: 8px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-6 { margin-bottom: 24px; }
        .mt-0\.5 { margin-top: 2px; }
        .text-center { text-align: center; }
        .text-sm { font-size: 14px; }
        .text-base { font-size: 16px; }
        .text-3xl { font-size: 30px; }
        .font-bold { font-weight: 700; }
        .font-extrabold { font-weight: 800; }
        .leading-relaxed { line-height: 1.625; }
        .w-full { width: 100%; }
        .max-w-420 { max-width: 420px; }
        .rounded-lg { border-radius: 12px; }
        .rounded-2xl { border-radius: 16px; }
        .flex-shrink-0 { flex-shrink: 0; }
        .space-y-4 > * + * { margin-top: 16px; }
      `}</style>
    </div>
  )
}
