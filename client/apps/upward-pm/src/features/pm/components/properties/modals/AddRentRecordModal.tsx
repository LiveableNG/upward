import React, { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Calendar, History, User, UploadCloud, FileText, X, CheckCircle2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'

interface AddRentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  unitName: string;
  unitUuid?: string;
  rentType?: string;
  initialAmount?: number;
  currentUnitStartDate?: string;
  currentTenantName?: string;
  maxCurrentAmount?: number;
}

export const AddRentRecordModal: React.FC<AddRentRecordModalProps> = ({
  isOpen, onClose, onSave, isPending, unitName, unitUuid, rentType, initialAmount, currentUnitStartDate, currentTenantName, maxCurrentAmount
}) => {
  const [paymentType, setPaymentType] = useState<'CURRENT' | 'PAST'>('CURRENT')
  const [isForCurrentTenant, setIsForCurrentTenant] = useState(true)
  const [formData, setFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    periodStart: '',
    periodEnd: '',
    tenantName: ''
  })
  const [dateError, setDateError] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { error } = useToast()

  useEffect(() => {
    if (isOpen) {
      setPaymentType('CURRENT')
      setIsForCurrentTenant(true)
      
      let defaultAmount = initialAmount?.toString() || '';
      if (maxCurrentAmount !== undefined) {
        defaultAmount = maxCurrentAmount.toString();
      }

      setFormData({
        amount: defaultAmount,
        paymentDate: new Date().toISOString().split('T')[0],
        periodStart: '',
        periodEnd: '',
        tenantName: ''
      })
      setDateError('')
      setReceiptFile(null)
      setIsDragging(false)
      setIsUploadingReceipt(false)
    }
  }, [isOpen, initialAmount, maxCurrentAmount])

  // Auto-calculate Period End based on Period Start and rentType
  useEffect(() => {
    if (paymentType === 'PAST' && formData.periodStart && rentType) {
      const start = new Date(formData.periodStart)
      if (isNaN(start.getTime())) return

      const end = new Date(start)
      if (rentType === 'Monthly') {
        end.setMonth(end.getMonth() + 1)
      } else if (rentType === 'Lease' || rentType === 'LEASE') {
        end.setFullYear(end.getFullYear() + 1)
      } else {
        end.setFullYear(end.getFullYear() + 1)
      }

      end.setDate(end.getDate() - 1)

      const formattedEnd = end.toISOString().split('T')[0]
      if (formattedEnd !== formData.periodEnd) {
        setFormData(prev => ({ ...prev, periodEnd: formattedEnd }))
      }
    }
  }, [formData.periodStart, rentType, paymentType])

  // Date validation for Past Payments
  useEffect(() => {
    if (paymentType === 'PAST' && formData.periodEnd && currentUnitStartDate) {
      if (new Date(formData.periodEnd) >= new Date(currentUnitStartDate)) {
        setDateError(`Past payment end date must be strictly before the unit's current rent start date (${new Date(currentUnitStartDate).toLocaleDateString()}).`)
      } else {
        setDateError('')
      }
    } else {
      setDateError('')
    }
  }, [formData.periodEnd, currentUnitStartDate, paymentType])

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async () => {
    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      error('Please enter a valid payment amount.')
      return
    }

    if (paymentType === 'CURRENT' && maxCurrentAmount !== undefined) {
      if (parseFloat(formData.amount) > maxCurrentAmount) {
        error(`Amount cannot exceed the remaining balance of ₦${maxCurrentAmount.toLocaleString()} for the current cycle.`)
        return
      }
    }

    if (!formData.paymentDate) {
      error('Please select a payment date.')
      return
    }

    if (paymentType === 'PAST') {
       if (!formData.periodStart) {
         error('Please select a period start date for the past payment.')
         return
       }
       if (!formData.periodEnd) {
         error('Please select a period end date for the past payment.')
         return
       }
       if (dateError) {
         error(dateError)
         return
       }
       if (!isForCurrentTenant && !formData.tenantName.trim()) {
         error('Please enter the name of the past tenant.')
         return
       }
    }

    let receiptData: {
      receiptUrl?: string
      receiptFileName?: string
      receiptFileType?: string
      receiptFileSize?: number
    } = {}

    if (receiptFile && unitUuid) {
      try {
        setIsUploadingReceipt(true)
        const uploadResult = await api.uploadPaymentReceipt(unitUuid, receiptFile)
        receiptData = {
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
      paymentType,
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate,
      periodStart: paymentType === 'PAST' ? formData.periodStart : undefined,
      periodEnd: paymentType === 'PAST' ? formData.periodEnd : undefined,
      isForCurrentTenant: paymentType === 'CURRENT' ? true : isForCurrentTenant,
      tenantName: (paymentType === 'PAST' && !isForCurrentTenant) ? formData.tenantName : undefined,
      method: 'Bank Transfer',
      status: 'SUCCESS',
      ...receiptData
    });
  }

  const isActionPending = isPending || isUploadingReceipt

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Rent Record"
      subtitle={`Record a payment for Unit ${unitName}`}
      maxWidth={550}
      footer={
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose} disabled={isActionPending}>
            Cancel
          </button>
          <button
            className="btn btn--primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={handleSubmit}
            disabled={isActionPending}
          >
            {isUploadingReceipt ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Uploading Receipt...</span>
              </>
            ) : isPending ? (
              'Saving...'
            ) : (
              'Save Record'
            )}
          </button>
        </div>
      }
    >
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <label className="form-label" style={{ marginBottom: 12 }}>Payment Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div 
            onClick={() => setPaymentType('CURRENT')}
            style={{
              padding: 16,
              borderRadius: 12,
              border: paymentType === 'CURRENT' ? '2px solid var(--forest)' : '1px solid var(--border)',
              background: paymentType === 'CURRENT' ? 'var(--forest-faint)' : 'var(--bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              opacity: paymentType === 'CURRENT' ? 1 : 0.6
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: paymentType === 'CURRENT' ? 'var(--forest)' : 'var(--text-muted)' }}>
                <Calendar size={18} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Current / Upcoming</span>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: paymentType === 'CURRENT' ? '5px solid var(--forest)' : '2px solid var(--border)',
                background: 'var(--bg)',
                transition: 'all 0.2s ease'
              }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>For the active rent cycle</span>
          </div>

          <div 
            onClick={() => setPaymentType('PAST')}
            style={{
              padding: 16,
              borderRadius: 12,
              border: paymentType === 'PAST' ? '2px solid var(--clay)' : '1px solid var(--border)',
              background: paymentType === 'PAST' ? 'var(--clay-faint)' : 'var(--bg)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              opacity: paymentType === 'PAST' ? 1 : 0.6
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: paymentType === 'PAST' ? 'var(--clay)' : 'var(--text-muted)' }}>
                <History size={18} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>Past Payment</span>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                border: paymentType === 'PAST' ? '5px solid var(--clay)' : '2px solid var(--border)',
                background: 'var(--bg)',
                transition: 'all 0.2s ease'
              }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>For historical records</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">Amount Paid (₦)</label>
          <input
            type="number"
            className="form-input"
            placeholder="e.g. 500000"
            max={paymentType === 'CURRENT' ? maxCurrentAmount : undefined}
            value={formData.amount}
            onChange={e => {
              let val = e.target.value;
              if (paymentType === 'CURRENT' && maxCurrentAmount !== undefined && parseFloat(val) > maxCurrentAmount) {
                val = maxCurrentAmount.toString();
              }
              setFormData({ ...formData, amount: val })
            }}
          />
          {paymentType === 'CURRENT' && maxCurrentAmount !== undefined && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Remaining balance: ₦{maxCurrentAmount.toLocaleString()}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Date Paid</label>
          <input
            type="date"
            className="form-input"
            value={formData.paymentDate}
            onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}
          />
        </div>
      </div>

      {paymentType === 'PAST' && (
        <div className="animate-fade-in" style={{ padding: 20, background: 'var(--ivory-dim)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Period Start</label>
              <input
                type="date"
                className="form-input"
                value={formData.periodStart}
                onChange={e => setFormData({ ...formData, periodStart: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Period End</label>
              <input
                type="date"
                className="form-input"
                value={formData.periodEnd}
                style={{ borderColor: dateError ? 'var(--error)' : 'var(--border)' }}
                onChange={e => setFormData({ ...formData, periodEnd: e.target.value })}
              />
            </div>
          </div>
          {dateError && (
            <div style={{ fontSize: 12, color: 'var(--error)', marginBottom: 16, marginTop: -8 }}>
              {dateError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <User size={14} /> Is this for the current tenant?
            </label>
            <label className="ios-switch">
              <input 
                type="checkbox" 
                id="isForCurrentTenant"
                checked={isForCurrentTenant}
                onChange={(e) => setIsForCurrentTenant(e.target.checked)}
              />
              <span className="ios-switch__slider"></span>
            </label>
          </div>

          {!isForCurrentTenant && (
            <div className="form-group animate-fade-in">
              <input
                type="text"
                className="form-input"
                placeholder="Enter past tenant's full name"
                value={formData.tenantName}
                onChange={e => setFormData({ ...formData, tenantName: e.target.value })}
              />
            </div>
          )}
          {isForCurrentTenant && currentTenantName && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              This record will be attached to <strong>{currentTenantName}</strong>.
            </div>
          )}
        </div>
      )}

      {/* Document Copy / Receipt Upload Zone */}
      <div className="form-group" style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>
            Receipt Document Copy <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}>(Optional)</span>
          </label>
          {receiptFile && (
            <span style={{ fontSize: 12, color: 'var(--forest)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 size={13} /> Ready to attach
            </span>
          )}
        </div>

        {receiptFile ? (
          <div 
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: 'var(--forest-faint)',
              border: '1px solid rgba(22, 101, 52, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              animation: 'fadeIn 0.2s ease-in-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
              <div 
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: 'white',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--forest)',
                  flexShrink: 0
                }}
              >
                <FileText size={20} />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div 
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--dark)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={receiptFile.name}
                >
                  {receiptFile.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {formatFileSize(receiptFile.size)} • {receiptFile.type.replace('application/', '').replace('image/', '').toUpperCase()}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReceiptFile(null)}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'white',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
              title="Remove file"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '24px 16px',
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
            <UploadCloud 
              size={28} 
              style={{ 
                color: isDragging ? 'var(--forest)' : 'var(--text-muted)',
                transition: 'transform 0.2s ease',
                transform: isDragging ? 'scale(1.1)' : 'scale(1)'
              }} 
            />
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
              Click to browse or drag & drop receipt here
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Supports PDF, PNG, or JPG (max 10MB)
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

    </Modal>
  )
}
