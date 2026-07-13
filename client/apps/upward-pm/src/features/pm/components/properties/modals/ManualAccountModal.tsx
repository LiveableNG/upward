'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { addManualAccount } from '../../../services/paymentService'
import { useToast } from '@/components/common/Toast'
import { dedupeBanksByCode } from '@/lib/utils'
import { Loader2, CheckCircle2, Building } from 'lucide-react'

const manualAccountSchema = z.object({
  bankCode: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
})

type ManualAccountForm = z.infer<typeof manualAccountSchema>

interface ManualAccountModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: number
  propertyName: string
}

export function ManualAccountModal({ isOpen, onClose, propertyId, propertyName }: ManualAccountModalProps) {
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [isVerifying, setIsVerifying] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  const { register, handleSubmit, setValue, control, reset, formState: { errors, isDirty } } = useForm<ManualAccountForm>({
    resolver: zodResolver(manualAccountSchema),
    defaultValues: {
      bankCode: '',
      accountNumber: '',
      accountName: '',
      bankName: '',
    }
  })

  const selectedBankCode = useWatch({ control, name: 'bankCode' })
  const accountNumber = useWatch({ control, name: 'accountNumber' })
  const accountName = useWatch({ control, name: 'accountName' })

  const { data: banks = [] } = useQuery<{ name: string, code: string }[]>({
    queryKey: ['banks'],
    queryFn: api.getBanks,
    enabled: isOpen
  })

  useEffect(() => {
    if (selectedBankCode) {
      const bank = banks.find(b => b.code === selectedBankCode)
      if (bank) setValue('bankName', bank.name)
    }
  }, [selectedBankCode, banks, setValue])

  useEffect(() => {
    if (isDirty) {
      setIsConfirmed(false)
    }
  }, [selectedBankCode, accountNumber, isDirty])

  useEffect(() => {
    if (selectedBankCode && accountNumber?.length === 10) {
      const timer = setTimeout(() => {
        handleVerify()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [selectedBankCode, accountNumber])

  const handleVerify = async () => {
    if (!selectedBankCode || accountNumber.length !== 10) return
    
    setIsVerifying(true)
    try {
      const data = await api.verifyPmBank(accountNumber, selectedBankCode)
      const name = data.account_name || data.accountName
      if (name) {
        setValue('accountName', name, { shouldValidate: true })
        setIsConfirmed(true)
        success(`Account verified: ${name}`)
      } else {
        throw new Error('Could not find account name')
      }
    } catch (err: any) {
      error(err.message || 'Invalid account details')
      setIsConfirmed(false)
    } finally {
      setIsVerifying(false)
    }
  }

  const { mutate: addAccount, isPending } = useMutation({
    mutationFn: (data: ManualAccountForm) => addManualAccount({ ...data, propertyId }),
    onSuccess: () => {
      success('Manual payment account configured successfully')
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-property'] })
      reset()
      onClose()
    },
    onError: (err: any) => {
      error(err.message || 'Failed to configure manual account')
    }
  })

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Configure Manual Payment"
      footer={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSubmit((data) => addAccount(data))} disabled={isPending || !isConfirmed}>
            {isPending ? 'Saving...' : 'Save Account'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Building size={20} color="var(--text-muted)" />
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{propertyName}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Configure a bank account for direct rent transfers.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit((data) => addAccount(data))}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Select Bank</label>
            <FormSelect 
              value={selectedBankCode || ''}
              onChange={val => setValue('bankCode', val, { shouldValidate: true })}
              options={dedupeBanksByCode(banks).map(bank => ({ label: bank.name, value: bank.code }))}
              placeholder="Choose a bank..."
            />
            {errors.bankCode && <span style={{ color: 'var(--error)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.bankCode.message}</span>}
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontSize: 13, fontWeight: 700 }}>Account Number</label>
            <input 
              {...register('accountNumber')} 
              className="form-input" 
              style={{ fontFamily: 'monospace' }}
              placeholder="0000000000"
              maxLength={10}
            />
            {errors.accountNumber && <span style={{ color: 'var(--error)', fontSize: 11, marginTop: 4, display: 'block' }}>{errors.accountNumber.message}</span>}
          </div>

          {isVerifying && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--clay)' }}>
              <Loader2 size={16} className="animate-spin" /> Verifying account...
            </div>
          )}

          {isConfirmed && !isVerifying && (
            <div style={{ background: 'var(--success-faint)', color: 'var(--success)', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #bbf7d0' }}>
              <CheckCircle2 size={18} />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold">Account Verified</p>
                <p className="text-sm truncate font-bold">{accountName}</p>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  )
}
