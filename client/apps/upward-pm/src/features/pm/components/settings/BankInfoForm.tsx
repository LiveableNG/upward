'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Edit2, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { dedupeBanksByCode } from '@/lib/utils'
import { useUpdateBankInfo } from '../../hooks/usePmSettings'

const bankSchema = z.object({
  bankCode: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
})

type BankFormData = z.infer<typeof bankSchema>

interface Bank {
  name: string
  code: string
}

export function BankInfoForm() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const [isVerifying, setIsVerifying] = useState(false)
  const [tempVerifiedName, setTempVerifiedName] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(!!user?.accountName)
  const [isEditing, setIsEditing] = useState(!user?.accountName)

  const { register, handleSubmit, setValue, control, reset, formState: { errors, isDirty } } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankCode: user?.bankCode || '',
      accountNumber: user?.accountNumber || '',
      accountName: user?.accountName || '',
      bankName: user?.bankName || '',
    }
  })
  React.useEffect(() => {
    if (user) {
      reset({
        bankCode: user.bankCode || '',
        accountNumber: user.accountNumber || '',
        accountName: user.accountName || '',
        bankName: user.bankName || '',
      })
    }
  }, [user, reset])
  const selectedBankCode = useWatch({ control, name: 'bankCode' })
  const accountNumber = useWatch({ control, name: 'accountNumber' })
  const { mutate: saveBankInfo, isPending: isSaving } = useUpdateBankInfo()

  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: api.getBanks
  })

  useEffect(() => {
    if (selectedBankCode) {
      const bank = banks.find(b => b.code === selectedBankCode)
      if (bank) setValue('bankName', bank.name)
    }
  }, [selectedBankCode, banks, setValue])

  // Reset confirmation if inputs change
  useEffect(() => {
    if (isDirty) {
      setIsConfirmed(false)
      setTempVerifiedName('')
    }
  }, [selectedBankCode, accountNumber, isDirty])

  // Auto-verify logic with delay
  useEffect(() => {
    if (selectedBankCode && accountNumber?.length === 10 && isEditing) {
      const timer = setTimeout(() => {
        handleVerify()
      }, 1000) // 1 second delay to allow for corrections
      return () => clearTimeout(timer)
    }
  }, [selectedBankCode, accountNumber, isEditing])

  const handleVerify = async () => {
    if (!selectedBankCode || accountNumber.length !== 10) return
    
    setIsVerifying(true)
    try {
      const data = await api.verifyPmBank(accountNumber, selectedBankCode)
      const name = data.account_name || data.accountName
      if (name) {
        setTempVerifiedName(name)
        success(`Account verified: ${name}`)
      } else {
        throw new Error('Could not find account name')
      }
    } catch (err: any) {
      toastError(err.message || 'Invalid account details')
      setTempVerifiedName('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleConfirm = () => {
    const name = tempVerifiedName
    setValue('accountName', name, { shouldDirty: true })
    setValue('bankName', banks.find(b => b.code === selectedBankCode)?.name || '', { shouldDirty: true })
    setIsConfirmed(true)
    success('Account name confirmed')
  }

  const onSave = (data: BankFormData) => {
    saveBankInfo(data, {
      onSuccess: () => {
        setIsEditing(false)
        setIsConfirmed(true)
        setTempVerifiedName('')
      }
    })
  }

  return (
    <section className="settings__section" id="payment-info">
      <div className="settings__section-header">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="settings__section-title">Payment Information</h2>
            <p className="settings__section-subtitle">Where you'll receive your rent payouts.</p>
          </div>
          {!isEditing && user?.accountNumber && (
            <button 
              className="settings__edit-btn"
              onClick={() => {
                setIsEditing(true)
                setIsConfirmed(false)
              }}
            >
              <Edit2 size={16} />
              <span>Edit Details</span>
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <form className="settings__form" onSubmit={handleSubmit(onSave)}>
          <div className="bank-verification">
            <div className="bank-verification__group">
              <div className="settings__grid">
                <div className="settings__field">
                  <label className="settings__label">Select Bank</label>
                  <select {...register('bankCode')} className="settings__input">
                    <option value="">Select a bank</option>
                    {dedupeBanksByCode(banks).map((bank) => (
                      <option key={bank.code} value={bank.code}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="settings__field">
                  <label className="settings__label">Account Number</label>
                  <input 
                    {...register('accountNumber')}
                    className="settings__input"
                    placeholder="10-digit number"
                    maxLength={10}
                  />
                </div>
              </div>
              {isVerifying && (
                <div className="bank-verification__loader">
                  <Loader2 size={16} className="animate-spin text-forest" />
                  <span className="text-xs text-muted">Verifying account...</span>
                </div>
              )}
            </div>

            {tempVerifiedName && !isConfirmed && (
              <div className="bank-verification__result animate-fade-in">
                <div className="flex-1">
                  <p className="text-xs text-muted mb-1">Account Name Found:</p>
                  <p className="bank-verification__name">{tempVerifiedName}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    className="bank-verification__confirm-btn"
                    onClick={handleConfirm}
                  >
                    <Check size={16} />
                    <span>Yes, this is correct</span>
                  </button>
                  <button 
                    type="button" 
                    className="bank-verification__reject-btn"
                    onClick={() => {
                      setTempVerifiedName('')
                      setValue('accountNumber', '')
                    }}
                  >
                    No, change
                  </button>
                </div>
              </div>
            )}

            {isConfirmed && (
              <div className="bank-verification__result bank-verification__result--confirmed animate-fade-in">
                <CheckCircle2 size={18} className="text-forest" />
                <p>Confirmed: <span className="bank-verification__name">{tempVerifiedName || user?.accountName}</span></p>
              </div>
            )}

            {errors.accountNumber && <span className="text-error text-xs">{errors.accountNumber.message}</span>}
            {errors.bankCode && <span className="text-error text-xs">{errors.bankCode.message}</span>}
          </div>

          <div className="flex gap-4 justify-end">
            <button 
              type="button" 
              className="settings__cancel"
              onClick={() => {
                setIsEditing(false)
                reset()
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="settings__submit"
              disabled={isSaving || !isConfirmed}
            >
              {isSaving ? 'Saving...' : 'Save Bank Info'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bank-summary animate-fade-in">
          <div className="bank-summary__item">
            <span className="bank-summary__label">Bank</span>
            <span className="bank-summary__value">{user?.bankName}</span>
          </div>
          <div className="bank-summary__item">
            <span className="bank-summary__label">Account Number</span>
            <span className="bank-summary__value">{user?.accountNumber}</span>
          </div>
          <div className="bank-summary__item">
            <span className="bank-summary__label">Account Name</span>
            <span className="bank-summary__value font-bold text-forest">{user?.accountName}</span>
          </div>
        </div>
      )}
    </section>
  )
}
