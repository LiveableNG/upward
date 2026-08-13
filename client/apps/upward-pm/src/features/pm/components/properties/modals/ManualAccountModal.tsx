'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Building, Landmark } from 'lucide-react'

interface ManualAccountModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: number
  propertyUuid: string
  propertyName: string
  currentManualAccount?: any
}

export function ManualAccountModal({ isOpen, onClose, propertyId, propertyUuid, propertyName, currentManualAccount }: ManualAccountModalProps) {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')

  // Query manual accounts
  const { data: manualAccounts = [] } = useQuery<any[]>({
    queryKey: ['manual-accounts'],
    queryFn: api.getManualAccounts,
    enabled: isOpen
  })

  useEffect(() => {
    if (currentManualAccount) {
      setSelectedAccountId(String(currentManualAccount.id))
    } else {
      setSelectedAccountId('')
    }
  }, [currentManualAccount, isOpen])

  const linkMutation = useMutation({
    mutationFn: (params: { accountId: number; propertyUuids: string[] }) =>
      api.linkPropertiesToAccount(params.accountId, params.propertyUuids),
    onSuccess: () => {
      success('Settlement account linked successfully')
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-property', propertyUuid] })
      onClose()
    },
    onError: (err: any) => {
      error(err.message || 'Failed to link settlement account')
    }
  })

  const handleSave = () => {
    if (!selectedAccountId) {
      error('Please select an account')
      return
    }
    linkMutation.mutate({
      accountId: Number(selectedAccountId),
      propertyUuids: [propertyUuid]
    })
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Link Settlement Account"
      maxWidth={500}
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={linkMutation.isPending}>
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn--primary" 
            onClick={handleSave} 
            disabled={linkMutation.isPending || manualAccounts.length === 0 || !selectedAccountId}
            style={{ background: 'var(--forest)', color: 'white', border: 'none' }}
          >
            {linkMutation.isPending ? 'Linking...' : 'Link Account'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Property Info block */}
        <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building size={20} color="var(--text-muted)" />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{propertyName}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Choose which settlement account direct rent transfers should go to.</p>
          </div>
        </div>

        {/* Current Linked Account Display */}
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 8 }}>
            CURRENT SETTLEMENT DESTINATION
          </span>
          {currentManualAccount ? (
            <div style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: 12, border: '1px solid rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Landmark size={18} style={{ color: 'var(--forest)' }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--forest)' }}>
                  {currentManualAccount.accountName}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {currentManualAccount.bankName} • {currentManualAccount.accountNumber}
                </p>
              </div>
            </div>
          ) : (
            <div style={{ padding: '12px 16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
              No settlement account linked (None)
            </div>
          )}
        </div>

        {/* Select Dropdown */}
        <div>
          <label className="form-label" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 8 }}>
            SELECT SETTLEMENT ACCOUNT
          </label>
          {manualAccounts.length === 0 ? (
            <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 12, color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
              No accounts available. Configure them in <strong>Settings &gt; Payment</strong> first.
            </div>
          ) : (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="form-input"
              style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px', background: 'white', fontSize: 14 }}
            >
              <option value="" disabled>Choose a payout account...</option>
              {manualAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountName} ({acc.bankName} • {acc.accountNumber}) {acc.isPrimary ? '[Primary]' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </Modal>
  )
}
