import React, { useMemo } from 'react'
import { AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import { cn } from './utils'
import type { ColumnDef, ColumnMapping, SplitConfig } from './types'
import { getSplitPreview } from './utils'
import * as XLSX from 'xlsx'

export interface FormSelectProps {
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  placeholder?: string
  triggerStyle?: React.CSSProperties
  style?: React.CSSProperties
  searchable?: boolean
}

export function FormSelect({ value, onChange, options, placeholder, triggerStyle, style, searchable }: FormSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        padding: '0 12px',
        border: '1px solid var(--border)',
        outline: 'none',
        background: 'white',
        ...triggerStyle,
        ...style
      }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}



interface MappingPhaseProps {
  columns: ColumnDef[]
  userColumns: string[]
  mappings: { [sheet: string]: ColumnMapping[] }
  splitConfigs: { [sheet: string]: SplitConfig[] }
  activeSheet: string
  workbook: XLSX.WorkBook | null
  updateMapping: (sheetName: string, userColumn: string, systemField: string | null, entityType: string | null) => void
  toggleSplit: (userColumn: string) => void
  updateSplitConfig: (userColumn: string, updates: Partial<SplitConfig>) => void
  updateSplitPart: (userColumn: string, partIndex: number, field: string | null, entityType: string | null) => void
  addSplitPart: (userColumn: string) => void
  removeSplitPart: (userColumn: string, partIndex: number) => void
  duplicateMappings: { field: string, columns: string[] }[]
  missingRequired: ColumnDef[]
}

export const MappingPhase: React.FC<MappingPhaseProps> = ({
  columns, userColumns, mappings, splitConfigs, activeSheet, workbook,
  updateMapping, toggleSplit,
  updateSplitConfig, updateSplitPart, addSplitPart, removeSplitPart,
  duplicateMappings, missingRequired
}) => {
  const systemFieldsGrouped = useMemo(() => {
    const groups: Record<string, ColumnDef[]> = {}
    columns.forEach(col => {
      if (!groups[col.category]) groups[col.category] = []
      groups[col.category].push(col)
    })
    return groups
  }, [columns])

  return (
    <div className="mapping-layout animate-slide-up" style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <div className="mapping-main" style={{ width: '100%' }}>
        {userColumns.map((col, idx) => {
          const mapping = (mappings[activeSheet] || []).find(m => m.userColumn === col)
          const isSkipped = mapping?.entityType === 'skip'
          const mappedField = mapping?.systemField
          
          const splitConfig = (splitConfigs[activeSheet] || []).find(s => s.userColumn === col)
          const isSplit = !!splitConfig

          const isDuplicate = mappedField ? duplicateMappings.some(d => d.field === mappedField) : false

          const categoryOptions = [
            ...Object.keys(systemFieldsGrouped).map(cat => ({
              label: cat.charAt(0).toUpperCase() + cat.slice(1),
              value: cat
            })),
            { label: 'Ignore / Skip Column', value: 'skip' }
          ]

          const fieldOptions = mapping?.entityType && mapping.entityType !== 'skip'
            ? systemFieldsGrouped[mapping.entityType]?.map(f => ({
                label: `${f.label}${f.required ? ' *' : ''}`,
                value: f.key
              })) || []
            : []

          return (
            <div key={idx} className={cn('mapping-card', 
              mappedField && !isSplit && !isDuplicate ? 'mapping-card--success' : '',
              isDuplicate ? 'mapping-card--error' : '',
              isSplit ? 'mapping-card--split' : '',
              isSkipped && !isSplit ? 'mapping-card--skipped' : ''
            )}>
              <div className="mapping-card__header">
                <div className="mapping-card__title">
                  <span>{col}</span>
                  {!isSplit && mappedField && !isDuplicate && <CheckCircle size={16} color="var(--forest)"/>}
                  {isSplit && <CheckCircle size={16} color="var(--clay)"/>}
                  {isDuplicate && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                      <AlertCircle size={14} /> Mapped Multiple Times
                    </span>
                  )}
                </div>
                <div className="mapping-card__actions">
                  <button 
                    className={cn('delimiter-btn', isSplit && 'delimiter-btn--active')}
                    onClick={() => toggleSplit(col)}
                  >
                    {isSplit ? 'Cancel Split' : 'Split Column'}
                  </button>
                </div>
              </div>

              {!isSplit ? (
                <div className="mapping-card__body">
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Entity Category
                    </label>
                    <FormSelect
                      value={mapping?.entityType || ''}
                      onChange={(val) => updateMapping(activeSheet, col, null, val)}
                      options={categoryOptions}
                      placeholder="-- Select Category --"
                      triggerStyle={{ height: 42, borderRadius: 10 }}
                    />
                  </div>

                  {mapping?.entityType && mapping.entityType !== 'skip' ? (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        System Target Field
                      </label>
                      <FormSelect
                        value={mappedField || ''}
                        onChange={(val) => updateMapping(activeSheet, col, val, mapping.entityType)}
                        options={fieldOptions}
                        placeholder="-- Select Field --"
                        triggerStyle={{ height: 42, borderRadius: 10, borderColor: isDuplicate ? 'var(--error)' : undefined }}
                        searchable
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', paddingBottom: 10 }}>
                        {isSkipped ? 'Column will be excluded from import' : 'Assign category to map field'}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mapping-split-config animate-fade-in">
                  <div className="mapping-split-config__delimiters">
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)' }}>Delimiter:</span>
                    {[
                      { label: 'Space ( )', value: ' ' },
                      { label: 'Comma (,)', value: ',' },
                      { label: 'Dash (-)', value: '-' },
                      { label: 'Slash (/)', value: '/' }
                    ].map(d => (
                      <button
                        key={d.value}
                        className={cn('delimiter-btn', splitConfig.delimiter === d.value && 'delimiter-btn--active')}
                        onClick={() => updateSplitConfig(col, { delimiter: d.value })}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>

                  <div className="mapping-split-preview">
                    <div className="mapping-split-preview__title">Live Split Preview (First 3 rows)</div>
                    {getSplitPreview(workbook, activeSheet, col, splitConfig.delimiter).map((item: any, i: number) => (
                      <div key={i} className="split-preview-row">
                        <span className="split-preview-row__original">"{item.original}"</span>
                        <span className="split-preview-row__arrow">→</span>
                        <div className="split-preview-row__parts">
                          {item.parts.map((p: string, j: number) => (
                            <span key={j} className="split-preview-part">{p}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {splitConfig.parts.map((part, pIdx) => {
                      const partCategoryOptions = [
                        ...Object.keys(systemFieldsGrouped).map(cat => ({ label: cat, value: cat })),
                        { label: 'Skip Part', value: 'skip' }
                      ]
                      const partFieldOptions = part.entityType && part.entityType !== 'skip'
                        ? systemFieldsGrouped[part.entityType]?.map(f => ({ label: f.label, value: f.key })) || []
                        : []

                      return (
                        <div key={part.index} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', width: 60 }}>Part {pIdx + 1}</span>
                          <FormSelect
                            value={part.entityType || ''}
                            onChange={(val) => updateSplitPart(col, part.index, null, val)}
                            options={partCategoryOptions}
                            placeholder="Category"
                            triggerStyle={{ height: 38, borderRadius: 8 }}
                            style={{ flex: 1 }}
                          />
                          {part.entityType && part.entityType !== 'skip' && (
                            <FormSelect
                              value={part.systemField || ''}
                              onChange={(val) => updateSplitPart(col, part.index, val, part.entityType)}
                              options={partFieldOptions}
                              placeholder="Field"
                              triggerStyle={{ height: 38, borderRadius: 8 }}
                              style={{ flex: 1 }}
                              searchable
                            />
                          )}
                          <button onClick={() => removeSplitPart(col, part.index)} style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    })}
                    <button onClick={() => addSplitPart(col)} style={{ alignSelf: 'flex-start', fontSize: 13, color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: 4 }}>
                      + Add Split Field Segment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


