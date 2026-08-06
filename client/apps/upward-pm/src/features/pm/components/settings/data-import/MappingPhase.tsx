'use client'

import React, { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { ChevronDown, Plus, X, CalendarDays } from 'lucide-react'
import { ColumnDef, ColumnMapping, SplitConfig } from './types'
import { extractForField, scrub, splitPersonName, inferDateOrder, countDatesIn, type DateOrder } from './utils'

interface MappingPhaseProps {
  columns: ColumnDef[]
  userColumns: string[]
  mappings: { [sheet: string]: ColumnMapping[] }
  splitConfigs: { [sheet: string]: SplitConfig[] }
  activeSheet: string
  workbook: XLSX.WorkBook | null
  savedTemplates: { id: string; name: string; data: unknown }[]
  applyTemplate: (templateId: string) => void
  saveTemplate: () => void
  updateMapping: (sheetName: string, userColumn: string, systemField: string | null, entityType: string | null) => void
  setFieldColumn?: (sheetName: string, fieldKey: string, entityType: string, userColumn: string | null) => void
  addFieldColumn?: (sheetName: string, fieldKey: string, entityType: string, userColumn: string) => void
  removeFieldColumn?: (sheetName: string, fieldKey: string, userColumn: string) => void
  swapNameOrder?: boolean
  setSwapNameOrder?: (v: boolean) => void
  dateOrder?: DateOrder
  setDateOrder?: (v: DateOrder) => void
  toggleSplit: (userColumn: string) => void
  updateSplitConfig: (userColumn: string, updates: Partial<SplitConfig>) => void
  updateSplitPart: (userColumn: string, partIndex: number, field: string | null, entityType: string | null) => void
  addSplitPart: (userColumn: string) => void
  removeSplitPart: (userColumn: string, partIndex: number) => void
}

// What each field is called when it asks for itself
const QUESTIONS: Record<string, string> = {
  propertyAddress: 'The address',
  tenantFirstName: "The tenant's name",
  tenantLastName: "The tenant's surname",
  tenantEmail: "The tenant's email",
  tenantPhone: "The tenant's phone number",
  unitRentAmount: 'The rent',
  unitRentAmountPaid: 'How much has been paid',
  unitRentStartDate: 'When the rent started',
  unitRentDueDate: 'When the rent ends',
  unitName: 'The flat or unit name',
  propertyName: 'The property name',
  landlordFirstName: "The landlord's name",
  landlordLastName: "The landlord's surname",
  landlordEmail: "The landlord's email",
  landlordPhone: "The landlord's phone number",
}

const askFor = (col: ColumnDef) => QUESTIONS[col.key] || col.label

const NONE = '__none__'

export const MappingPhase: React.FC<MappingPhaseProps> = ({
  columns, userColumns, mappings, activeSheet, workbook,
  setFieldColumn, addFieldColumn, removeFieldColumn,
  swapNameOrder = false, setSwapNameOrder,
  dateOrder = 'dmy', setDateOrder,
}) => {
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [askDateOrder, setAskDateOrder] = useState(false)
  const [showOptional, setShowOptional] = useState(false)

  const rawByColumn = useMemo(() => {
    if (!workbook || !activeSheet) return {} as Record<string, string[]>
    const worksheet = workbook.Sheets[activeSheet]
    if (!worksheet) return {}
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][]
    if (!rows.length) return {}
    const headers = rows[0].map(h => scrub(h))
    const out: Record<string, string[]> = {}
    headers.forEach((h, i) => {
      if (!h) return
      out[h] = rows.slice(1).map(r => scrub(r?.[i])).filter(Boolean)
    })
    return out
  }, [workbook, activeSheet])

  const sheetMappings = mappings[activeSheet] || []
  const columnsFor = (fieldKey: string) =>
    sheetMappings.filter(m => m.systemField === fieldKey).map(m => m.userColumn)
  const columnFor = (fieldKey: string) => columnsFor(fieldKey)[0] || null

  const required = columns.filter(c => c.required && !c.readOnly)
  const optional = columns.filter(c => !c.required && !c.readOnly && c.key !== 'tenantLastName')
  const nameField = columns.find(c => c.key === 'tenantFirstName')

  const nameAnswered = columnsFor('tenantFirstName').length > 0
  const answered = required.filter(c =>
    c.key === 'tenantFirstName' ? nameAnswered : !!columnFor(c.key)
  ).length

  const pick = (field: ColumnDef, userColumn: string | null) => {
    setFieldColumn?.(activeSheet, field.key, field.category, userColumn)
    if (!userColumn) return
    const values = rawByColumn[userColumn] || []
    // Date order belongs to the column, decided once from every row
    if (field.type === 'date') {
      const inferred = inferDateOrder(values)
      if (inferred !== 'unknown') setDateOrder?.(inferred === 'iso' ? 'dmy' : inferred)
      setAskDateOrder(inferred === 'unknown')
    }
  }

  const addColumn = (field: ColumnDef, userColumn: string) => {
    addFieldColumn?.(activeSheet, field.key, field.category, userColumn)
    setAddingTo(null)
  }

  // The most expensive wrong pick in the file — show the other money columns beside it
  const otherMoneyColumns = (exclude: string | null) =>
    userColumns
      .filter(c => c !== exclude)
      .filter(c => {
        const vals = (rawByColumn[c] || []).slice(0, 3)
        return vals.length > 0 && vals.every(v => /^[₦N$£€]?\s*[\d,. ]+$/.test(v) && /\d{4,}/.test(v))
      })
      .slice(0, 2)

  const optionLabel = (col: string) => {
    const preview = (rawByColumn[col] || []).slice(0, 2).join(' · ')
    const short = preview.length > 46 ? `${preview.slice(0, 46)}…` : preview
    return short ? `${col} — ${short}` : col
  }

  const selectStyle = (filled: boolean): React.CSSProperties => ({
    width: '100%',
    height: 44,
    borderRadius: 10,
    border: `1px solid ${filled ? 'var(--forest)' : 'var(--border-strong)'}`,
    background: filled ? 'var(--forest-faint)' : 'var(--surface)',
    padding: '0 12px',
    fontSize: 14,
    fontWeight: 600,
    color: filled ? 'var(--forest-hover)' : 'var(--text-muted)',
    cursor: 'pointer',
  })

  // A plain render function, not a nested component — keeps the select mounted between renders
  const columnSelect = (
    value: string | null,
    onChange: (col: string | null) => void,
    placeholder: string,
    label: string,
  ) => (
    <select
      aria-label={label}
      value={value || ''}
      onChange={e => onChange(e.target.value === NONE || e.target.value === '' ? null : e.target.value)}
      style={selectStyle(!!value)}
    >
      <option value="">{placeholder}</option>
      {userColumns.map(c => (
        <option key={c} value={c}>{optionLabel(c)}</option>
      ))}
      <option value={NONE}>My sheet doesn&apos;t have this</option>
    </select>
  )

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 16,
    padding: '16px 0',
    borderBottom: '1px solid var(--border)',
  }

  // Our field · what it means · their column
  const cellLabel: React.CSSProperties = { flex: '1 1 200px', minWidth: 0, paddingTop: 8 }
  const cellDesc: React.CSSProperties = { flex: '1 1 240px', minWidth: 0, paddingTop: 9, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }
  const cellPick: React.CSSProperties = { flex: '1 1 320px', minWidth: 0 }

  const renderNameRow = () => {
    if (!nameField) return null
    const nameColumns = columnsFor('tenantFirstName')
    const samples = nameColumns.map(c => (rawByColumn[c] || [])[0] || '')
    const joined = samples.filter(Boolean).join(' ')

    let preview: { first: string; last: string; corporate: string } | null = null
    if (nameColumns.length === 1 && samples[0]) {
      preview = splitPersonName(samples[0], swapNameOrder)
    } else if (nameColumns.length > 1 && joined) {
      const parts = samples.filter(Boolean)
      preview = swapNameOrder
        ? { first: parts.slice(1).join(' '), last: parts[0] || '', corporate: '' }
        : { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] || '', corporate: '' }
    }

    return (
      <div style={rowStyle}>
        <div style={cellLabel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>Tenant name</span>
            {nameAnswered
              ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)' }}>✓</span>
              : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--clay)' }}>NEEDED</span>}
          </div>
        </div>

        <div style={cellDesc}>First and last name of the tenant</div>

        <div style={cellPick}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 7 }}>
            Select all the name columns you have.
          </div>

          {nameColumns.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {nameColumns.map((c, i) => (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, background: 'var(--forest-faint)', border: '1px solid var(--forest)', color: 'var(--forest-hover)', borderRadius: 8, padding: '5px 10px' }}>
                  <span style={{ opacity: 0.6 }}>{i + 1}</span> {c}
                  <button onClick={() => removeFieldColumn?.(activeSheet, 'tenantFirstName', c)} aria-label={`Remove ${c}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--forest-hover)', padding: 0, display: 'flex' }}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {nameColumns.length < 3 && (
            <select
              aria-label="Add a column holding part of the tenant's name"
              value=""
              onChange={e => { if (e.target.value) addFieldColumn?.(activeSheet, 'tenantFirstName', 'tenant', e.target.value) }}
              style={selectStyle(false)}
            >
              <option value="">{nameColumns.length === 0 ? 'Choose a column…' : 'Add another name column…'}</option>
              {userColumns.filter(c => !nameColumns.includes(c)).map(c => (
                <option key={c} value={c}>{optionLabel(c)}</option>
              ))}
            </select>
          )}

          {preview && (
            <div style={{ marginTop: 9, fontSize: 12, color: 'var(--text-secondary)' }}>
              we found{' '}
              {preview.corporate
                ? <strong style={{ color: 'var(--dark)' }}>{preview.corporate}</strong>
                : <>
                    <strong style={{ color: 'var(--dark)' }}>{preview.first}</strong>
                    {preview.last ? <> · <strong style={{ color: 'var(--dark)' }}>{preview.last}</strong></> : null}
                    <button
                      onClick={() => setSwapNameOrder?.(!swapNameOrder)}
                      style={{ marginLeft: 10, background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12 }}
                    >
                      swap
                    </button>
                  </>}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderField = (field: ColumnDef) => {
    const allColumns = columnsFor(field.key)
    const picked = allColumns[0] || null
    const extraColumns = allColumns.slice(1)
    const values = picked ? (rawByColumn[picked] || []) : []
    // When one cell holds a whole range, both date fields read from it
    const sharesDateColumn = field.key === 'unitRentDueDate' && picked && picked === columnFor('unitRentStartDate')
    const rangeShortfall = sharesDateColumn ? values.filter(v => countDatesIn(v) < 2).length : 0
    const found = values.slice(0, 2).map(v => extractForField(v, field)).filter(Boolean)
    const foundCount = values.filter(v => extractForField(v, field) !== '').length
    const moneyNeighbours = field.key === 'unitRentAmount' && picked ? otherMoneyColumns(picked) : []

    return (
      <div key={field.key} style={rowStyle}>
        <div style={cellLabel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{askFor(field)}</span>
            {picked
              ? <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest)' }}>✓</span>
              : field.required ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--clay)' }}>NEEDED</span> : null}
          </div>
        </div>

        <div style={cellDesc}>{field.description || ''}</div>

        <div style={cellPick}>
          {columnSelect(picked, c => pick(field, c), 'Choose a column…', askFor(field))}

          {extraColumns.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {extraColumns.map(c => (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, background: 'var(--forest-faint)', border: '1px solid var(--forest)', color: 'var(--forest-hover)', borderRadius: 8, padding: '5px 10px' }}>
                  + {c}
                  <button onClick={() => removeFieldColumn?.(activeSheet, field.key, c)} aria-label={`Remove ${c}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--forest-hover)', padding: 0, display: 'flex' }}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {picked && (
            <div style={{ marginTop: 9 }}>
              {found.map((v, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>
                  we found <strong style={{ color: 'var(--dark)', fontWeight: 700 }}>{v}</strong>
                </div>
              ))}
              {rangeShortfall > 0 && (
                <div style={{ fontSize: 11, color: '#854f0b', fontWeight: 600, marginTop: 4 }}>
                  {rangeShortfall} row{rangeShortfall === 1 ? '' : 's'} only have one date in that cell — we will ask you for the other
                </div>
              )}
              <div style={{ fontSize: 11, color: foundCount === values.length ? 'var(--forest)' : '#854f0b', fontWeight: 600, marginTop: 4 }}>
                {foundCount === values.length
                  ? `found it in all ${values.length}`
                  : `found it in ${foundCount} of ${values.length} — we will ask you about the rest`}
              </div>
            </div>
          )}

          {moneyNeighbours.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Also in your sheet:{' '}
              {moneyNeighbours.map((c, i) => (
                <span key={c}>
                  {i > 0 ? ' · ' : ''}
                  <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{c}</strong> {(rawByColumn[c] || [])[0]}
                </span>
              ))}
              {' '}— is the one above the right one?
            </div>
          )}

          {picked && addingTo !== field.key && (
            <button
              onClick={() => setAddingTo(field.key)}
              style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={13} /> Add another column
            </button>
          )}

          {addingTo === field.key && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {field.type === 'number' ? 'We will add them together' : 'We will join them together'}
              </div>
              <select
                aria-label={`Another column for ${askFor(field)}`}
                value=""
                onChange={e => { if (e.target.value) addColumn(field, e.target.value) }}
                style={selectStyle(false)}
              >
                <option value="">Choose another column…</option>
                {userColumns.filter(c => !allColumns.includes(c)).map(c => (
                  <option key={c} value={c}>{optionLabel(c)}</option>
                ))}
              </select>
              <button
                onClick={() => setAddingTo(null)}
                style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12 }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const dateColumn = columnFor('unitRentStartDate')
  const dateSamples = dateColumn ? (rawByColumn[dateColumn] || []).slice(0, 2) : []

  const headerRow = (
    <div className="desktop-only" style={{ display: 'flex', gap: 16, padding: '0 0 10px', borderBottom: '1px solid var(--border-strong)' }}>
      <span style={{ flex: '1 1 200px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Our field
      </span>
      <span style={{ flex: '1 1 240px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Description
      </span>
      <span style={{ flex: '1 1 320px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        Your column(s)
      </span>
    </div>
  )

  return (
    <div className="animate-slide-up" style={{ maxWidth: 960, margin: '0 auto', width: '100%', padding: '24px 20px' }}>
      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--dark)', margin: '0 0 4px' }}>
          Point us at each one
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
          Tell us which of your columns holds each thing. The same column can answer more than one.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)', whiteSpace: 'nowrap' }}>
          {answered} of {required.length} done
        </span>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--ivory-dark)', overflow: 'hidden' }}>
          <div style={{ width: `${required.length ? (answered / required.length) * 100 : 0}%`, height: '100%', background: 'var(--forest)', transition: 'width 0.2s' }} />
        </div>
      </div>

      {headerRow}
      {required.map(f => (
        f.key === 'tenantFirstName'
          ? <React.Fragment key={f.key}>{renderNameRow()}</React.Fragment>
          : renderField(f)
      ))}

      {askDateOrder && (
        <div style={{ background: 'var(--surface)', border: '1px solid #fac775', borderRadius: 12, padding: 18, margin: '18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <CalendarDays size={16} style={{ color: '#854f0b' }} />
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>One thing about your dates</h4>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Your dates look like {dateSamples[0] ? <strong style={{ color: 'var(--dark)' }}>{dateSamples[0]}</strong> : 'this'} and
            every number is 12 or under, so we cannot tell which is the day.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {(['dmy', 'mdy'] as const).map(order => (
              <button
                key={order}
                onClick={() => { setDateOrder?.(order); setAskDateOrder(false) }}
                className={dateOrder === order ? 'btn btn--primary' : 'btn btn--secondary'}
                style={{ height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600 }}
              >
                {order === 'dmy' ? '03/12 is 3 December' : '03/12 is 12 March'}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowOptional(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '13px 16px', cursor: 'pointer', marginTop: 18 }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>Bring more over — landlord, unit name, notes</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
          {optional.filter(c => columnFor(c.key)).length} of {optional.length}
          <ChevronDown size={15} style={{ transform: showOptional ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
        </span>
      </button>

      {showOptional && (
        <div style={{ marginTop: 18 }}>
          {headerRow}
          {optional.map(renderField)}
        </div>
      )}
    </div>
  )
}
