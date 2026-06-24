'use client'

import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Upload, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Calendar, 
  CreditCard, 
  Download,
  AlertCircle,
  X,
  User,
  MapPin
} from 'lucide-react'
import { getPublicRequestDetails, fulfillPublicRequest } from '../../dashboard/services/credibilityService'
import { useToast } from '@/components/common/Toast'
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils'
import '../styles/records.css'

interface Record {
  id: string
  amount: number
  startDate: string
  endDate: string
  dueDate: string
  paidDate: string
}

interface FillRecordClientProps {
  uuid: string
}

export const FillRecordClient: React.FC<FillRecordClientProps> = ({ uuid }) => {
  const [details, setDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual')
  const [records, setRecords] = useState<Record[]>([
    { id: Math.random().toString(36).substr(2, 9), amount: 0, startDate: '', endDate: '', dueDate: '', paidDate: '' }
  ])
  
  const { success: toastSuccess, error: toastError } = useToast()

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getPublicRequestDetails(uuid)
        setDetails(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load request details.')
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [uuid])

  const handleAddRow = () => {
    setRecords([...records, { id: Math.random().toString(36).substr(2, 9), amount: 0, startDate: '', endDate: '', dueDate: '', paidDate: '' }])
  }

  const handleRemoveRow = (id: string) => {
    if (records.length === 1) return
    setRecords(records.filter(r => r.id !== id))
  }

  const handleUpdateRecord = (id: string, field: keyof Record, value: any) => {
    setRecords(records.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value }
        if (field === 'startDate') {
          updated.dueDate = value
        }
        return updated
      }
      return r
    }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) return

      const lines = content.split('\n').filter(line => line.trim() !== '')
      // Skip header if it exists
      const dataLines = lines[0].toLowerCase().includes('amount') ? lines.slice(1) : lines

      const newRecords: Record[] = dataLines.map(line => {
        const [amount, startDate, endDate, paidDate] = line.split(',').map(s => s.trim())
        return {
          id: Math.random().toString(36).substr(2, 9),
          amount: parseFloat(amount) || 0,
          startDate: startDate || '',
          endDate: endDate || '',
          dueDate: startDate || '', // Calculated from startDate
          paidDate: paidDate || ''
        }
      })

      if (newRecords.length > 0) {
        setRecords(newRecords)
        setActiveTab('manual')
        toastSuccess(`${newRecords.length} records imported successfully.`)
      }
    }
    reader.readAsText(file)
  }

  const downloadTemplate = () => {
    const headers = 'Amount,Rent Start (YYYY-MM-DD),Rent End (YYYY-MM-DD),Paid Date (YYYY-MM-DD)\n'
    const example = '150000,2024-01-01,2024-01-31,2024-01-05\n'
    const blob = new Blob([headers + example], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'past_records_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSubmit = async () => {
    // Basic validation
    const validRecords = records.filter(r => r.amount > 0 && r.startDate && r.endDate && r.paidDate)
    if (validRecords.length === 0) {
      toastError('Please fill in at least one valid record (Amount, Period, and Paid Date are required).')
      return
    }

    setSubmitting(true)
    try {
      await fulfillPublicRequest(uuid, validRecords.map(r => ({
        amount: r.amount,
        dueDate: r.dueDate, // The calculated due date
        paidDate: r.paidDate
      })))
      setSuccess(true)
      toastSuccess('Records submitted successfully!')
    } catch (err: any) {
      toastError(err.message || 'Failed to submit records.')
    } finally {
      setSubmitting(false)
    }
  }

  const totalAmount = records.reduce((sum, r) => sum + (r.amount || 0), 0)

  if (loading) {
    return (
      <div className="records-page">
        <div className="records-container">
          <div className="animate-pulse">
            <div className="records-hero" style={{ height: 160 }}></div>
            <div className="records-card" style={{ height: 400 }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="records-page">
        <div className="records-container">
          <div className="records-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <AlertCircle size={48} color="var(--error)" style={{ marginBottom: 20 }} />
            <h2 style={{ marginBottom: 12 }}>Invalid Link</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{error}</p>
            <button className="btn-submit" onClick={() => window.location.reload()}>Try Again</button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="records-page">
        <div className="records-container">
          <div className="records-card success-view">
            <div className="success-icon">
              <CheckCircle size={48} />
            </div>
            <h2>Fulfillment Complete!</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 12, marginBottom: 32 }}>
              Thank you for providing the past tenancy records for <strong>{details?.user?.firstName} {details?.user?.lastName}</strong>. 
              The credibility score will be updated accordingly.
            </p>
            <p style={{ fontSize: 13, color: 'var(--clay)', fontWeight: 600 }}>You can safely close this window.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="records-page">
      <div className="records-container">
        <div className="records-hero">
          <span className="records-hero__label">Credibility Request</span>
          <h1 className="records-hero__title">Submit Past Records</h1>
          <div className="records-hero__meta">
            <div className="meta-item">
              <User size={16} />
              <span>Tenant: <strong>{details?.user?.firstName} {details?.user?.lastName}</strong></span>
            </div>
            <div className="meta-item">
              <MapPin size={16} />
              <span>Property: {details?.propertyAddress}</span>
            </div>
          </div>
        </div>

        <div className="records-card">
          <div className="records-tabs">
            <button 
              className={`records-tab ${activeTab === 'manual' ? 'records-tab--active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <Plus size={18} />
              Manual Entry
            </button>
            <button 
              className={`records-tab ${activeTab === 'bulk' ? 'records-tab--active' : ''}`}
              onClick={() => setActiveTab('bulk')}
            >
              <Upload size={18} />
              Bulk Upload
            </button>
          </div>

          {activeTab === 'bulk' ? (
            <div className="bulk-upload-section">
              <label className="upload-zone">
                <div className="upload-zone__icon">
                  <Upload size={32} />
                </div>
                <h3>Upload CSV File</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                  Drag and drop your spreadsheet here or click to browse
                </p>
                <input 
                  type="file" 
                  accept=".csv" 
                  style={{ display: 'none' }} 
                  onChange={handleFileUpload}
                />
              </label>

              <div style={{ textAlign: 'center' }}>
                <button className="template-link" onClick={downloadTemplate}>
                  <Download size={16} />
                  Download CSV Template
                </button>
              </div>

              <div style={{ marginTop: 32, padding: 16, background: 'var(--clay-faint)', borderRadius: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong>Note:</strong> Ensure your CSV follows the template format. 
                  Expected columns: Amount, Rent Start Date, Rent End Date, Paid Date.
                  After uploading, you can review and edit the data before submitting.
                </p>
              </div>
            </div>
          ) : (
            <div className="manual-entry-section">
              <div className="table-container">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Amount (₦)</th>
                      <th style={{ width: '40%' }}>Rent Period</th>
                      <th style={{ width: '25%' }}>Paid Date</th>
                      <th style={{ width: '10%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>₦</span>
                            <input 
                              type="text" 
                              inputMode="numeric"
                              className="table-input" 
                              style={{ paddingLeft: 28 }}
                              placeholder="0.00"
                              value={formatCurrencyInput(record.amount)}
                              onChange={(e) =>
                                handleUpdateRecord(record.id, 'amount', parseCurrencyInput(e.target.value) ?? 0)
                              }
                            />
                          </div>
                        </td>
                        <td>
                          <div className="period-input-group">
                            <input 
                              type="date" 
                              className="table-input" 
                              title="Start Date"
                              value={record.startDate}
                              onChange={(e) => handleUpdateRecord(record.id, 'startDate', e.target.value)}
                            />
                            <span className="period-separator">to</span>
                            <input 
                              type="date" 
                              className="table-input" 
                              title="End Date"
                              value={record.endDate}
                              onChange={(e) => handleUpdateRecord(record.id, 'endDate', e.target.value)}
                            />
                          </div>
                          {record.startDate && (
                            <div className="calculated-due-date">
                               Due: {new Date(record.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          )}
                        </td>
                        <td>
                          <input 
                            type="date" 
                            className="table-input" 
                            value={record.paidDate}
                            onChange={(e) => handleUpdateRecord(record.id, 'paidDate', e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            onClick={() => handleRemoveRow(record.id)}
                            style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Remove row"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="summary-row">
                      <td colSpan={1}>
                        <div className="total-label">Total Amount:</div>
                        <div className="total-value">₦{totalAmount.toLocaleString()}</div>
                      </td>
                      <td colSpan={3}>
                         <div className="record-count">{records.length} Record{records.length !== 1 ? 's' : ''}</div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button className="btn-add-row" onClick={handleAddRow}>
                <Plus size={16} />
                Add Another Payment Record
              </button>
            </div>
          )}

          <div className="records-footer">
            <button 
              className="btn-submit" 
              onClick={handleSubmit}
              disabled={submitting || records.length === 0}
            >
              {submitting ? 'Submitting...' : 'Submit Records'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

