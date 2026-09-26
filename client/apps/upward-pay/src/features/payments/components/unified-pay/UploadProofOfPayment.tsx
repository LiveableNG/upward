'use client'

import React, { useState, useEffect } from 'react'
import { UploadCloud, FileText, X, Image as ImageIcon, CheckCircle2, ShieldCheck } from 'lucide-react'
import { uploadProofOfPayment } from '../../services/paymentService'
import { useToast } from '@/components/common/Toast'
import { PayFlowPrimaryButton } from '@/features/dashboard/components/payment/PayPageShell'
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'

interface LineItemAllocation {
  id?: number
  name: string
  label: string
  totalAmount?: number
  remainingAmount?: number
  amount: number
}

interface UploadProofOfPaymentProps {
  paymentRequestUuid?: string
  userPropertyUuid?: string
  amount?: number
  currency?: string
  lineItems?: any[]
  onSuccess?: () => void
  onCancel?: () => void
  bankName?: string
  accountName?: string
  accountNumber?: string
  hideAccountDetails?: boolean
}

export function UploadProofOfPayment({
  paymentRequestUuid,
  userPropertyUuid,
  amount,
  currency = 'NGN',
  lineItems,
  onSuccess,
  onCancel,
  bankName,
  accountName,
  accountNumber,
  hideAccountDetails = false,
}: UploadProofOfPaymentProps) {
  const { success, error } = useToast()

  const [inputAmount, setInputAmount] = useState<string>(() => amount ? String(amount) : '')
  const [itemAllocations, setItemAllocations] = useState<LineItemAllocation[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploaded, setIsUploaded] = useState(false)

  useEffect(() => {
    if (lineItems && lineItems.length > 0) {
      let remainingToDistribute = amount ?? 0
      const initialAllocs = lineItems.map((item: any) => {
        const need = Number(item.amount || item.totalAmount || item.amountPaid || 0)
        const allocated = remainingToDistribute > 0 ? Math.min(remainingToDistribute, need > 0 ? need : remainingToDistribute) : need
        remainingToDistribute = Math.max(0, remainingToDistribute - allocated)
        return {
          id: item.id,
          name: item.name || item.label || 'Rent',
          label: item.label || item.name || 'Rent',
          totalAmount: item.totalAmount,
          remainingAmount: need,
          amount: allocated,
        }
      })
      setItemAllocations(initialAllocs)
      const sum = initialAllocs.reduce((acc, it) => acc + (it.amount || 0), 0)
      if (sum > 0) {
        setInputAmount(String(sum))
      }
    } else if (amount !== undefined && amount !== null && amount > 0) {
      setInputAmount(String(amount))
    }
  }, [lineItems, amount])

  const handleLineItemAmountChange = (index: number, val: number | null) => {
    const num = val ?? 0
    const updated = [...itemAllocations]
    updated[index] = { ...updated[index], amount: num }
    setItemAllocations(updated)
    const newTotal = updated.reduce((acc, it) => acc + (it.amount || 0), 0)
    setInputAmount(newTotal > 0 ? String(newTotal) : '')
  }

  const handleTotalAmountChange = (val: number | null) => {
    const newTotal = val ?? 0
    setInputAmount(newTotal > 0 ? String(newTotal) : '')

    if (itemAllocations.length === 0) return

    let remaining = newTotal
    const updated = itemAllocations.map((item, idx) => {
      if (idx === itemAllocations.length - 1) {
        return { ...item, amount: remaining }
      }
      const cap = item.remainingAmount && item.remainingAmount > 0 ? item.remainingAmount : (item.totalAmount || remaining)
      const alloc = Math.min(remaining, cap)
      remaining = Math.max(0, remaining - alloc)
      return { ...item, amount: alloc }
    })
    setItemAllocations(updated)
  }

  const handleFillLineItem = (index: number) => {
    const item = itemAllocations[index]
    const target = item.remainingAmount ?? item.totalAmount ?? item.amount
    handleLineItemAmountChange(index, target)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      if (selectedFile.size > 10 * 1024 * 1024) {
        error('File size must be less than 10MB')
        return
      }
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
      if (!allowedTypes.includes(selectedFile.type)) {
        error('Only PDF, JPG, and PNG files are allowed')
        return
      }
      setFile(selectedFile)
      setIsUploaded(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    const parsedAmount = Number(inputAmount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      error('Please enter a valid transfer amount greater than 0')
      return
    }

    setIsUploading(true)
    try {
      const sanitizedLineItems = itemAllocations.length > 0
        ? itemAllocations.map(item => ({
            id: item.id,
            name: item.name,
            label: item.label || item.name,
            amount: Number(item.amount) || 0,
            amountPaid: Number(item.amount) || 0,
          }))
        : undefined

      await uploadProofOfPayment({
        paymentRequestUuid,
        userPropertyUuid,
        amount: parsedAmount,
        currency,
        lineItems: sanitizedLineItems,
        file,
      })

      setIsUploaded(true)
      success('Proof of payment submitted successfully! It is now pending review.')
      if (onSuccess) {
        setTimeout(onSuccess, 1500)
      }
    } catch (err: any) {
      console.error('Submit error:', err)
      error(err.message || 'Failed to submit document. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setFile(null)
    setIsUploaded(false)
  }

  const parsedAmt = Number(inputAmount) || 0

  return (
    <div className="pay-flow__proof-upload">
      {!hideAccountDetails && bankName && accountNumber ? (
        <div className="pay-flow__transfer-account-summary">
          <p className="pay-flow__transfer-account-label">Transfer to</p>
          <p className="pay-flow__method-card-title">{accountName || 'Recipient'}</p>
          <p className="pay-flow__method-card-desc">
            {bankName ? `${bankName} · ` : ''}
            {accountNumber}
          </p>
        </div>
      ) : null}

      {/* Amount Transferred Input */}
      <div className="pay-flow__field" style={{ marginBottom: itemAllocations.length > 0 ? 14 : 20 }}>
        <label className="pay-flow__field-label" htmlFor="proof-amount-input">
          Amount transferred (Total)
        </label>
        <div className="pay-flow__input-wrap pay-flow__input-wrap--amount">
          <span className="pay-flow__amount-currency">₦</span>
          <input
            id="proof-amount-input"
            type="text"
            inputMode="numeric"
            placeholder="0"
            disabled={isUploading || isUploaded}
            value={inputAmount ? formatCurrencyInput(Number(inputAmount) || 0) : ''}
            onChange={(e) => {
              const parsed = parseCurrencyInput(e.target.value)
              handleTotalAmountChange(parsed)
            }}
          />
        </div>
        <p className="pay-flow__field-hint">
          Confirm the exact amount you sent via bank transfer so your manager can verify it.
        </p>
      </div>

      {/* Line Item Breakdown Card */}
      {itemAllocations.length > 0 && (
        <div className="pay-flow__allocation-card" style={{ marginBottom: 20 }}>
          <div className="pay-flow__allocation-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} style={{ color: 'var(--clay)' }} />
              <span className="pay-flow__allocation-title">Specify Line Item Breakdown</span>
            </div>
            <span className="pay-flow__allocation-sub">Enter amount per item</span>
          </div>

          <div className="pay-flow__allocation-list">
            {itemAllocations.map((item, idx) => {
              return (
                <div className="pay-flow__allocation-row" key={idx}>
                  <div className="pay-flow__allocation-item-meta">
                    <span className="pay-flow__allocation-item-name">{item.name}</span>
                    {item.remainingAmount !== undefined && (
                      <span className="pay-flow__allocation-item-due">
                        Due: {formatCurrency(item.remainingAmount, currency)}
                      </span>
                    )}
                  </div>

                  <div className="pay-flow__allocation-input-wrap">
                    <span className="pay-flow__allocation-curr">₦</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="pay-flow__allocation-input"
                      placeholder="0"
                      disabled={isUploading || isUploaded}
                      value={item.amount > 0 ? formatCurrencyInput(item.amount) : ''}
                      onChange={(e) => {
                        const parsed = parseCurrencyInput(e.target.value)
                        handleLineItemAmountChange(idx, parsed)
                      }}
                    />
                    {item.remainingAmount !== undefined && item.remainingAmount > item.amount && (
                      <button
                        type="button"
                        className="pay-flow__allocation-max-btn"
                        onClick={() => handleFillLineItem(idx)}
                        disabled={isUploading || isUploaded}
                      >
                        Max
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="pay-flow__allocation-footer">
            <span>Total allocated:</span>
            <strong>{formatCurrency(itemAllocations.reduce((acc, it) => acc + (it.amount || 0), 0), currency)}</strong>
          </div>
        </div>
      )}

      <p className="pay-flow__field-label">Upload receipt</p>
      <p className="pay-flow__field-hint pay-flow__proof-upload-hint">PDF, JPG, or PNG · max 10MB</p>

      {!file ? (
        <div className="pay-flow__proof-dropzone">
          <input
            type="file"
            className="pay-flow__proof-file-input"
            id="proof-upload"
            accept=".pdf,image/jpeg,image/png"
            onChange={handleFileSelect}
          />
          <label htmlFor="proof-upload" className="pay-flow__proof-dropzone-label">
            <UploadCloud size={28} />
            <span className="pay-flow__proof-dropzone-title">Choose a file</span>
            <span className="pay-flow__proof-dropzone-sub">Tap to select your payment receipt</span>
          </label>
        </div>
      ) : (
        <div className="pay-flow__proof-file">
          <div className="pay-flow__proof-file-icon">
            {file.type.includes('pdf') ? <FileText size={20} /> : <ImageIcon size={20} />}
          </div>
          <div className="pay-flow__proof-file-meta">
            <p className="pay-flow__proof-file-name" title={file.name}>
              {file.name}
            </p>
            <p className="pay-flow__proof-file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          {isUploaded ? (
            <CheckCircle2 size={20} className="pay-flow__proof-file-success" />
          ) : (
            <button
              type="button"
              className="pay-flow__proof-file-remove"
              onClick={handleRemove}
              disabled={isUploading}
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {file && !isUploaded ? (
        <div className="pay-flow__cta-wrap">
          <PayFlowPrimaryButton 
            onClick={handleUpload} 
            disabled={isUploading || parsedAmt <= 0} 
            loading={isUploading}
          >
            Submit proof ({formatCurrency(parsedAmt, currency)})
          </PayFlowPrimaryButton>
          {onCancel ? (
            <button
              type="button"
              className="pay-flow__cancel-link pay-flow__transfer-back-link"
              onClick={onCancel}
              disabled={isUploading}
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      {isUploaded ? (
        <div className="pay-flow__proof-success">
          <CheckCircle2 size={18} />
          <span>Proof submitted — pending review</span>
        </div>
      ) : null}

      <style jsx>{`
        .pay-flow__allocation-card {
          border: 1px solid var(--border-solid, #e2e8f0);
          border-radius: 14px;
          overflow: hidden;
          background: var(--surface, #ffffff);
        }

        .pay-flow__allocation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: var(--surface2, #f8fafc);
          border-bottom: 1px solid var(--border-solid, #e2e8f0);
        }

        .pay-flow__allocation-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text, #0f172a);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .pay-flow__allocation-sub {
          font-size: 11px;
          color: var(--clay, #b49a69);
          font-weight: 600;
        }

        .pay-flow__allocation-list {
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .pay-flow__allocation-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .pay-flow__allocation-item-meta {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .pay-flow__allocation-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #0f172a);
        }

        .pay-flow__allocation-item-due {
          font-size: 11px;
          color: var(--text-muted, #64748b);
        }

        .pay-flow__allocation-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .pay-flow__allocation-curr {
          position: absolute;
          left: 10px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted, #64748b);
          pointer-events: none;
        }

        .pay-flow__allocation-input {
          width: 125px;
          height: 36px;
          padding: 0 10px 0 24px;
          font-size: 14px;
          font-weight: 700;
          color: var(--text, #0f172a);
          background: var(--surface, #ffffff);
          border: 1px solid var(--border-solid, #cbd5e1);
          border-radius: 8px;
          outline: none;
          text-align: right;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .pay-flow__allocation-input:focus {
          border-color: var(--clay, #b49a69);
          box-shadow: 0 0 0 2px var(--clay-faint, rgba(180, 154, 105, 0.15));
        }

        .pay-flow__allocation-max-btn {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          background: var(--surface2, #f8fafc);
          border: 1px solid var(--border-solid, #cbd5e1);
          color: var(--clay, #b49a69);
          cursor: pointer;
          transition: all 0.15s;
        }

        .pay-flow__allocation-max-btn:hover:not(:disabled) {
          background: var(--clay-faint, rgba(180, 154, 105, 0.15));
          border-color: var(--clay, #b49a69);
        }

        .pay-flow__allocation-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-top: 1px solid var(--border-solid, #e2e8f0);
          background: var(--surface2, #f8fafc);
          font-size: 12px;
          color: var(--text-muted, #64748b);
        }
      `}</style>
    </div>
  )
}

