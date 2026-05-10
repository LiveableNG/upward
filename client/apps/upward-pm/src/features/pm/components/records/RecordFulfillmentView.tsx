'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, FileSpreadsheet, Download, Plus, X, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { format } from 'date-fns'

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
    const headers = ["Amount", "DueDate", "PaidDate"]
    const rows = [
      ["2000000", "2024-01-01", "2023-12-28"],
      ["2000000", "2024-02-01", "2024-02-05"],
      ["2000000", "2024-03-01", "2024-02-28"]
    ]
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `payment_records_template.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    success('Template downloaded!')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const parsedRecords = results.data.map((row: any, index: number) => ({
          id: Date.now() + index,
          amount: parseFloat((row['Amount'] || '0').toString().replace(/[^0-9.]/g, '')) || 0,
          dueDate: row['DueDate'] || '',
          paidDate: row['PaidDate'] || ''
        })).filter((r: any) => r.amount > 0 && r.dueDate && r.paidDate);
        
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

    setSubmitting(true)
    try {
      const payload = action === 'fulfill' 
        ? { records: previewRecords.map(({ id, ...rest }) => rest) }
        : {}

      await api.post(`/public/credibility/request/${uuid}/${action}`, payload)
      
      success(action === 'fulfill' ? 'Records submitted successfully!' : 'Request rejected.')
      setShowSuccess(true)
    } catch (err) {
      error(`Failed to ${action} request.`)
    } finally {
      setSubmitting(false)
    }
  }

  const addRow = () => {
    setPreviewRecords([...previewRecords, { 
      id: Date.now(), 
      amount: 0, 
      dueDate: '',
      paidDate: ''
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

  if (loading) return <div className="fulfillment-status animate-pulse">Loading request details...</div>

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
          The request status has been updated. This will significantly help the tenant build their credibility profile on Upward.
        </p>

        {isPublic && (
          <div className="upsell-card">
            <h3 className="upsell-card__title">Manage your properties easier with Upward PM</h3>
            <p className="upsell-card__text">
              Upward PM is the modern platform for property managers to automate rent collection, track leases, and find verified tenants.
            </p>
            <div className="upsell-card__actions">
              <button className="btn btn--primary" onClick={() => router.push('/signup')}>
                Create Free Account
              </button>
              <button className="btn btn--secondary" onClick={() => router.push('/login')}>
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

  return (
    <div className="fulfillment-content">
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
              <input type="file" accept=".csv" style={{display: 'none'}} onChange={handleFileUpload} />
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
          
          <div className="records-table__container">
            <table className="table">
              <thead>
                <tr>
                  <th>Amount (NGN)</th>
                  <th>Due Date</th>
                  <th>Paid Date</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {previewRecords.map((r, i) => (
                  <tr key={r.id}>
                    <td>
                      <input type="number" className="form-input" value={r.amount} onChange={e => updateRow(i, 'amount', parseFloat(e.target.value) || 0)} placeholder="e.g. 2000000" />
                    </td>
                    <td>
                      <input type="date" className="form-input" value={r.dueDate} onChange={e => updateRow(i, 'dueDate', e.target.value)} />
                    </td>
                    <td>
                      <input type="date" className="form-input" value={r.paidDate} onChange={e => updateRow(i, 'paidDate', e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-icon" onClick={() => removeRow(r.id)} style={{ color: 'var(--error)' }}>
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {previewRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No records added yet. Add a row or upload a CSV.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
