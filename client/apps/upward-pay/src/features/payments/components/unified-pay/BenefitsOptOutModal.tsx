'use client'

import { HelpCircle, AlertTriangle, MessageSquare, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface BenefitsOptOutModalProps {
  isOpen: boolean
  rentValue: number
  currency: string
  onClose: () => void
  onConfirmOptOut: () => void
}

export function BenefitsOptOutModal({
  isOpen,
  rentValue,
  currency,
  onClose,
  onConfirmOptOut
}: BenefitsOptOutModalProps) {
  if (!isOpen) return null

  const coverageValue = rentValue * 0.10
  const encodedMsg = encodeURIComponent(
    `Hi, I'm about to make my rent payment and would like to understand the Upward Benefits package before opting in.`
  )
  const contactNum = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '2348160124649'
  const cleanContactNum = contactNum.replace(/^\+/, '')
  const whatsappUrl = `https://wa.me/${cleanContactNum}?text=${encodedMsg}`

  return (
    <div className="optout-overlay">
      <div className="optout-dialog animate-in zoom-in-95 duration-200">
        <div className="optout-dialog__header-icon">
          <AlertTriangle size={24} />
        </div>

        <h3 className="optout-dialog__title">Are you sure you want to opt out?</h3>
        
        <p className="optout-dialog__desc">
          You may miss out on exclusive tenant benefits worth up to{' '}
          <strong className="highlight">{formatCurrency(coverageValue, currency)}</strong> throughout your tenancy.
        </p>

        <ul className="optout-dialog__list">
          <li className="optout-dialog__list-item">
            <span className="optout-dialog__icon-wrap">
              <Check size={12} />
            </span>
            <span>Rental Credibility & Score Boost</span>
          </li>
          <li className="optout-dialog__list-item">
            <span className="optout-dialog__icon-wrap">
              <Check size={12} />
            </span>
            <span>Flexible installment rent financing</span>
          </li>
          <li className="optout-dialog__list-item">
            <span className="optout-dialog__icon-wrap">
              <Check size={12} />
            </span>
            <span>Verified Tenancy History records</span>
          </li>
        </ul>

        <div className="optout-dialog__help-card">
          <HelpCircle size={16} className="help-icon" />
          <span>Need help deciding? Chat with our rep instantly.</span>
        </div>

        <div className="optout-dialog__actions">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-optout btn-optout--whatsapp"
          >
            <MessageSquare size={16} />
            <span>Chat with Support</span>
          </a>

          <button
            onClick={onClose}
            className="btn-optout btn-optout--keep"
          >
            Keep Benefits
          </button>

          <button
            onClick={onConfirmOptOut}
            className="btn-optout btn-optout--cancel"
          >
            Opt Out anyway
          </button>
        </div>
      </div>

      <style jsx>{`
        .optout-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .optout-dialog {
          background: var(--bg);
          border: 1px solid var(--border-solid);
          border-radius: 32px;
          max-width: 440px;
          width: 100%;
          padding: 32px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.15);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .optout-dialog__header-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: rgba(217, 119, 87, 0.1);
          color: var(--clay);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        .optout-dialog__title {
          font-size: 18px;
          font-weight: 850;
          color: var(--text);
          margin: 0 0 12px 0;
        }
        .optout-dialog__desc {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 20px 0;
        }
        .optout-dialog__desc .highlight {
          color: var(--clay);
          font-weight: 800;
        }
        .optout-dialog__list {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
          width: 100%;
        }
        .optout-dialog__list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .optout-dialog__icon-wrap {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(217, 119, 87, 0.1);
          color: var(--clay);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .optout-dialog__help-card {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border-solid);
          padding: 12px 16px;
          border-radius: 16px;
          margin-bottom: 24px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .optout-dialog__help-card .help-icon {
          color: var(--clay);
        }
        .optout-dialog__actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        }
        .btn-optout {
          width: 100%;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          text-decoration: none;
        }
        .btn-optout--whatsapp {
          background: #25D366;
          color: #fff;
          box-shadow: 0 6px 16px rgba(37, 211, 102, 0.25);
        }
        .btn-optout--whatsapp:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }
        .btn-optout--keep {
          background: var(--clay);
          color: #fff;
          box-shadow: 0 6px 16px var(--clay-glow);
        }
        .btn-optout--keep:hover {
          filter: brightness(1.05);
          transform: translateY(-1px);
        }
        .btn-optout--cancel {
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--border-solid);
        }
        .btn-optout--cancel:hover {
          background: var(--surface);
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}
