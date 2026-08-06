'use client'

import React, { useMemo, useState } from 'react'
import { CircleCheck, CircleAlert, ArrowRight, Home, User, Wallet, CalendarDays } from 'lucide-react'
import { ColumnDef } from './types'

type ImportRow = { id: string } & Record<string, string | number | undefined>

interface ReviewRecordsProps {
  columns: ColumnDef[]
  previewRows: ImportRow[]
  validationErrors: Record<string, string>
  updateRowField: (rowId: string, field: string, value: string) => void
}

const NAIRA: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' }

const money = (value: unknown, currency?: unknown) => {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[^\d.-]/g, ''))
  if (!isFinite(n)) return null
  return `${NAIRA[String(currency || 'NGN')] || ''}${n.toLocaleString('en-NG')}`
}

const readableDate = (value: unknown) => {
  if (!value) return null
  const d = new Date(String(value))
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const ReviewRecords: React.FC<ReviewRecordsProps> = ({
  columns, previewRows, validationErrors, updateRowField,
}) => {
  const [fixingIndex, setFixingIndex] = useState(0)
  const [showAll, setShowAll] = useState(false)

  const fieldLabel = (key: string) => columns.find(c => c.key === key)?.label || key

  // A record needs the manager whenever any of its cells failed validation
  const problems = useMemo(() => {
    const byRow: Record<string, string[]> = {}
    Object.keys(validationErrors).forEach(key => {
      const rowId = key.slice(0, key.lastIndexOf('-'))
      const field = key.slice(key.lastIndexOf('-') + 1)
      if (!byRow[rowId]) byRow[rowId] = []
      byRow[rowId].push(field)
    })
    return previewRows
      .map(r => ({ row: r, fields: byRow[r.id] || [] }))
      .filter(x => x.fields.length > 0)
  }, [previewRows, validationErrors])

  const complete = previewRows.length - problems.length

  const describe = (row: ImportRow) => {
    const unit = row.unitName || row.propertyName || 'Unnamed unit'
    const place = [row.propertyName, row.propertyArea, row.propertyState].filter(Boolean).join(', ')
    const address = row.propertyAddress || ''
    const tenant = row.tenantCommercialName
      || [row.tenantFirstName, row.tenantLastName].filter(Boolean).join(' ')
    const contact = [row.tenantPhone, row.tenantEmail].filter(Boolean).join(' · ')
    const rent = money(row.unitRentAmount, row.unitCurrency)
    const paid = money(row.unitRentAmountPaid, row.unitCurrency)
    const period = [readableDate(row.unitRentStartDate), readableDate(row.unitRentDueDate)].filter(Boolean).join(' to ')
    return { unit, place, address, tenant, contact, rent, paid, period }
  }

  const Line: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, display: 'flex', marginTop: 1 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  )

  const recordCard = (row: ImportRow, flagged: string[] = []) => {
    const d = describe(row)
    return (
      <div
        key={row.id}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${flagged.length ? '#fac775' : 'var(--border)'}`,
          borderRadius: 14,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dark)' }}>{d.unit}</div>
          {(d.address || d.place) && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {[d.address, d.place].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {d.tenant && <Line icon={<User size={15} />}>{d.tenant}{d.contact ? ` · ${d.contact}` : ''}</Line>}
        {d.rent && (
          <Line icon={<Wallet size={15} />}>
            Rent <strong style={{ color: 'var(--dark)', fontWeight: 700 }}>{d.rent}</strong>
            {d.paid ? <> · <strong style={{ color: 'var(--dark)', fontWeight: 700 }}>{d.paid}</strong> paid</> : null}
          </Line>
        )}
        {d.period && <Line icon={<CalendarDays size={15} />}>{d.period}</Line>}
      </div>
    )
  }


  // Everything landed — nothing to ask about
  if (problems.length === 0) {
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: 'var(--forest-faint)', border: '1px solid rgba(22,101,52,0.18)', borderRadius: 14, padding: '16px 18px' }}>
          <CircleCheck size={20} style={{ color: 'var(--forest)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--forest-hover)', marginBottom: 3 }}>
              All {previewRows.length} look complete
            </div>
            <div style={{ fontSize: 13, color: 'var(--forest-hover)', lineHeight: 1.5 }}>
              Have a look through, then press Import when you are happy.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(showAll ? previewRows : previewRows.slice(0, 5)).map(r => recordCard(r))}
        </div>

        {previewRows.length > 5 && !showAll && (
          <button onClick={() => setShowAll(true)} className="btn btn--secondary" style={{ borderRadius: 10, height: 40, fontSize: 13, fontWeight: 600 }}>
            Show all {previewRows.length}
          </button>
        )}

      </div>
    )
  }

  const current = problems[Math.min(fixingIndex, problems.length - 1)]
  const d = describe(current.row)

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', margin: '0 0 6px' }}>
          We read {previewRows.length} unit{previewRows.length === 1 ? '' : 's'} from your file
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--forest)' }}>{complete} look complete.</strong>{' '}
          <strong style={{ color: '#854f0b' }}>{problems.length} need you.</strong> Nothing is saved until you press
          Import.
        </p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid #fac775', borderRadius: 14, padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#854f0b' }}>
            <CircleAlert size={15} /> Needs you
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {Math.min(fixingIndex + 1, problems.length)} of {problems.length}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', marginBottom: 3 }}>{d.unit}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {[d.address, d.place].filter(Boolean).join(' · ') || 'No address read'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {current.fields.map(field => {
            const raw = current.row[field]
            return (
              <div key={field}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--dark)', marginBottom: 4 }}>
                  {questionFor(fieldLabel(field))}
                </label>
                {raw !== '' && raw !== undefined && raw !== null && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 7px' }}>
                    Your file says <span style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px', color: 'var(--text-secondary)' }}>{String(raw)}</span>
                  </p>
                )}
                <input
                  defaultValue={raw ?? ''}
                  onBlur={e => updateRowField(current.row.id, field, e.target.value)}
                  placeholder={fieldLabel(field)}
                  style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border-strong)', padding: '0 12px', fontSize: 14, color: 'var(--dark)', background: 'var(--surface)' }}
                />
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 18 }}>
          <button
            onClick={() => setFixingIndex(i => Math.min(i + 1, problems.length - 1))}
            className="btn btn--primary"
            style={{ borderRadius: 10, height: 42, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}
          >
            Done, next <ArrowRight size={15} />
          </button>
          <button
            onClick={() => setFixingIndex(i => Math.min(i + 1, problems.length - 1))}
            className="btn btn--secondary"
            style={{ borderRadius: 10, height: 42, fontSize: 13, fontWeight: 600 }}
          >
            Skip this one
          </button>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: 'var(--forest)', marginBottom: 10 }}>
          <Home size={14} /> {complete} ready to import
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {previewRows
            .filter(r => !problems.some(p => p.row.id === r.id))
            .slice(0, showAll ? undefined : 3)
            .map(r => recordCard(r))}
        </div>
        {complete > 3 && !showAll && (
          <button onClick={() => setShowAll(true)} className="btn btn--secondary" style={{ marginTop: 10, borderRadius: 10, height: 38, fontSize: 13, fontWeight: 600, width: '100%' }}>
            Show all {complete}
          </button>
        )}
      </div>

    </div>
  )
}

// Field labels are our vocabulary; questions are theirs
const questionFor = (label: string) => {
  const l = label.toLowerCase()
  if (l.includes('rent') && l.includes('amount')) return 'How much is the rent?'
  if (l.includes('paid')) return 'How much has been paid?'
  if (l.includes('address')) return 'What is the address?'
  if (l.includes('email')) return "What is the tenant's email?"
  if (l.includes('phone')) return "What is the tenant's phone number?"
  if (l.includes('start')) return 'When did the rent start?'
  if (l.includes('end') || l.includes('due')) return 'When does the rent end?'
  if (l.includes('first')) return "What is the tenant's first name?"
  if (l.includes('last')) return "What is the tenant's last name?"
  return `What is the ${label.toLowerCase()}?`
}
