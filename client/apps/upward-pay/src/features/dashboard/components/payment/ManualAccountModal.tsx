'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { addManualAccount } from '@/features/payments/services/paymentService'
import { useToast } from '@/components/common/Toast'
import { Loader2, CheckCircle2, Landmark } from 'lucide-react'
import { BankSelectionModal } from './BankSelectionModal'

const manualAccountSchema = z.object({
  bankCode: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
})

type ManualAccountForm = z.infer<typeof manualAccountSchema>

interface ManualAccountModalProps {
  propertyId: number
  propertyName: string
  initialData?: {
    bankCode?: string
    accountNumber: string
    accountName: string
    bankName: string
  }
  onClose: () => void
}

export function ManualAccountModal({ propertyId, propertyName, initialData, onClose }: ManualAccountModalProps) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [isVerifying, setIsVerifying] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  const { register, handleSubmit, setValue, control, reset, formState: { errors, isDirty } } = useForm<ManualAccountForm>({
    resolver: zodResolver(manualAccountSchema),
    defaultValues: initialData || {
      bankCode: '',
      accountNumber: '',
      accountName: '',
      bankName: '',
    }
  })

  const selectedBankCode = useWatch({ control, name: 'bankCode' })
  const accountNumber = useWatch({ control, name: 'accountNumber' })
  const accountName = useWatch({ control, name: 'accountName' })

  const { data: banks = [], isLoading: loadingBanks } = useQuery<{ name: string, code: string }[]>({
    queryKey: ['banks'],
    queryFn: api.getBanks
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
      const data = await api.resolveAccount(accountNumber, selectedBankCode)
      const name = data.accountName || data.account_name
      if (name) {
        setValue('accountName', name, { shouldValidate: true })
        setIsConfirmed(true)
        toast.success(`Account verified: ${name}`, 'Verified')
      } else {
        throw new Error('Could not find account name')
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid account details', 'Error')
      setIsConfirmed(false)
    } finally {
      setIsVerifying(false)
    }
  }

  const { mutate: addAccount, isPending } = useMutation({
    mutationFn: (data: ManualAccountForm) => addManualAccount({ ...data, propertyId }),
    onSuccess: () => {
      toast.success('Manual payment account configured successfully', 'Success')
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      reset()
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to configure manual account', 'Error')
    }
  })

  const selectedBank = banks.find(b => b.code === selectedBankCode)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="modal-card__header">
          <div className="modal-card__badge" style={{ background: 'var(--clay-faint)', color: 'var(--clay)' }}>
            <Landmark size={20} />
          </div>
          <div>
            <h3 className="modal-card__title">Setup Bank Transfer</h3>
            <p className="modal-card__subtitle">Add the bank account you will transfer rent to for {propertyName}.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit((data) => addAccount(data))} className="modal-card__form">
          <div className="pay-flow__field field-spacing-sm">
            <label className="pay-flow__field-label">Bank</label>
            <div
              role="button"
              tabIndex={0}
              className={`pay-flow__select-trigger ${isBankModalOpen ? 'pay-flow__select-trigger--open' : ''}`}
              onClick={() => !loadingBanks && setIsBankModalOpen(true)}
            >
              <span className="pay-flow__select-trigger-icon">
                <Landmark size={20} />
              </span>
              {selectedBank ? (
                <span className="pay-flow__select-value">{selectedBank.name}</span>
              ) : (
                <span className="pay-flow__select-placeholder">
                  {loadingBanks ? 'Loading banks...' : 'Select bank'}
                </span>
              )}
            </div>
            {errors.bankCode && <span className="field-error">{errors.bankCode.message}</span>}
          </div>

          <div className="pay-flow__field field-spacing-md">
            <label className="pay-flow__field-label">Account Number</label>
            <div className={`pay-flow__input-wrap ${isVerifying ? 'pay-flow__input-wrap--loading' : ''} ${isConfirmed ? 'pay-flow__input-wrap--success' : ''}`}>
              <input 
                {...register('accountNumber')} 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="10-digit account number"
                maxLength={10}
              />
              {isVerifying && <span className="pay-flow__cta-spinner" style={{ borderColor: 'var(--clay)', borderTopColor: 'transparent' }} />}
              {isConfirmed && <span style={{ color: 'var(--success)' }}><CheckCircle2 size={18} /></span>}
            </div>
            {errors.accountNumber && <span className="field-error">{errors.accountNumber.message}</span>}
          </div>

          {isConfirmed && !isVerifying && (
            <div className="success-banner">
              <CheckCircle2 size={18} />
              <div className="success-banner__content">
                <p className="success-banner__title">Account Verified</p>
                <p className="success-banner__text">{accountName}</p>
              </div>
            </div>
          )}

          <div className="modal-card__actions">
            <button type="button" className="btn btn--secondary flex-1" onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary flex-1" disabled={isPending || !isConfirmed}>
              {isPending ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>

        {isBankModalOpen && (
          <BankSelectionModal
            banks={banks}
            loading={loadingBanks}
            error={false}
            onClose={() => setIsBankModalOpen(false)}
            onSelect={(bank) => {
              setValue('bankCode', bank.code, { shouldDirty: true })
              setValue('bankName', bank.name, { shouldDirty: true })
              setValue('accountName', '', { shouldDirty: true })
              setIsBankModalOpen(false)
            }}
          />
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }
        .modal-card {
          background: var(--bg);
          width: 95%;
          max-width: 500px;
          height: auto;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .modal-card__header {
          padding: 24px 24px 20px;
          border-bottom: 1px solid var(--border-solid);
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .modal-card__badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-card__title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }
        .modal-card__subtitle {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .modal-card__form {
          padding: 24px;
          display: flex;
          flex-direction: column;
        }
        .field-spacing-sm {
          margin-bottom: 16px;
        }
        .field-spacing-md {
          margin-bottom: 24px;
        }
        .field-error {
          color: var(--error);
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }
        .success-banner {
          background: var(--success-faint);
          color: var(--success);
          padding: 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--success);
          margin-bottom: 24px;
        }
        .success-banner__content {
          flex: 1;
          overflow: hidden;
        }
        .success-banner__title {
          font-size: 12px;
          font-weight: 600;
          margin: 0;
        }
        .success-banner__text {
          font-size: 14px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }
        .modal-card__actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }
        .flex-1 {
          flex: 1;
        }
        form input, 
        form select {
          width: 100%;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}
