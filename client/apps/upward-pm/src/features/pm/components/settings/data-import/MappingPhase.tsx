import React, { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, Trash2, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ColumnDef, ColumnMapping, SplitConfig } from './types'
import { getSplitPreview } from './utils'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import * as XLSX from 'xlsx'

interface MappingPhaseProps {
  columns: ColumnDef[]
  userColumns: string[]
  mappings: { [sheet: string]: ColumnMapping[] }
  splitConfigs: { [sheet: string]: SplitConfig[] }
  activeSheet: string
  workbook: XLSX.WorkBook | null
  savedTemplates: {id: string, name: string, data: any}[]
  applyTemplate: (templateId: string) => void
  saveTemplate: () => void
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
  savedTemplates, applyTemplate, saveTemplate, updateMapping, toggleSplit,
  updateSplitConfig, updateSplitPart, addSplitPart, removeSplitPart,
  duplicateMappings, missingRequired
}) => {
  const [localExpandedCards, setLocalExpandedCards] = useState<Record<string, boolean>>({})

  // Category selection sub-states for guided wizard (mapping change flows)
  const [editingCategory, setEditingCategory] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState<Record<string, boolean>>({})

  // Category grouping
  const systemFieldsGrouped = useMemo(() => {
    const groups: Record<string, ColumnDef[]> = {}
    columns.forEach(col => {
      if (!groups[col.category]) groups[col.category] = []
      groups[col.category].push(col)
    })
    return groups
  }, [columns])

  // Extract first row values for visual examples
  const sampleRowValues = useMemo(() => {
    if (!workbook || !activeSheet) return {}
    const worksheet = workbook.Sheets[activeSheet]
    if (!worksheet) return {}
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
    if (rawData.length <= 1) return {}
    const headers = (rawData[0] as any[]).map(h => String(h || '').trim())
    const firstDataRow = rawData[1] as any[]
    
    const sampleMap: Record<string, string> = {}
    headers.forEach((h, idx) => {
      if (h && firstDataRow && firstDataRow[idx] !== undefined) {
        sampleMap[h] = String(firstDataRow[idx]).trim()
      }
    })
    return sampleMap
  }, [workbook, activeSheet])

  // Calculate mapping statistics
  const stats = useMemo(() => {
    const sheetMappings = mappings[activeSheet] || []
    const sheetSplits = splitConfigs[activeSheet] || []

    let matched = 0
    let needsReview = 0

    userColumns.forEach(col => {
      const mapping = sheetMappings.find(m => m.userColumn === col)
      const splitConfig = sheetSplits.find(s => s.userColumn === col)

      if (splitConfig) {
        const allPartsMapped = splitConfig.parts.every(p => p.systemField && p.entityType !== 'skip')
        if (allPartsMapped) {
          matched++
        } else {
          needsReview++
        }
      } else {
        const isSkipped = mapping?.entityType === 'skip'
        const mappedField = mapping?.systemField
        const isDuplicate = mappedField ? duplicateMappings.some(d => d.field === mappedField) : false

        if (mappedField && !isDuplicate && !isSkipped) {
          matched++
        } else {
          needsReview++
        }
      }
    })

    return { matched, needsReview, total: userColumns.length }
  }, [mappings, splitConfigs, activeSheet, userColumns, duplicateMappings])

  const toggleCard = (col: string) => {
    setLocalExpandedCards(prev => ({
      ...prev,
      [col]: !prev[col]
    }))
  }

  // Category labels mappings for non-technical readouts
  const categoryLabels: Record<string, string> = {
    property: 'Property',
    unit: 'Unit',
    tenant: 'Tenant',
    landlord: 'Landlord',
    skip: 'Ignore Column'
  }

  const handleCategorySelect = (col: string, category: string) => {
    setEditingCategory(prev => ({ ...prev, [col]: category }))
    if (category === 'skip') {
      updateMapping(activeSheet, col, null, 'skip')
      toggleCard(col)
    }
  }

  const handleFieldSelect = (col: string, category: string, fieldKey: string) => {
    updateMapping(activeSheet, col, fieldKey, category)
    toggleCard(col)
  }

  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640, margin: '0 auto', width: '100%' }}>
      
      {/* Summary Header Banner */}
      <div 
        style={{ 
          background: stats.needsReview > 0 ? '#fffbeb' : '#f0fdf4',
          border: stats.needsReview > 0 ? '1px solid #fde68a' : '1px solid #bbf7d0',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: stats.needsReview > 0 ? '#78350f' : '#14532d', margin: 0 }}>
            Review Detected Columns
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: stats.needsReview > 0 ? '#b45309' : '#15803d' }}>
            <span style={{ fontWeight: 600 }}>✓ {stats.matched} columns matched</span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ fontWeight: 600 }}>⚠ {stats.needsReview} need review</span>
          </div>
        </div>
        {stats.needsReview > 0 && (
          <button 
            className="btn btn--secondary btn--sm"
            onClick={() => {
              const allUpdates: Record<string, boolean> = {}
              userColumns.forEach(col => {
                const mapping = (mappings[activeSheet] || []).find(m => m.userColumn === col)
                const mappedField = mapping?.systemField
                const isSkipped = mapping?.entityType === 'skip'
                const isDuplicate = mappedField ? duplicateMappings.some(d => d.field === mappedField) : false
                const isProblem = !mappedField || isDuplicate || isSkipped
                if (isProblem) allUpdates[col] = true
              })
              setLocalExpandedCards(allUpdates)
            }}
            style={{ height: 32, fontSize: 12, borderRadius: 8 }}
          >
            Review Remaining
          </button>
        )}
      </div>

      {/* Main Single Column Card List */}
      <div className="mapping-main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {userColumns.map((col, idx) => {
          const mapping = (mappings[activeSheet] || []).find(m => m.userColumn === col)
          const isSkipped = mapping?.entityType === 'skip'
          const mappedField = mapping?.systemField
          const splitConfig = (splitConfigs[activeSheet] || []).find(s => s.userColumn === col)
          const isSplit = !!splitConfig
          const isDuplicate = mappedField ? duplicateMappings.some(d => d.field === mappedField) : false
          
          const isProblem = !mappedField || isDuplicate || isSkipped
          const isExpanded = localExpandedCards[col] !== undefined ? localExpandedCards[col] : isProblem

          const sampleValue = sampleRowValues[col]

          const categoryName = mapping?.entityType ? (categoryLabels[mapping.entityType] || mapping.entityType) : ''
          const fieldLabel = mappedField ? (columns.find(c => c.key === mappedField)?.label || mappedField) : ''
          
          const activeCategory = editingCategory[col] || mapping?.entityType || ''

          return (
            <div 
              key={idx}
              className={cn('mapping-card', 
                mappedField && !isSplit && !isDuplicate ? 'mapping-card--success' : '',
                isDuplicate ? 'mapping-card--error' : '',
                isSplit ? 'mapping-card--split' : '',
                isSkipped && !isSplit ? 'mapping-card--skipped' : ''
              )}
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.02)' : 'none',
                borderColor: isExpanded ? 'var(--border)' : '#e2e8f0',
                transition: 'all 0.15s'
              }}
            >
              
              {/* Collapsed State Layout */}
              {!isExpanded ? (
                <div 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => toggleCard(col)}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{col}</span>
                    {sampleValue && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Spreadsheet: <strong style={{ color: '#475569' }}>{sampleValue}</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {mappedField && !isDuplicate && !isSkipped && !isSplit && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', background: '#dcfce7', padding: '3px 8px', borderRadius: 6 }}>
                          Perfect Match ✓
                        </span>
                      )}
                      {isSkipped && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>
                          Ignored
                        </span>
                      )}
                      {isDuplicate && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '3px 8px', borderRadius: 6 }}>
                          Duplicate Match ⚠
                        </span>
                      )}
                      {isSplit && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--clay)', background: '#fff5ec', padding: '3px 8px', borderRadius: 6 }}>
                          Separated
                        </span>
                      )}
                      {!mappedField && !isSkipped && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', background: '#fef3c7', padding: '3px 8px', borderRadius: 6 }}>
                          Needs Review ⚠
                        </span>
                      )}
                      
                      {mappedField && !isSkipped && !isSplit && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                          We'll save as: <strong style={{ color: 'var(--dark)' }}>{categoryName} → {fieldLabel}</strong>
                        </span>
                      )}
                      {isSkipped && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          Ignored (Excluded from import)
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleCard(col); }}
                      style={{ background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: 0 }}
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                /* Expanded Editing Wizard State (Vertical Stack Flow) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
                  
                  {/* Summary Label Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Spreadsheet Column</span>
                      <strong style={{ fontSize: 15, color: 'var(--dark)' }}>{col}</strong>
                      {sampleValue && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Example: <strong style={{ color: '#475569' }}>{sampleValue}</strong>
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => toggleCard(col)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
                    >
                      Collapse
                    </button>
                  </div>

                  {/* Guided Wizard Flow */}
                  {!isSplit ? (
                    <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--border)' }}>
                      
                      {/* Step 1: Category Intent Choice */}
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', display: 'block', marginBottom: 8 }}>
                          What does this column contain?
                        </span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {['property', 'unit', 'tenant', 'landlord'].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => handleCategorySelect(col, cat)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: activeCategory === cat ? '1px solid var(--clay)' : '1px solid var(--border)',
                                background: activeCategory === cat ? '#fff5ec' : 'white',
                                color: activeCategory === cat ? 'var(--clay)' : 'var(--text-muted)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              {categoryLabels[cat]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 2: Specific Field mapping */}
                      {activeCategory && activeCategory !== 'skip' && (
                        <div className="animate-slide-up" style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark)', display: 'block', marginBottom: 8 }}>
                            Which information is it?
                          </span>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {systemFieldsGrouped[activeCategory]?.map((field) => (
                              <button
                                key={field.key}
                                onClick={() => handleFieldSelect(col, activeCategory, field.key)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: mappedField === field.key ? '1px solid var(--forest)' : '1px solid var(--border)',
                                  background: mappedField === field.key ? '#f0fdf4' : 'white',
                                  color: mappedField === field.key ? 'var(--forest)' : 'var(--text-muted)',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                {field.label} {field.required ? '*' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Advanced Accordion Link */}
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                        <button
                          onClick={() => setShowAdvanced(prev => ({ ...prev, [col]: !prev[col] }))}
                          style={{ background: 'none', border: 'none', color: 'var(--clay)', fontWeight: 700, cursor: 'pointer', fontSize: 11, padding: 0 }}
                        >
                          {showAdvanced[col] ? 'Hide Advanced Options' : '▼ Advanced Options'}
                        </button>

                        {showAdvanced[col] && (
                          <div className="animate-slide-up" style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                            <button
                              onClick={() => {
                                handleCategorySelect(col, 'skip')
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: isSkipped ? '1px solid var(--border)' : '1px dashed #cbd5e1',
                                background: isSkipped ? '#f1f5f9' : 'white',
                                color: '#64748b',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Ignore this column
                            </button>
                            
                            <button
                              onClick={() => {
                                toggleSplit(col)
                              }}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                border: '1px dashed #cbd5e1',
                                background: 'white',
                                color: 'var(--clay)',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Split Column
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Split Mode Panel */
                    <div className="mapping-split-config animate-fade-in" style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div className="mapping-split-config__delimiters" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)' }}>Separate by:</span>
                        {[
                          { label: 'Space', value: ' ' },
                          { label: 'Comma (,)', value: ',' },
                          { label: 'Dash (-)', value: '-' },
                          { label: 'Slash (/)', value: '/' }
                        ].map(d => (
                          <button
                            key={d.value}
                            className={cn('delimiter-btn', splitConfig.delimiter === d.value && 'delimiter-btn--active')}
                            onClick={() => updateSplitConfig(col, { delimiter: d.value })}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 6,
                              border: splitConfig.delimiter === d.value ? '1px solid var(--clay)' : '1px solid var(--border)',
                              background: splitConfig.delimiter === d.value ? '#fff5ec' : 'white',
                              color: splitConfig.delimiter === d.value ? 'var(--clay)' : 'var(--text-muted)',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>

                      <div className="mapping-split-preview" style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Live Separation Preview</div>
                        {getSplitPreview(workbook, activeSheet, col, splitConfig.delimiter).slice(0, 1).map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>"{item.original}"</span>
                            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                            <div style={{ display: 'flex', gap: 6 }}>
                              {item.parts.map((p: string, j: number) => (
                                <span key={j} style={{ fontSize: 11, fontWeight: 600, background: 'var(--bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 4, color: 'var(--dark)' }}>
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {splitConfig.parts.map((part, pIdx) => {
                          const partCategoryOptions = [
                            ...Object.keys(systemFieldsGrouped).map(cat => ({ label: categoryLabels[cat] || cat, value: cat })),
                            { label: 'Skip Part', value: 'skip' }
                          ]
                          const partFieldOptions = part.entityType && part.entityType !== 'skip'
                            ? systemFieldsGrouped[part.entityType]?.map(f => ({ label: f.label, value: f.key })) || []
                            : []

                          return (
                            <div key={part.index} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dark)', width: 50 }}>Part {pIdx + 1}</span>
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
                                  placeholder="Save as"
                                  triggerStyle={{ height: 38, borderRadius: 8 }}
                                  style={{ flex: 1 }}
                                  searchable
                                />
                              )}
                              <button 
                                onClick={() => removeSplitPart(col, part.index)} 
                                style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )
                        })}
                        <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                          <button 
                            onClick={() => addSplitPart(col)} 
                            style={{ fontSize: 11, color: 'var(--clay)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                          >
                            + Add Segment
                          </button>
                          <button 
                            onClick={() => toggleSplit(col)} 
                            style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                          >
                            Cancel Split
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simplified Visual preview: mr. ↓ Tenant First Name */}
                  {mappedField && !isSkipped && !isSplit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 10, color: 'var(--text-muted)' }}>
                      <span>{sampleValue || 'Example'}</span>
                      <ArrowRight size={12} />
                      <strong style={{ color: 'var(--forest)' }}>{categoryName} → {fieldLabel}</strong>
                    </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
