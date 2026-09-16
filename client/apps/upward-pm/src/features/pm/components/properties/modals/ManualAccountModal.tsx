'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal/Modal'
import { useToast } from '@/components/common/Toast'
import { useSettlementAccounts } from '../../../hooks/useSettlementAccounts'
import { useUpdateProperty } from '../../../hooks/useProperties'
import { Building, CreditCard, Landmark, ArrowRight, ExternalLink } from 'lucide-react'
import { SettlementAccount } from '../../../services/paymentService'

interface ManualAccountModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: number
  propertyUuid: string
  propertyName: string
  currentManualAccount?: SettlementAccount | null
  currentManualAccountId?: number | null
}

export function ManualAccountModal({
  isOpen,
  onClose,
  propertyId,
  propertyUuid,
  propertyName,
  currentManualAccount,
  currentManualAccountId,
}: ManualAccountModalProps) {
  const router = useRouter()
  const { success, error } = useToast()
  const { accounts, primaryAccount, isLoading } = useSettlementAccounts()
  const updatePropertyMutation = useUpdateProperty()

  const [selectedAccountUuid, setSelectedAccountUuid] = useState<string>('')

  useEffect(() => {
    if (!isOpen) return

    if (currentManualAccount?.uuid) {
      setSelectedAccountUuid(currentManualAccount.uuid)
    } else if (currentManualAccountId) {
      const match = accounts.find(a => a.id === currentManualAccountId)
      if (match) setSelectedAccountUuid(match.uuid)
      else if (primaryAccount) setSelectedAccountUuid(primaryAccount.uuid)
      else if (accounts.length > 0) setSelectedAccountUuid(accounts[0].uuid)
    } else if (primaryAccount) {
      setSelectedAccountUuid(primaryAccount.uuid)
    } else if (accounts.length > 0) {
      setSelectedAccountUuid(accounts[0].uuid)
    }
  }, [isOpen, currentManualAccount, currentManualAccountId, accounts, primaryAccount])

  const handleSave = () => {
    if (!propertyUuid) return

    updatePropertyMutation.mutate({
      uuid: propertyUuid,
      data: {
        settlementAccountUuid: selectedAccountUuid,
      } as any
    }, {
      onSuccess: () => {
        success('Property settlement account updated successfully')
        onClose()
      },
      onError: (err: any) => {
        error(err?.message || 'Failed to update settlement account')
      }
    })
  }

  if (accounts.length === 0 && !isLoading) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settlement Account"
        icon={Landmark}
        maxWidth={460}
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '12px 0 8px', gap: 14 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--ivory-dim, #fbfaf8)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--clay)'
          }}>
            <Landmark size={24} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>
            No Settlement Accounts Configured
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
            You have not configured any settlement bank accounts yet. To link an account to <strong>{propertyName}</strong>, please configure your bank details in the Settings tab.
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Property Settlement Account"
      subtitle={`Choose which bank account receives payouts for ${propertyName}.`}
      icon={Landmark}
      maxWidth={520}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={updatePropertyMutation.isPending}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={updatePropertyMutation.isPending || !selectedAccountUuid}
          >
            {updatePropertyMutation.isPending ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--surface-hover, #fbfaf8)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building size={20} color="var(--clay)" />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{propertyName}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>All payment requests for this property will default to the selected account.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Available Settlement Accounts
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
            {accounts.map((acc) => {
              const isSelected = selectedAccountUuid === acc.uuid
              return (
                <div
                  key={acc.uuid}
                  onClick={() => setSelectedAccountUuid(acc.uuid)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${isSelected ? 'var(--forest, #166534)' : 'var(--border, #E7E3DB)'}`,
                    background: isSelected ? 'var(--forest-faint, #f0fdf4)' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="settlementAccount"
                    checked={isSelected}
                    onChange={() => setSelectedAccountUuid(acc.uuid)}
                    style={{ width: 16, height: 16, accentColor: 'var(--forest)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>{acc.bankName}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        •••• {acc.accountNumber.slice(-4)}
                      </span>
                      {acc.isPrimary && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                          Primary Default
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {acc.accountName}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          borderTop: '1px solid var(--border)',
          fontSize: 12
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Need a new settlement bank?</span>
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
            Manage Accounts <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </Modal>
  )
}
