'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { FileSpreadsheet, Download, Plus, X, AlertCircle, LogIn } from 'lucide-react'
import Papa from 'papaparse'
import { useToast } from '@/components/common/Toast'
import { api } from '@/lib/api'
import { DataTable, Column } from '@/components/common/DataTable'
import { downloadBlob } from '@/lib/download-helper'
import { ListSkeleton } from '@/components/skeletons'

export function RecordFulfillmentView({ uuid, isPublic = false }: { uuid: string, isPublic?: boolean }) {
  const router = useRouter()
  const { success, info, error } = useToast()

  const [requestDetails, setRequestDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [previewRecords, setPreviewRecords] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await api.get(`/public/credibility/request/${uuid}`)
        setRequestDetails(res)
      } catch (err) {
        error('Failed to load request details.')
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [uuid])

  const handleDownloadTemplate = () => {
    const headers = ['Amount', 'PaymentDate', 'PeriodStart', 'PeriodEnd', 'DueDate', 'Notes']
    const rentVal = requestDetails?.rentAmount ? String(requestDetails.rentAmount) : '2000000'
    const rows = [
      [rentVal, '2024-01-10', '2024-01-01', '2024-12-31', '2024-01-15', '2024 Annual Rent Payment'],
      [rentVal, '2025-01-12', '2025-01-01', '2025-12-31', '2025-01-15', '2025 Annual Rent Payment'],
    ]

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `rent_history_template_${requestDetails?.user?.lastName || 'tenant'}.csv`).then(() => {
      success('Template downloaded!')
    }).catch((err: any) => console.error(err))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results: any) => {
        // Filter out completely empty rows
        const filteredData = (results.data || []).filter((row: any) => 
          Object.values(row).some(val => val !== null && val !== undefined && val.toString().trim() !== '')
        )

        const parsedRecords = filteredData.map((row: any, index: number) => {
          const rawAmount = row['Amount'] || row['amount'] || '0'
          const amount = parseFloat(rawAmount.toString().replace(/[^0-9.]/g, '')) || 0
          const paymentDate = row['PaymentDate'] || row['paymentDate'] || row['PaidDate'] || row['paidDate'] || ''
          const periodStart = row['PeriodStart'] || row['periodStart'] || ''
          const periodEnd = row['PeriodEnd'] || row['periodEnd'] || ''
          const dueDate = row['DueDate'] || row['dueDate'] || ''
          const notes = row['Notes'] || row['notes'] || ''

          return {
            id: Date.now() + index,
            amount,
            paymentDate,
            periodStart,
            periodEnd,
            dueDate,
            notes,
          }
        }).filter((r: any) => r.amount > 0 && (r.paymentDate || r.dueDate || r.periodStart))
        
        info(`Previewing ${parsedRecords.length} records.`)
        setPreviewRecords(parsedRecords)
      },
      error: () => error('Error parsing CSV file.')
    })
    e.target.value = ''
  }

  const handleMarkAsDone = async () => {
    setSubmitting(true)
    try {
      await api.patch(`/pm/credibility-requests/${uuid}/done`)
      success('Request marked as done!')
      setShowSuccess(true)
    } catch (err) {
      error('Failed to mark request as done.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (action: 'fulfill' | 'reject') => {
    if (action === 'fulfill' && previewRecords.length === 0) return error('No records to submit.')

    // Validate rows
    if (action === 'fulfill') {
      const invalidRow = previewRecords.find(r => !r.amount || r.amount <= 0 || (!r.paymentDate && !r.dueDate && !r.periodStart))
      if (invalidRow) {
        return error('Please make sure each record has an amount and at least a Payment Date or Due Date.')
      }
    }

    setSubmitting(true)
    try {
      const payload = action === 'fulfill' 
        ? {
            records: previewRecords.map(({ id, ...rest }) => ({
              amount: rest.amount,
              paymentDate: rest.paymentDate || rest.paidDate || rest.dueDate,
              paidDate: rest.paymentDate || rest.paidDate || rest.dueDate,
              periodStart: rest.periodStart || undefined,
              periodEnd: rest.periodEnd || undefined,
              dueDate: rest.dueDate || rest.periodStart || rest.paymentDate,
              notes: rest.notes || undefined,
            }))
          }
        : {}

      await api.post(`/public/credibility/request/${uuid}/${action}`, payload)
      
      success(action === 'fulfill' ? 'Records submitted successfully!' : 'Request rejected.')
      setShowSuccess(true)
    } catch (err: any) {
      error(err?.response?.data?.message || err?.message || `Failed to ${action} request.`)
    } finally {
      setSubmitting(false)
    }
  }

  const addRow = () => {
    setPreviewRecords([...previewRecords, { 
      id: Date.now(), 
      amount: requestDetails?.rentAmount || 0, 
      paymentDate: '',
      periodStart: '',
      periodEnd: '',
      dueDate: '',
      notes: ''
    }])
  }

  const updateRow = (index: number, field: string, value: any) => {
    const newArr = [...previewRecords]
    newArr[index][field] = value
    setPreviewRecords(newArr)
  }

  const removeRow = (id: any) => {
    setPreviewRecords(previewRecords.filter(r => r.id !== id))
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    fontSize: '13px',
    background: 'var(--surface)',
    outline: 'none',
  }

  const columns: Column<any>[] = [
    {
      header: 'Amount (NGN)',
      width: '160px',
      render: (r, i) => (
        <input 
          type="number" 
          className="form-input" 
          value={r.amount || ''} 
          onChange={e => updateRow(i, 'amount', parseFloat(e.target.value) || 0)} 
          placeholder="e.g. 2000000" 
          style={inputStyle}
        />
      )
    },
    {
      header: 'Payment Date',
      width: '150px',
      render: (r, i) => (
        <input 
          type="date" 
          className="form-input" 
          value={r.paymentDate || ''} 
          onChange={e => updateRow(i, 'paymentDate', e.target.value)} 
          style={inputStyle}
        />
      )
    },
    {
      header: 'Period Start',
      width: '150px',
      render: (r, i) => (
        <input 
          type="date" 
          className="form-input" 
          value={r.periodStart || ''} 
          onChange={e => updateRow(i, 'periodStart', e.target.value)} 
          style={inputStyle}
        />
      )
    },
    {
      header: 'Period End',
      width: '150px',
      render: (r, i) => (
        <input 
          type="date" 
          className="form-input" 
          value={r.periodEnd || ''} 
          onChange={e => updateRow(i, 'periodEnd', e.target.value)} 
          style={inputStyle}
        />
      )
    },
    {
      header: 'Due Date',
      width: '150px',
      render: (r, i) => (
        <input 
          type="date" 
          className="form-input" 
          value={r.dueDate || ''} 
          onChange={e => updateRow(i, 'dueDate', e.target.value)} 
          style={inputStyle}
        />
      )
    },
    {
      header: 'Notes',
      render: (r, i) => (
        <input 
          type="text" 
          className="form-input" 
          value={r.notes || ''} 
          onChange={e => updateRow(i, 'notes', e.target.value)} 
          placeholder="e.g. Annual Rent"
          style={inputStyle}
        />
      )
    },
    {
      header: '',
      align: 'center',
      width: '45px',
      render: (r) => (
        <button 
          type="button" 
          className="btn-icon" 
          onClick={() => removeRow(r.id)} 
          style={{ color: 'var(--error)', background: 'transparent', border: 'none', cursor: 'pointer' }}
          title="Remove record"
        >
          <X size={16} />
        </button>
      )
    }
  ];

  if (loading) return <ListSkeleton />

  if (!requestDetails) {
    return (
      <div className="fulfillment-status">
        <AlertCircle size={48} className="text-accent" style={{ marginBottom: '16px' }} />
        <h2 className="fulfillment-status__title">Request Not Found</h2>
        <p className="fulfillment-status__text">The credibility request could not be found or has expired.</p>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="fulfillment-status">
        <div className="fulfillment-status__icon-wrapper">
          <FileSpreadsheet size={32} />
        </div>
        <h2 className="fulfillment-status__title">Request Processed!</h2>
        <p className="fulfillment-status__text">
          The past tenancy records have been securely added and verified. This directly updates the tenant's Upward Rent Passport score.
        </p>

        {isPublic && (
          <div className="upsell-card">
            <h3 className="upsell-card__title">Manage your properties easier with Upward PM</h3>
            <p className="upsell-card__text">
              Upward PM is the modern platform for property managers to automate rent collection, track leases, and find verified tenants.
            </p>
            <div className="upsell-card__actions">
              <button className="btn btn--primary" onClick={() => router.push(Capacitor.isNativePlatform() ? '/signup' : '/pm-signup')}>
                Create Free Account
              </button>
              <button className="btn btn--secondary" onClick={() => router.push(Capacitor.isNativePlatform() ? '/login' : '/pm-login')}>
                Log In
              </button>
            </div>
          </div>
        )}

        {!isPublic && (
          <button className="btn btn--primary" onClick={() => router.push('/requests')}>
            Back to Requests
          </button>
        )}
      </div>
    )
  }

  if (requestDetails.status !== 'PENDING') {
    return (
      <div className="fulfillment-status">
        <AlertCircle size={48} className="text-accent" style={{ marginBottom: '16px' }} />
        <h2 className="fulfillment-status__title">Request Already Processed</h2>
        <p className="fulfillment-status__text">This request is marked as {requestDetails.status}.</p>
        {!isPublic && (
          <button className="btn btn--primary" onClick={() => router.push('/requests')}>
            Back to Requests
          </button>
        )}
      </div>
    )
  }

  const pmLoginUrl = Capacitor.isNativePlatform() 
    ? '/login' 
    : `/pm-login?redirect=${encodeURIComponent(`/requests/${uuid}`)}`

  return (
    <div className="fulfillment-content">
      {isPublic && (
        <div className="fulfillment-login-banner animate-fade-in">
          <div className="fulfillment-login-banner__info">
            <span className="fulfillment-login-banner__title">Are you a registered Property Manager on Upward?</span>
            <span className="fulfillment-login-banner__sub">Log in to process this request directly within your management portal and link this property.</span>
          </div>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => router.push(pmLoginUrl)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <LogIn size={14} /> Log in to PM Portal
          </button>
        </div>
      )}

      <header className="fulfillment-content__header" style={{ marginBottom: '24px' }}>
        <h1 className="fulfillment-content__title">Provide Past Records</h1>
        <p className="fulfillment-content__meta">
          For <strong>{requestDetails.user?.firstName} {requestDetails.user?.lastName}</strong> at <strong>{requestDetails.propertyAddress}</strong>
        </p>
      </header>

      <div className="fulfillment-card">
        {previewRecords.length === 0 && (
          <div className="dropzone">
            <label className="dropzone__inner">
              <FileSpreadsheet size={48} className="dropzone__icon" />
              <h3 className="dropzone__title">Click to upload CSV</h3>
              <p className="dropzone__text">Or click 'Add Row' below to enter manually.</p>
              <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>
        )}

        <div className="records-table">
          <div className="records-table__header">
            <h3 className="records-table__title">Records to Submit ({previewRecords.length})</h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn--secondary btn--sm" onClick={handleDownloadTemplate}>
                <Download size={14} /> Template
              </button>
              <button className="btn btn--secondary btn--sm" onClick={addRow}>
                <Plus size={14} /> Add Row
              </button>
            </div>
          </div>
          
          <DataTable
            columns={columns}
            data={previewRecords}
            emptyMessage="No records added yet. Add a row or upload a CSV."
            keyExtractor={(r) => r.id}
          />
        </div>

        <div className="fulfillment-footer">
          <div className="fulfillment-footer__group">
            <button 
              className="btn btn--secondary btn--decline" 
              onClick={() => handleAction('reject')}
              disabled={submitting}
            >
              Decline
            </button>
            {!isPublic && (
              <button 
                className="btn btn--secondary btn--forest-outline" 
                onClick={handleMarkAsDone}
                disabled={submitting}
              >
                Mark as Done
              </button>
            )}
          </div>
          
          <button 
            className="btn btn--primary" 
            onClick={() => handleAction('fulfill')} 
            disabled={submitting || previewRecords.length === 0}
          >
            {submitting ? 'Processing...' : 'Submit Records'}
          </button>
        </div>
      </div>
    </div>
  )
}
