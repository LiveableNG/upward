'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal/Modal'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { addManualAccount } from '../../../services/paymentService'
import { useToast } from '@/components/common/Toast'
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
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Manual Payment">
      <div className="p-6">
        <div className="bg-[var(--surface)] p-4 rounded-xl border border-[var(--border-solid)] mb-6 flex items-center gap-3">
          <Building className="text-[var(--text-muted)]" size={20} />
          <div>
            <p className="text-sm font-bold">{propertyName}</p>
            <p className="text-xs text-[var(--text-muted)]">Configure a bank account for direct rent transfers.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit((data) => addAccount(data))} className="space-y-4">
          <div className="form-group">
            <label className="form-label text-sm font-bold">Select Bank</label>
            <select {...register('bankCode')} className="form-input">
              <option value="">Choose a bank...</option>
              {banks.map(bank => (
                <option key={bank.code} value={bank.code}>{bank.name}</option>
              ))}
            </select>
            {errors.bankCode && <span className="text-error text-xs mt-1 block">{errors.bankCode.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label text-sm font-bold">Account Number</label>
            <input 
              {...register('accountNumber')} 
              className="form-input font-mono" 
              placeholder="0000000000"
              maxLength={10}
            />
            {errors.accountNumber && <span className="text-error text-xs mt-1 block">{errors.accountNumber.message}</span>}
          </div>

          {isVerifying && (
            <div className="flex items-center gap-2 text-sm text-[var(--clay)]">
              <Loader2 size={16} className="animate-spin" /> Verifying account...
            </div>
          )}

          {isConfirmed && !isVerifying && (
            <div className="bg-[var(--success-faint)] text-[var(--success)] p-3 rounded-lg flex items-center gap-2 border border-green-200">
              <CheckCircle2 size={18} />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold">Account Verified</p>
                <p className="text-sm truncate font-bold">{useWatch({ control, name: 'accountName' })}</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border-solid)] mt-6">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isPending || !isConfirmed}>
              {isPending ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
