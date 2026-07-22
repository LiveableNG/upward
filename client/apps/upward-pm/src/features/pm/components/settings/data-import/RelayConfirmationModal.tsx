import React from 'react'
import { AlertTriangle, FileText, Clock, ArrowRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'

interface RelayConfirmationModalProps {
  isOpen: boolean
  file: File | null
  onClose: () => void
  onConfirm: () => void
  isSubmitting?: boolean
}

export const RelayConfirmationModal: React.FC<RelayConfirmationModalProps> = ({
  isOpen,
  file,
  onClose,
  onConfirm,
  isSubmitting = false
}) => {
  if (!file) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assisted Bulk Onboarding"
      subtitle="Document processing by Upward Customer Support"
      icon={FileText}
      maxWidth={520}
      footer={
        <>
          <button
            type="button"
            className="btn btn--secondary"
            style={{ flex: 1, height: 44, borderRadius: 10 }}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            style={{ flex: 1, height: 44, borderRadius: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Relaying Document...' : (
              <>
                Confirm & Send to Team <ArrowRight size={16} />
              </>
            )}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--clay)', fontWeight: 700, fontSize: 13, border: '1px solid var(--border)' }}>
            {file.name.split('.').pop()?.toUpperCase() || 'DOC'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {file.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dark)', fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            <Clock size={18} style={{ color: 'var(--clay)' }} /> Estimated Processing Time: ~48 Hours
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            Because this file is not a standard Excel or CSV spreadsheet, our dedicated customer support team will manually transcribe and structure your properties, units, and lease data into the system.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--dark)', background: '#fffbeb', border: '1px solid #fde68a', padding: 12, borderRadius: 10 }}>
          <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
          <span>
            Once processed, you will be able to preview and confirm all structured data before it goes live on your account.
          </span>
        </div>
      </div>
    </Modal>
  )
}
