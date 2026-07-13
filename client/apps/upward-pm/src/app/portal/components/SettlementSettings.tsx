'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useToast } from '@/components/common/Toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Edit2, Check, Landmark } from 'lucide-react'
import { api } from '@/lib/api'
import { dedupeBanksByCode } from '@/lib/utils'

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

interface SettlementSettingsProps {
    landlord: any;
}

export function SettlementSettings({ landlord }: SettlementSettingsProps) {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  const [isVerifying, setIsVerifying] = useState(false)
  const [tempVerifiedName, setTempVerifiedName] = useState('')
  
  // Landlord in this context might have bank details if they've been elevated
  const [isConfirmed, setIsConfirmed] = useState(!!landlord?.accountName)
  const [isEditing, setIsEditing] = useState(!landlord?.accountName)

  const { register, handleSubmit, setValue, control, reset, formState: { errors, isDirty } } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankCode: landlord?.bankCode || '',
      accountNumber: landlord?.accountNumber || '',
      accountName: landlord?.accountName || '',
      bankName: landlord?.bankName || '',
    }
  })

  useEffect(() => {
    if (landlord) {
      reset({
        bankCode: landlord.bankCode || '',
        accountNumber: landlord.accountNumber || '',
        accountName: landlord.accountName || '',
        bankName: landlord.bankName || '',
      })
      setIsConfirmed(!!landlord.accountName)
      setIsEditing(!landlord.accountName)
    }
  }, [landlord, reset])

  const selectedBankCode = useWatch({ control, name: 'bankCode' })
  const accountNumber = useWatch({ control, name: 'accountNumber' })

  const updateBankInfoMutation = useMutation({
    mutationFn: (data: BankFormData) => api.updatePmBankInfo(data),
    onSuccess: () => {
      success('Settlement details updated successfully')
      setIsEditing(false)
      setIsConfirmed(true)
      setTempVerifiedName('')
      queryClient.invalidateQueries({ queryKey: ['landlord-portfolio'] })
    },
    onError: (err: any) => toastError(err.message || 'Failed to save bank details')
  })

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

  useEffect(() => {
    if (isDirty) {
      setIsConfirmed(false)
      setTempVerifiedName('')
    }
  }, [selectedBankCode, accountNumber, isDirty])

  useEffect(() => {
    if (selectedBankCode && accountNumber?.length === 10 && isEditing) {
      const timer = setTimeout(() => {
        handleVerify()
      }, 1000)
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
    updateBankInfoMutation.mutate(data)
  }

  return (
    <div className="animate-fade-in" style={{ 
        background: 'white', 
        borderRadius: 24, 
        padding: 32,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 12, 
                background: 'rgba(34, 197, 94, 0.1)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--forest)'
            }}>
                <Landmark size={20} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Settlement Account</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Where you will receive your rent payouts automatically.</p>
        </div>
        
        {!isEditing && landlord?.accountNumber && (
          <button 
            onClick={() => {
              setIsEditing(true)
              setIsConfirmed(false)
            }}
            style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                padding: '8px 16px', 
                borderRadius: 12, 
                border: '1px solid var(--border)',
                background: 'transparent',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
            }}
          >
            <Edit2 size={14} />
            <span>Edit</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group">
              <label className="form-label">Select Bank</label>
              <select {...register('bankCode')} className="form-input">
                <option value="">Select a bank</option>
                {dedupeBanksByCode(banks).map(bank => (
                  <option key={bank.code} value={bank.code}>{bank.name}</option>
                ))}
              </select>
              {errors.bankCode && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{errors.bankCode.message}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input 
                {...register('accountNumber')}
                className="form-input"
                placeholder="10-digit number"
                maxLength={10}
              />
              {errors.accountNumber && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{errors.accountNumber.message}</p>}
            </div>
          </div>

          {isVerifying && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--forest)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verifying account...</span>
            </div>
          )}

          {tempVerifiedName && !isConfirmed && (
            <div className="animate-fade-in" style={{ 
                padding: 16, 
                background: 'rgba(34, 197, 94, 0.05)', 
                borderRadius: 16, 
                border: '1px solid rgba(34, 197, 94, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Account Name Found:</p>
                <p style={{ fontWeight: 700, color: 'var(--forest)' }}>{tempVerifiedName}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  type="button" 
                  onClick={handleConfirm}
                  style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      padding: '6px 12px', 
                      background: 'var(--forest)', 
                      color: 'white', 
                      borderRadius: 8, 
                      fontSize: 12, 
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer'
                  }}
                >
                  <Check size={14} />
                  Correct
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setTempVerifiedName('')
                    setValue('accountNumber', '')
                  }}
                  style={{ 
                      padding: '6px 12px', 
                      background: 'white', 
                      color: 'var(--text-muted)', 
                      borderRadius: 8, 
                      fontSize: 12, 
                      border: '1px solid var(--border)',
                      cursor: 'pointer'
                  }}
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {isConfirmed && (
            <div className="animate-fade-in" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                padding: 16, 
                background: 'rgba(34, 197, 94, 0.05)', 
                borderRadius: 16, 
                border: '1px solid rgba(34, 197, 94, 0.1)'
            }}>
              <CheckCircle2 size={18} style={{ color: 'var(--forest)' }} />
              <p style={{ fontSize: 14 }}>Confirmed: <span style={{ fontWeight: 700, color: 'var(--forest)' }}>{tempVerifiedName || landlord?.accountName}</span></p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button 
              type="button" 
              onClick={() => {
                setIsEditing(false)
                reset()
              }}
              style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: 12, 
                  border: '1px solid var(--border)', 
                  background: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={updateBankInfoMutation.isPending || !isConfirmed}
              style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: 12, 
                  border: 'none', 
                  background: isConfirmed ? 'var(--forest)' : 'var(--border)', 
                  color: 'white',
                  fontWeight: 600,
                  cursor: isConfirmed ? 'pointer' : 'not-allowed'
              }}
            >
              {updateBankInfoMutation.isPending ? 'Saving...' : 'Save Details'}
            </button>
          </div>
        </form>
      ) : (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
          <div style={{ padding: 20, background: 'var(--bg)', borderRadius: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>BANK NAME</span>
            <span style={{ fontWeight: 700 }}>{landlord?.bankName || 'Not set'}</span>
          </div>
          <div style={{ padding: 20, background: 'var(--bg)', borderRadius: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>ACCOUNT NUMBER</span>
            <span style={{ fontWeight: 700 }}>{landlord?.accountNumber || 'Not set'}</span>
          </div>
          <div style={{ padding: 20, background: 'rgba(34, 197, 94, 0.05)', borderRadius: 16, border: '1px solid rgba(34, 197, 94, 0.1)' }}>
            <span style={{ fontSize: 12, color: 'var(--forest)', display: 'block', marginBottom: 8 }}>ACCOUNT NAME</span>
            <span style={{ fontWeight: 800, color: 'var(--forest)' }}>{landlord?.accountName || 'Not set'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
