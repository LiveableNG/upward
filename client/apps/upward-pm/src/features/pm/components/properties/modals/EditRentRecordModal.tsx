import React, { useState, useEffect, useRef } from 'react'
import { X, Lock, UploadCloud, FileText, CheckCircle2, Eye, Loader2, Trash2, Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { downloadBlob } from '@/lib/download-helper'

interface EditRentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  unitName: string;
  unitUuid?: string;
  rentType?: string;
  record: any;
}

export const EditRentRecordModal: React.FC<EditRentRecordModalProps> = ({
  isOpen, onClose, onSave, isPending, unitName, unitUuid, rentType, record
}) => {
  const isPaystack = record?.method?.toUpperCase() === 'PAYSTACK'
  const { error } = useToast()

  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: '',
    periodStart: '',
    periodEnd: '',
    method: 'Bank Transfer',
    status: 'SUCCESS',
    notes: '',
    receiptUrl: null as string | null,
    receiptFileName: null as string | null,
    receiptFileType: null as string | null,
    receiptFileSize: null as number | null,
  })

  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (record) {
      setFormData({
        amount: record.amount?.toString() || '',
        paymentDate: record.paymentDate ? new Date(record.paymentDate).toISOString().split('T')[0] : '',
        periodStart: record.periodStart ? new Date(record.periodStart).toISOString().split('T')[0] : '',
        periodEnd: record.periodEnd ? new Date(record.periodEnd).toISOString().split('T')[0] : '',
        method: record.method || 'Bank Transfer',
        status: record.status || 'SUCCESS',
        notes: record.notes || '',
        receiptUrl: record.receiptUrl || null,
        receiptFileName: record.receiptFileName || null,
        receiptFileType: record.receiptFileType || null,
        receiptFileSize: record.receiptFileSize || null,
      })
      setReceiptFile(null)
      setIsDragging(false)
      setIsUploadingReceipt(false)
    }
  }, [record])

  // Auto-calculate Period End based on Period Start and rentType
  useEffect(() => {
    if (formData.periodStart && rentType && record) {
        const originalStart = record.periodStart ? new Date(record.periodStart).toISOString().split('T')[0] : ''
        if (formData.periodStart !== originalStart || !formData.periodEnd) {
            const start = new Date(formData.periodStart)
            if (isNaN(start.getTime())) return

            const end = new Date(start)
            if (rentType === 'Monthly') {
                end.setMonth(end.getMonth() + 1)
            } else if (rentType === 'Annually' || rentType === 'Yearly') {
                end.setFullYear(end.getFullYear() + 1)
            }
            
            end.setDate(end.getDate() - 1)
            
            const formattedEnd = end.toISOString().split('T')[0]
            if (formattedEnd !== formData.periodEnd) {
                setFormData(prev => ({ ...prev, periodEnd: formattedEnd }))
            }
        }
    }
  }, [formData.periodStart, rentType, record])

  if (!isOpen) return null;

  const handleFileSelect = (file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      error('Only PDF, JPG, or PNG files are accepted as receipts.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      error('File is too large. Maximum size is 10MB.')
      return
    }
    setReceiptFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async () => {
    if (isPaystack) return

    let updatedReceiptFields = {
      receiptUrl: formData.receiptUrl,
      receiptFileName: formData.receiptFileName,
      receiptFileType: formData.receiptFileType,
      receiptFileSize: formData.receiptFileSize,
    }

    if (receiptFile && unitUuid) {
      try {
        setIsUploadingReceipt(true)
        const uploadResult = await api.uploadPaymentReceipt(unitUuid, receiptFile)
        updatedReceiptFields = {
          receiptUrl: uploadResult.receiptUrl,
          receiptFileName: uploadResult.receiptFileName,
          receiptFileType: uploadResult.receiptFileType,
          receiptFileSize: uploadResult.receiptFileSize,
        }
      } catch (err: any) {
        setIsUploadingReceipt(false)
        error(err.message || 'Failed to upload receipt document')
        return
      } finally {
        setIsUploadingReceipt(false)
      }
    }

    onSave({
      ...formData,
      ...updatedReceiptFields,
      amount: parseFloat(formData.amount)
    });
  }

  const isActionPending = isPending || isUploadingReceipt

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Rent Record"
      subtitle={`Modify payment details for Unit ${unitName}`}
      maxWidth={520}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose} disabled={isActionPending}>
            Cancel
          </button>
          <button 
            className="btn btn--primary" 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} 
            onClick={handleSubmit} 
            disabled={isActionPending || !formData.amount || isPaystack}
          >
            {isUploadingReceipt ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Uploading Receipt...</span>
              </>
            ) : isPending ? (
              'Saving...'
            ) : (
              'Update Record'
            )}
          </button>
        </div>
      }
    >
      {isPaystack && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'var(--error-bg, #fef2f2)', border: '1px solid var(--error-border, #fecaca)', color: 'var(--error, #991b1b)', fontSize: 13, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Lock size={15} style={{ flexShrink: 0 }} /> <span><strong>Automated Payment Record:</strong> Payments recorded automatically via Upward Pay (Paystack) are verified online transactions and cannot be edited.</span>
        </div>
      )}

      <div className="form-group" style={{ marginTop: isPaystack ? '16px' : '20px' }}>
        <label className="form-label">Amount (₦)</label>
        <input
          type="number"
          className="form-input"
          placeholder="e.g. 500000"
          disabled={isPaystack}
          value={formData.amount}
          onChange={e => setFormData({ ...formData, amount: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Payment Date</label>
        <input
          type="date"
          className="form-input"
          disabled={isPaystack}
          value={formData.paymentDate}
          onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Period Start</label>
          <input
            type="date"
            className="form-input"
            disabled={isPaystack}
            value={formData.periodStart}
            onChange={e => setFormData({ ...formData, periodStart: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Period End</label>
          <input
            type="date"
            className="form-input"
            disabled={isPaystack}
            value={formData.periodEnd}
            onChange={e => setFormData({ ...formData, periodEnd: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Payment Method</label>
        <FormSelect
          value={formData.method}
          disabled={isPaystack}
          onChange={val => setFormData({ ...formData, method: val })}
          options={[
            { label: 'Bank Transfer', value: 'Bank Transfer' },
            { label: 'Cash', value: 'Cash' },
            { label: 'Card', value: 'Card' },
            { label: 'Cheque', value: 'Cheque' },
            { label: 'Other', value: 'Other' },
            ...(isPaystack ? [{ label: 'Paystack', value: 'PAYSTACK' }] : [])
          ]}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Notes (Optional)</label>
        <textarea
          className="form-input"
          disabled={isPaystack}
          style={{ height: '70px', padding: '12px' }}
          placeholder="Additional details..."
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
        />
      </div>

      {/* Attached Receipt Management */}
      {!isPaystack && (
        <div className="form-group" style={{ marginTop: 16, marginBottom: 8 }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            Receipt Document Copy
          </label>

          {/* If there is a newly selected file */}
          {receiptFile ? (
            <div 
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--forest-faint)',
                border: '1px solid rgba(22, 101, 52, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <FileText size={18} color="var(--forest)" style={{ flexShrink: 0 }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {receiptFile.name} (New)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatFileSize(receiptFile.size)} • {receiptFile.type.replace('application/', '').toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReceiptFile(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                title="Cancel replacement"
              >
                <X size={16} />
              </button>
            </div>
          ) : formData.receiptUrl ? (
            /* If there is an existing attached receipt */
            <div 
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--ivory-dim)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                <FileText size={18} color="var(--forest)" style={{ flexShrink: 0 }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formData.receiptFileName || 'Attached Receipt'}
                  </div>
                  {formData.receiptFileSize ? (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatFileSize(formData.receiptFileSize)}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {formData.receiptUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.receiptUrl || isDownloadingReceipt) return
                      setIsDownloadingReceipt(true)
                      window.open(formData.receiptUrl, '_blank', 'noopener,noreferrer')
                      setTimeout(() => setIsDownloadingReceipt(false), 2000)
                    }}
                    disabled={isDownloadingReceipt}
                    className="btn btn--secondary btn--sm"
                    style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    {isDownloadingReceipt ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    <span>{isDownloadingReceipt ? 'Downloading...' : 'Download'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn--secondary btn--sm"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, receiptUrl: null, receiptFileName: null, receiptFileType: null, receiptFileSize: null })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', padding: 4 }}
                  title="Remove receipt"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ) : (
            /* No receipt attached yet */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '20px 16px',
                borderRadius: 12,
                border: `2px dashed ${isDragging ? 'var(--forest)' : 'var(--border)'}`,
                background: isDragging ? 'var(--forest-faint)' : 'var(--ivory-dim)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <UploadCloud size={24} style={{ color: isDragging ? 'var(--forest)' : 'var(--text-muted)' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                Attach document receipt copy
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                PDF, JPG or PNG (max 10MB)
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFileSelect(f)
              e.target.value = ''
            }}
          />
        </div>
      )}

    </Modal>
  )
}
