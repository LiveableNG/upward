'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal/Modal'
import { useToast } from '@/components/common/Toast'
import { useSettlementAccounts } from '../../../hooks/useSettlementAccounts'
import {
  getPropertySettlementSplits,
  configurePropertySettlementSplits,
  SettlementAccount,
  SettlementSplitRule
} from '../../../services/paymentService'
import {
  Landmark,
  Plus,
  Trash2,
  PieChart,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Building,
  Sparkles,
  Percent,
  Sliders,
  Info
} from 'lucide-react'

interface PropertySettlementModalProps {
  isOpen: boolean
  onClose: () => void
  propertyUuid: string
  propertyName: string
}

interface SplitRowState {
  id: string
  manualAccountUuid: string
  percentage: number
  lineItemName: string
}

const PALETTE = [
  { bar: '#166534', light: 'rgba(22, 101, 52, 0.1)', text: '#166534', label: 'Emerald' },
  { bar: '#d97706', light: 'rgba(217, 119, 6, 0.1)', text: '#b45309', label: 'Amber' },
  { bar: '#4f46e5', light: 'rgba(79, 70, 229, 0.1)', text: '#4338ca', label: 'Indigo' },
  { bar: '#0284c7', light: 'rgba(2, 132, 199, 0.1)', text: '#0369a1', label: 'Sky' },
  { bar: '#e11d48', light: 'rgba(225, 29, 72, 0.1)', text: '#be123c', label: 'Rose' },
]

export function PropertySettlementModal({
  isOpen,
  onClose,
  propertyUuid,
  propertyName,
}: PropertySettlementModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const { accounts, primaryAccount, isLoading: isLoadingAccounts } = useSettlementAccounts()

  const { data: existingSplits = [], isLoading: isLoadingSplits } = useQuery<SettlementSplitRule[]>({
    queryKey: ['property-settlement-splits', propertyUuid],
    queryFn: () => getPropertySettlementSplits(propertyUuid),
    enabled: isOpen && !!propertyUuid,
  })

  const [rows, setRows] = useState<SplitRowState[]>([])

  // Initialize rows when modal opens or query data loads
  useEffect(() => {
    if (!isOpen) return

    if (existingSplits && existingSplits.length > 0) {
      setRows(
        existingSplits.map((split, idx) => ({
          id: split.uuid || `row-${idx}-${Date.now()}`,
          manualAccountUuid: split.manualAccount?.uuid || split.manualAccountUuid || '',
          percentage: Number(split.percentage) || 0,
          lineItemName: split.lineItemName || 'Rent',
        }))
      )
    } else if (accounts.length > 0) {
      const defaultAccount = primaryAccount || accounts[0]
      setRows([
        {
          id: `row-0-${Date.now()}`,
          manualAccountUuid: defaultAccount.uuid,
          percentage: 100,
          lineItemName: 'Rent',
        },
      ])
    } else {
      setRows([])
    }
  }, [isOpen, existingSplits, accounts, primaryAccount])

  const totalPercentage = Math.round(
    rows.reduce((sum, r) => sum + (Number(r.percentage) || 0), 0) * 10
  ) / 10
  const is100Percent = Math.abs(totalPercentage - 100) < 0.05
  const remaining = Math.round((100 - totalPercentage) * 10) / 10

  const configureMutation = useMutation({
    mutationFn: (rules: SettlementSplitRule[]) =>
      configurePropertySettlementSplits(propertyUuid, rules),
    onSuccess: () => {
      success('Settlement split rules saved successfully')
      queryClient.invalidateQueries({ queryKey: ['property-settlement-splits', propertyUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-property', propertyUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      onClose()
    },
    onError: (err: any) => {
      toastError(err?.message || 'Failed to update settlement split rules')
    },
  })

  const handleAddRow = () => {
    if (accounts.length === 0) return
    // Pick an unused account if possible
    const usedUuids = new Set(rows.map(r => r.manualAccountUuid))
    const unusedAccount = accounts.find(a => !usedUuids.has(a.uuid)) || accounts[0]

    const newPercentage = remaining > 0 ? remaining : 0

    setRows(prev => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        manualAccountUuid: unusedAccount.uuid,
        percentage: newPercentage,
        lineItemName: 'Rent',
      },
    ])
  }

  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) return
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateRow = (index: number, updates: Partial<SplitRowState>) => {
    setRows(prev =>
      prev.map((r, i) => (i === index ? { ...r, ...updates } : r))
    )
  }

  const handleApplyPreset = (preset: 'single' | '70_30' | '80_10_10' | 'equal') => {
    if (accounts.length === 0) return

    if (preset === 'single') {
      const mainAcc = accounts[0]
      setRows([
        {
          id: `preset-${Date.now()}-1`,
          manualAccountUuid: mainAcc.uuid,
          percentage: 100,
          lineItemName: 'Rent',
        },
      ])
    } else if (preset === '70_30') {
      const acc1 = accounts[0]
      const acc2 = accounts[1] || accounts[0]
      setRows([
        {
          id: `preset-${Date.now()}-1`,
          manualAccountUuid: acc1.uuid,
          percentage: 70,
          lineItemName: 'Rent',
        },
        {
          id: `preset-${Date.now()}-2`,
          manualAccountUuid: acc2.uuid,
          percentage: 30,
          lineItemName: 'Rent',
        },
      ])
    } else if (preset === '80_10_10') {
      const acc1 = accounts[0]
      const acc2 = accounts[1] || accounts[0]
      const acc3 = accounts[2] || acc2
      setRows([
        {
          id: `preset-${Date.now()}-1`,
          manualAccountUuid: acc1.uuid,
          percentage: 80,
          lineItemName: 'Rent',
        },
        {
          id: `preset-${Date.now()}-2`,
          manualAccountUuid: acc2.uuid,
          percentage: 10,
          lineItemName: 'Rent',
        },
        {
          id: `preset-${Date.now()}-3`,
          manualAccountUuid: acc3.uuid,
          percentage: 10,
          lineItemName: 'Rent',
        },
      ])
    } else if (preset === 'equal') {
      const count = Math.min(rows.length > 1 ? rows.length : 2, accounts.length)
      const perAccount = Math.floor((100 / count) * 10) / 10
      const remainder = Math.round((100 - perAccount * count) * 10) / 10

      const newRows: SplitRowState[] = []
      for (let i = 0; i < count; i++) {
        const acc = accounts[i] || accounts[0]
        newRows.push({
          id: `equal-${Date.now()}-${i}`,
          manualAccountUuid: acc.uuid,
          percentage: i === 0 ? perAccount + remainder : perAccount,
          lineItemName: 'Rent',
        })
      }
      setRows(newRows)
    }
  }

  const handleSave = () => {
    if (!is100Percent) {
      toastError(`Total percentage must equal exactly 100%. Currently at ${totalPercentage}%`)
      return
    }

    // Validate that accounts are selected
    for (const r of rows) {
      if (!r.manualAccountUuid) {
        toastError('Please select a valid bank account for each split row.')
        return
      }
      if (r.percentage <= 0) {
        toastError('Each split row must have a percentage greater than 0%.')
        return
      }
    }

    const payload: SettlementSplitRule[] = rows.map(r => ({
      lineItemName: 'Rent',
      manualAccountUuid: r.manualAccountUuid,
      percentage: Number(r.percentage),
    }))

    configureMutation.mutate(payload)
  }

  if (accounts.length === 0 && !isLoadingAccounts) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Property Settlement Routing"
        icon={Landmark}
        maxWidth={480}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button type="button" className="btn btn--secondary" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ flex: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onClick={() => {
                onClose()
                router.push('/settings?tab=payment')
              }}
            >
              Go to Settings <ArrowRight size={15} />
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 0', gap: 14 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--ivory-dim, #fbfaf8)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--clay)'
          }}>
            <Landmark size={26} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>
            No Settlement Accounts Configured
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            To configure multi-account settlement splits for <strong>{propertyName}</strong>, you need to register payout bank accounts in your organization settings first.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settlement & Split Routing"
      subtitle={`Configure automated percentage split routes for rent collected on ${propertyName}.`}
      icon={PieChart}
      maxWidth={620}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 20,
              background: is100Percent ? 'rgba(22, 101, 52, 0.1)' : 'rgba(225, 29, 72, 0.1)',
              color: is100Percent ? '#166534' : '#be123c',
              border: `1px solid ${is100Percent ? 'rgba(22, 101, 52, 0.2)' : 'rgba(225, 29, 72, 0.2)'}`
            }}>
              {is100Percent ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              Total: {totalPercentage}% {is100Percent ? '✓' : `(${remaining > 0 ? `${remaining}% left` : `${Math.abs(remaining)}% over`})`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={configureMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSave}
              disabled={configureMutation.isPending || !is100Percent}
              style={{ minWidth: 140 }}
            >
              {configureMutation.isPending ? 'Saving...' : 'Save Splits'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Property Context Banner */}
        <div style={{
          background: 'var(--surface-hover, #fbfaf8)',
          padding: '12px 16px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building size={18} color="var(--clay, #b45309)" />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>{propertyName}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                Default routing applies to all units in this property across online and manual rent payments.
              </p>
            </div>
          </div>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 6,
            background: 'var(--bg-soft, #f6f6f4)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)'
          }}>
            RENT LINE ITEM
          </span>
        </div>

        {/* Visual Allocation Segment Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Split Distribution Bar
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: is100Percent ? 'var(--forest, #166534)' : 'var(--error, #e11d48)' }}>
              {is100Percent ? 'Balanced (100%)' : `${totalPercentage}% / 100%`}
            </span>
          </div>

          <div style={{
            height: 12,
            width: '100%',
            background: 'var(--bg-soft, #f1f5f9)',
            borderRadius: 6,
            overflow: 'hidden',
            display: 'flex',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)'
          }}>
            {rows.map((row, idx) => {
              const pal = PALETTE[idx % PALETTE.length]
              const p = Math.max(0, Math.min(100, Number(row.percentage) || 0))
              if (p <= 0) return null
              return (
                <div
                  key={row.id}
                  style={{
                    width: `${p}%`,
                    background: pal.bar,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative'
                  }}
                  title={`${row.percentage}% - ${accounts.find(a => a.uuid === row.manualAccountUuid)?.bankName || 'Account'}`}
                />
              )
            })}
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Quick Presets:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset('single')}
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--bg-soft, #f6f6f4)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              100% Single Payout
            </button>
            {accounts.length >= 2 && (
              <button
                type="button"
                onClick={() => handleApplyPreset('70_30')}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'var(--bg-soft, #f6f6f4)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                70% Landlord / 30% Agency
              </button>
            )}
            {accounts.length >= 3 && (
              <button
                type="button"
                onClick={() => handleApplyPreset('80_10_10')}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'var(--bg-soft, #f6f6f4)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                80% / 10% / 10%
              </button>
            )}
            {accounts.length >= 2 && (
              <button
                type="button"
                onClick={() => handleApplyPreset('equal')}
                style={{
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'var(--bg-soft, #f6f6f4)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Equal Split
              </button>
            )}
          </div>
        </div>

        {/* Split Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Destination Accounts & Splits
            </label>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {rows.length} {rows.length === 1 ? 'account rule' : 'account rules'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
            {rows.map((row, index) => {
              const pal = PALETTE[index % PALETTE.length]
              const currentAccount = accounts.find(a => a.uuid === row.manualAccountUuid)

              return (
                <div
                  key={row.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: `1.5px solid ${pal.bar}33`,
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    {/* Color dot & label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: pal.bar,
                        flexShrink: 0
                      }} />
                      
                      {/* Account Selector */}
                      <select
                        value={row.manualAccountUuid}
                        onChange={(e) => handleUpdateRow(index, { manualAccountUuid: e.target.value })}
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: 600,
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-soft, #f8fafc)',
                          color: 'var(--dark)',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {accounts.map(acc => (
                          <option key={acc.uuid} value={acc.uuid}>
                            {acc.bankName} - {acc.accountNumber} ({acc.accountName}){acc.title ? ` [${acc.title}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Percentage input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'var(--bg-soft, #f8fafc)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '0 8px',
                        height: 36
                      }}>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          value={row.percentage === 0 ? '' : row.percentage}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            handleUpdateRow(index, { percentage: isNaN(val) ? 0 : val })
                          }}
                          style={{
                            width: 52,
                            border: 'none',
                            background: 'transparent',
                            fontSize: 14,
                            fontWeight: 700,
                            textAlign: 'right',
                            outline: 'none',
                            color: 'var(--dark)'
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginLeft: 2 }}>%</span>
                      </div>

                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: '#ffffff',
                            color: 'var(--error, #e11d48)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          title="Remove this split row"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Account detail meta tag */}
                  {currentAccount && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--bg-soft, #f8fafc)',
                      borderRadius: 6,
                      fontSize: 11
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 600 }}>Owner:</span>
                        <span>{currentAccount.accountName}</span>
                      </div>
                      {currentAccount.title && (
                        <span style={{
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: pal.light,
                          color: pal.text
                        }}>
                          {currentAccount.title}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add Split Row Button */}
          {rows.length < accounts.length && (
            <button
              type="button"
              onClick={handleAddRow}
              className="btn btn--secondary btn--sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                marginTop: 4
              }}
            >
              <Plus size={14} />
              <span>Add Another Account Split</span>
            </button>
          )}
        </div>

        {/* Footer info link */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 0 0',
          borderTop: '1px solid var(--border)',
          fontSize: 12
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Need to register more payout accounts?</span>
          <button
            type="button"
            onClick={() => {
              onClose()
              router.push('/settings?tab=payment')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--forest, #166534)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Manage Settlement Accounts <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </Modal>
  )
}
