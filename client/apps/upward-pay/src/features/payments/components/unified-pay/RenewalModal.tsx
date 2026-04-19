'use client'

import React from 'react'
import { Calendar, RefreshCw, ArrowRight, X } from 'lucide-react'
import { api } from '@/lib/api'

interface RenewalModalProps {
  propertyUuid: string
  isOpen: boolean
  onClose: () => void
  onRenewed: (newDate: string) => void
}

export function RenewalModal({ propertyUuid, isOpen, onClose, onRenewed }: RenewalModalProps) {
  const [loading, setLoading] = React.useState(false)

  if (!isOpen) return null

  const handleRenew = async () => {
    setLoading(true)
    try {
      const res = await api.renewProperty(propertyUuid)
      if (res.success) {
        onRenewed(res.newEndDate)
      }
    } catch (err) {
      console.error('Renewal failed', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="renewal-overlay">
      <div className="renewal-modal">
        <button className="renewal-modal__close" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="renewal-modal__icon">
          <Calendar size={32} color="var(--clay)" />
        </div>

        <h3>Renew your Tenancy?</h3>
        <p>
          This property is currently marked as a <strong>Past Tenancy</strong>. 
          Would you like to renew your stay and reactivate this home in your dashboard?
        </p>

        <div className="renewal-modal__actions">
          <button 
            className="btn btn--primary btn--full btn--pill mb-3" 
            onClick={handleRenew}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <>
                <span>Yes, Renew Tenancy</span>
                <ArrowRight size={18} style={{ marginLeft: '8px' }} />
              </>
            )}
          </button>
          
          <button 
            className="btn btn--secondary btn--full btn--pill" 
            onClick={onClose}
            disabled={loading}
          >
            Just Settle Past Due
          </button>
        </div>
      </div>

      <style jsx>{`
        .renewal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: 20px;
        }
        .renewal-modal {
          background: white;
          width: 100%;
          max-width: 400px;
          border-radius: 24px;
          padding: 32px;
          position: relative;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          animation: modalPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes modalPop {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .renewal-modal__close {
          position: absolute;
          top: 16px; right: 16px;
          background: none; border: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .renewal-modal__icon {
          width: 64px; height: 64px;
          background: var(--clay-faint);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        h3 { font-size: 22px; font-weight: 800; color: var(--dark); margin-bottom: 12px; }
        p { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; }
        .btn--pill { border-radius: 100px; padding: 14px; font-weight: 600; }
        .mb-3 { margin-bottom: 12px; }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
