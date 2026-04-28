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
        const endpoint = isPublic ? `/public/credibility/request/${uuid}` : `/pm/credibility-requests/${uuid}` // Wait, PM doesn't have /pm/credibility-requests/:uuid endpoint, they just have get all. I can use the public endpoint for BOTH since it's just fetching details by UUID!
        
        // Let's use the public endpoint for fetching details always, it just returns request info
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

  const handleAction = async (action: 'fulfill' | 'reject') => {
    if (action === 'fulfill' && previewRecords.length === 0) return error('No records to submit.')

    setSubmitting(true)
    try {
      const payload = action === 'fulfill' 
        ? { records: previewRecords.map(({ id, ...rest }) => rest) }
        : {}

      // Always use public endpoint to fulfill/reject
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

  if (loading) return <div className="p-12 text-center animate-pulse">Loading request details...</div>

  if (!requestDetails) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle size={48} className="text-clay mb-4" />
        <h2 className="text-xl font-bold mb-2">Request Not Found</h2>
        <p className="text-text-muted">The credibility request could not be found or has expired.</p>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-forest/10 rounded-full flex items-center justify-center mb-6">
          <FileSpreadsheet className="text-forest" size={32} />
        </div>
        <h2 className="text-3xl font-bold mb-4">Request Processed!</h2>
        <p className="text-text-muted text-lg mb-8">
          Thank you for providing the past payment records. This will significantly help the tenant build their credibility profile.
        </p>

        {isPublic && (
          <div className="bg-ivory-dim p-8 rounded-2xl border border-border w-full text-left">
            <h3 className="font-bold text-xl mb-2 text-forest">Manage your properties easier with Upward PM</h3>
            <p className="text-text-muted mb-6">
              Upward PM is the modern platform for property managers to automate rent collection, track leases, and find verified tenants.
            </p>
            <div className="flex gap-4">
              <button className="btn btn--primary flex-1 py-4" onClick={() => router.push('/signup')}>
                Create Free Account
              </button>
              <button className="btn btn--secondary flex-1 py-4" onClick={() => router.push('/login')}>
                Log In
              </button>
            </div>
          </div>
        )}

        {!isPublic && (
          <button className="btn btn--primary mt-4" onClick={() => router.push('/requests')}>
            Back to Requests
          </button>
        )}
      </div>
    )
  }

  if (requestDetails.status !== 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle size={48} className="text-clay mb-4" />
        <h2 className="text-xl font-bold mb-2">Request Already Processed</h2>
        <p className="text-text-muted">This request is marked as {requestDetails.status}.</p>
        {!isPublic && (
          <button className="btn btn--primary mt-6" onClick={() => router.push('/requests')}>
            Back to Requests
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="import-page animate-fade-in w-full max-w-5xl mx-auto py-8">
      <header className="import-header mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isPublic && (
            <button className="btn-icon" onClick={() => router.back()}>
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-forest">Provide Past Records</h1>
            <p className="text-text-muted">
              For <strong>{requestDetails.user?.firstName} {requestDetails.user?.lastName}</strong> at <strong>{requestDetails.property?.location?.address || 'Property'}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn--secondary" onClick={handleDownloadTemplate}>
            <Download size={18} />
            Template
          </button>
        </div>
      </header>

      <div className="import-container bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        {previewRecords.length === 0 && (
          <div className="p-8 border-b border-border bg-ivory-dim">
            <label className="import-dropzone border-2 border-dashed border-border rounded-xl p-16 flex flex-col items-center justify-center cursor-pointer hover:bg-surface-hover hover:border-forest transition-colors bg-surface">
              <FileSpreadsheet size={48} className="text-forest mb-4" />
              <h3 className="font-bold text-lg mb-1">Click to upload CSV</h3>
              <p className="text-text-muted">Or click 'Add Row' below to enter manually.</p>
              <input type="file" accept=".csv" style={{display: 'none'}} onChange={handleFileUpload} />
            </label>
          </div>
        )}

        <div className="import-preview flex flex-col">
          <div className="import-preview__header flex justify-between items-center p-6 pb-4">
            <h3 className="font-bold">Records to Submit ({previewRecords.length})</h3>
            <button className="btn btn--secondary btn--sm" onClick={addRow}>
              <Plus size={14} /> Add Row
            </button>
          </div>
          
          <div className="import-table-container overflow-x-auto border-t border-border">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-surface-hover text-text-muted uppercase tracking-wider text-xs font-semibold">
                  <th className="p-3 border-b border-border">Amount (NGN)</th>
                  <th className="p-3 border-b border-border">Due Date</th>
                  <th className="p-3 border-b border-border">Paid Date</th>
                  <th className="p-3 border-b border-border w-16"></th>
                </tr>
              </thead>
              <tbody>
                {previewRecords.map((r, i) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="p-2">
                      <input type="number" className="form-input w-full" value={r.amount} onChange={e => updateRow(i, 'amount', parseFloat(e.target.value) || 0)} placeholder="e.g. 2000000" />
                    </td>
                    <td className="p-2">
                      <input type="date" className="form-input w-full" value={r.dueDate} onChange={e => updateRow(i, 'dueDate', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <input type="date" className="form-input w-full" value={r.paidDate} onChange={e => updateRow(i, 'paidDate', e.target.value)} />
                    </td>
                    <td className="p-2 text-right">
                      <button className="text-clay hover:text-clay/80 p-2 rounded-lg hover:bg-clay/10 transition-colors" onClick={() => removeRow(r.id)}>
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {previewRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-text-muted">
                      No records added yet. Add a row or upload a CSV.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="import-footer flex justify-between items-center p-6 bg-surface border-t border-border">
          <button 
            className="btn btn--secondary text-clay border-clay hover:bg-clay/10" 
            onClick={() => handleAction('reject')}
            disabled={submitting}
          >
            Decline Request
          </button>
          
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
