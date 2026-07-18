'use client'

import React, { useState, Suspense, useMemo, useEffect } from 'react'
import { DetailSkeleton } from '@/components/skeletons'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Download, Plus, X, User, History, Trash2, CreditCard, Building2, Calendar } from 'lucide-react'
import Papa from 'papaparse'
import { useToast } from '@/components/common/Toast'
import { cn } from '@/lib/utils'
import { useProperties, useUnits } from '@/features/pm/hooks/useProperties'
import { useBulkCreateTenantRecords } from '@/features/pm/hooks/useBulkCreateTenantRecords'
import { PageHeader } from '@/components/common/PageHeader'
import { downloadBlob } from '@/lib/download-helper'

function TenantRecordsImportContent() {
  const router = useRouter()
  const { success, info, error } = useToast()
  const { data: properties = [] } = useProperties()
  const bulkCreateMutation = useBulkCreateTenantRecords()

  // Tenant Details State
  const [selectedPropertyUuid, setSelectedPropertyUuid] = useState('')
  const [selectedUnitUuid, setSelectedUnitUuid] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  // Records State
  const [previewRows, setPreviewRows] = useState<any[]>([])

  const { data: units = [] } = useUnits(selectedPropertyUuid)

  const targetProperty = useMemo(() => 
    properties.find(p => p.uuid === selectedPropertyUuid),
    [properties, selectedPropertyUuid]
  )

  // Handle unit auto-fill
  useEffect(() => {
    if (selectedUnitUuid) {
      const unit = units.find(u => u.uuid === selectedUnitUuid)
      if (unit) {
        if (unit.tenantEmail) setEmail(unit.tenantEmail)
        if (unit.tenantFirstName) setFirstName(unit.tenantFirstName)
        if (unit.tenantLastName) setLastName(unit.tenantLastName)
        if (unit.tenantPhone) setPhone(unit.tenantPhone)
      }
    }
  }, [selectedUnitUuid, units])

  // Reset form when property changes
  useEffect(() => {
    setSelectedUnitUuid('')
    setEmail('')
    setFirstName('')
    setLastName('')
    setPhone('')
    setPreviewRows([])
  }, [selectedPropertyUuid])

  const handleDownloadTemplate = () => {
    const headers = ["Amount", "DueDate", "PaidDate"]
    const rows = [
      ["2000000", "2023-01-01", "2022-12-28"],
      ["2000000", "2024-01-01", "2024-01-05"]
    ]
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, 'upward_tenant_ledger_template.csv').then(() => {
      success('Template downloaded!')
    }).catch(err => console.error(err))
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

        const parsedRows = filteredData.map((row: any, index: number) => ({
          id: Date.now() + index,
          amount: parseFloat((row['Amount'] || '0').toString().replace(/[^0-9.]/g, '')) || 0,
          dueDate: row['DueDate'] || '',
          paidDate: row['PaidDate'] || ''
        })).filter((r: any) => r.amount > 0 || r.dueDate || r.paidDate);
        
        if (parsedRows.length === 0) {
          error('No valid records found in CSV.')
        } else {
          info(`Loaded ${parsedRows.length} payment records. Review and confirm.`)
          setPreviewRows(prev => [...prev, ...parsedRows])
        }
      },
      error: () => error('Error parsing CSV file.')
    })
    e.target.value = ''
  }

  const handleConfirmImport = () => {
    if (!targetProperty) return error('Please select a property first')
    if (!email) return error('Tenant email is compulsory')
    if (previewRows.length === 0) return error('No payment records to import')

    const invalidRecords = previewRows.some(r => !r.amount || !r.dueDate || !r.paidDate)
    if (invalidRecords) return error('All records must have an Amount, Due Date, and Paid Date')

    bulkCreateMutation.mutate({ 
      propertyAddress: targetProperty.address,
      unitUuid: selectedUnitUuid || undefined,
      firstName,
      lastName,
      email,
      phone,
      records: previewRows.map(r => ({
        amount: r.amount,
        dueDate: r.dueDate,
        paidDate: r.paidDate
      }))
    }, {
      onSuccess: (data: any) => {
        success(`Successfully processed ${data.data?.recordsAdded || previewRows.length} records for ${email}!`)
        router.push('/tenants')
      },
      onError: (err: any) => error(err?.response?.data?.message || 'Failed to import tenant records.')
    })
  }

  const addRow = () => {
    setPreviewRows([...previewRows, { id: Date.now(), amount: 0, dueDate: '', paidDate: '' }])
  }

  const updateRow = (index: number, field: string, value: any) => {
    const newArr = [...previewRows]
    newArr[index][field] = value
    setPreviewRows(newArr)
  }

  const removeRow = (id: any) => {
    setPreviewRows(previewRows.filter(u => u.id !== id))
  }

  const totalAmount = useMemo(() => previewRows.reduce((sum, r) => sum + (r.amount || 0), 0), [previewRows])

  return (
    <div className="records-page animate-fade-in">
      <PageHeader 
        title="Record Tenant Ledger" 
        subtitle="Manually upload or enter historical payment records to build a tenant's credibility score."
        showBack
      >
        <button className="btn btn--secondary" onClick={handleDownloadTemplate}>
          <Download size={18} />
          <span>Download Template</span>
        </button>
      </PageHeader>

      <div className="records-container">
        {/* Step 1: Tenant & Property */}
        <div className="records-section">
          <div className="section-header">
            <div className="step-badge">1</div>
            <div>
              <h3 className="section-title">Tenant Information</h3>
              <p className="section-desc">Who are these payment records for?</p>
            </div>
          </div>

          <div className="records-form-grid">
            <div className="form-group">
              <label className="form-label">Property *</label>
              <div className="input-with-icon">
                <Building2 size={16} className="input-icon" />
                <select className="form-input" value={selectedPropertyUuid} onChange={e => setSelectedPropertyUuid(e.target.value)}>
                  <option value="">Select a property...</option>
                  {properties.map(p => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Unit (Optional)</label>
              <div className="input-with-icon">
                <Plus size={16} className="input-icon" />
                <select className="form-input" value={selectedUnitUuid} onChange={e => setSelectedUnitUuid(e.target.value)} disabled={!selectedPropertyUuid}>
                  <option value="">No Unit / Unassigned</option>
                  {units.map(unit => <option key={unit.uuid} value={unit.uuid}>{unit.unitName} {unit.tenantEmail ? `(${unit.tenantEmail})` : ''}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tenant Email *</label>
              <input type="email" className="form-input" placeholder="tenant@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input" placeholder="+234..." value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">First Name</label>
              <input type="text" className="form-input" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input type="text" className="form-input" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Step 2: Ledger */}
        <div className="records-section">
          <div className="section-header section-header--between">
            <div className="flex items-center gap-3">
              <div className="step-badge">2</div>
              <div>
                <h3 className="section-title">Payment Ledger</h3>
                <p className="section-desc">Historical records of rent payments.</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <label className="btn btn--secondary btn--sm cursor-pointer">
                <FileSpreadsheet size={16} />
                <span>Upload CSV</span>
                <input type="file" accept=".csv" style={{display: 'none'}} onChange={handleFileUpload} />
              </label>
              <button className="btn btn--secondary btn--sm" onClick={addRow}>
                <Plus size={16} /> <span>Add Row</span>
              </button>
            </div>
          </div>

          <div className="ledger-content">
            {previewRows.length === 0 ? (
              <div className="empty-ledger">
                <History size={48} className="empty-icon" />
                <h3>No records added</h3>
                <p>Upload a CSV or add rows manually to build the payment history.</p>
                <button className="btn btn--primary btn--sm mt-4" onClick={addRow}><Plus size={16} /> Add First Record</button>
              </div>
            ) : (
              <div className="ledger-table-wrapper">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Amount (NGN) *</th>
                      <th>Due Date *</th>
                      <th>Paid Date *</th>
                      <th className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={r.id}>
                        <td>
                          <div className="input-with-icon">
                            <CreditCard size={14} className="input-icon" />
                            <input type="number" className="form-input" placeholder="0.00" value={r.amount || ''} onChange={e => updateRow(i, 'amount', parseFloat(e.target.value) || 0)} />
                          </div>
                        </td>
                        <td>
                          <div className="input-with-icon">
                            <Calendar size={14} className="input-icon" />
                            <input type="date" className="form-input" value={r.dueDate} onChange={e => updateRow(i, 'dueDate', e.target.value)} />
                          </div>
                        </td>
                        <td>
                          <div className="input-with-icon">
                            <Calendar size={14} className="input-icon" />
                            <input type="date" className="form-input" value={r.paidDate} onChange={e => updateRow(i, 'paidDate', e.target.value)} />
                          </div>
                        </td>
                        <td className="text-center">
                          <button className="btn-icon btn-icon--danger" onClick={() => removeRow(r.id)}><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="ledger-footer">
                  <div className="ledger-stat">
                    <span className="label">Total Records</span>
                    <span className="value">{previewRows.length}</span>
                  </div>
                  <div className="ledger-stat">
                    <span className="label">Total Amount</span>
                    <span className="value value--primary">₦{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="records-actions">
          <button className="btn btn--secondary" onClick={() => router.push('/tenants')}>Cancel</button>
          <div className="flex items-center gap-6">
            {email && <p className="text-sm text-text-muted hidden md:block">Saving for: <strong>{email}</strong></p>}
            <button 
              className="btn btn--primary py-3 px-8" 
              onClick={handleConfirmImport} 
              disabled={bulkCreateMutation.isPending || !email || !selectedPropertyUuid || previewRows.length === 0}
            >
              {bulkCreateMutation.isPending ? 'Processing...' : 'Confirm & Save Records'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .records-page { max-width: var(--max-width); margin: 0 auto; padding-bottom: 60px; }
        .records-container { display: flex; flex-direction: column; gap: 32px; margin-top: 32px; }
        
        .records-section { background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden; box-shadow: var(--shadow-md); }
        .section-header { padding: 24px; border-bottom: 1px solid var(--border); display: flex; align-items: flex-start; gap: 16px; background: var(--ivory-dim); }
        .section-header--between { justify-content: space-between; align-items: center; }
        
        .step-badge { 
          width: 32px; height: 32px; border-radius: 50%; background: var(--forest); color: white; 
          display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0;
          font-size: 14px;
        }
        .section-title { font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
        .section-desc { font-size: 13px; color: var(--text-muted); margin: 2px 0 0 0; }
        
        .records-form-grid { padding: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
        
        .ledger-content { padding: 0; }
        .empty-ledger { padding: 60px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .empty-icon { color: var(--forest); opacity: 0.1; }
        .empty-ledger h3 { font-size: 18px; font-weight: 600; margin: 0; }
        .empty-ledger p { color: var(--text-muted); max-width: 300px; margin: 0; font-size: 14px; line-height: 1.5; }
        
        .ledger-table-wrapper { display: flex; flex-direction: column; }
        .ledger-table { width: 100%; border-collapse: collapse; }
        .ledger-table th { padding: 12px 24px; text-align: left; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
        .ledger-table td { padding: 12px 24px; border-bottom: 1px solid var(--border); }
        .ledger-table tr:hover td { background: var(--ivory-faint); }
        
        .input-with-icon { position: relative; display: flex; align-items: center; }
        .input-icon { position: absolute; left: 12px; color: var(--text-muted); pointer-events: none; }
        .input-with-icon .form-input { padding-left: 36px; }
        
        .ledger-footer { padding: 16px 24px; background: var(--ivory-dim); display: flex; justify-content: flex-end; gap: 40px; }
        .ledger-stat { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
        .ledger-stat .label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
        .ledger-stat .value { font-size: 16px; font-weight: 700; color: var(--text); }
        .ledger-stat .value--primary { color: var(--forest); }
        
        .records-actions { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; }
        
        .btn-icon--danger:hover { background: var(--error-bg); color: var(--error); }

        @media (max-width: 768px) {
          .records-form-grid { grid-template-columns: 1fr; }
          .ledger-footer { flex-direction: column; gap: 16px; align-items: flex-end; }
        }
      `}</style>
    </div>
  )
}

export default function TenantRecordsImportPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <TenantRecordsImportContent />
    </Suspense>
  )
}
