'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useToast } from '@/components/common/Toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Loader2, Edit2, Check, Landmark, Trash2, Link, Search, X, ShieldCheck, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { dedupeBanksByCode } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal/Modal'
import { FormSelect } from '@/components/ui/Select/FormSelect'

const bankSchema = z.object({
  bankCode: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
})

type BankFormData = z.infer<typeof bankSchema>

interface Bank {
  name: string;
  code: string;
}

interface SettlementSettingsProps {
  landlord: any;
}

export function SettlementSettings({ landlord }: SettlementSettingsProps) {
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()
  
  // States for Primary Account
  const [isVerifyingPrimary, setIsVerifyingPrimary] = useState(false)
  const [tempVerifiedPrimaryName, setTempVerifiedPrimaryName] = useState('')
  const [isConfirmedPrimary, setIsConfirmedPrimary] = useState(!!landlord?.accountName)
  const [isEditingPrimary, setIsEditingPrimary] = useState(!landlord?.accountName)

  // Secondary account creation state
  const [isAddingSecondary, setIsAddingSecondary] = useState(false)
  const [isVerifyingSecondary, setIsVerifyingSecondary] = useState(false)
  const [tempVerifiedSecondaryName, setTempVerifiedSecondaryName] = useState('')
  const [isConfirmedSecondary, setIsConfirmedSecondary] = useState(false)

  // Property Linking state
  const [linkingAccount, setLinkingAccount] = useState<any | null>(null)
  const [selectedPropertyUuids, setSelectedPropertyUuids] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLandlordUuid, setSelectedLandlordUuid] = useState('')

  // Query secondary manual accounts
  const { data: manualAccounts = [], refetch: refetchManualAccounts } = useQuery<any[]>({
    queryKey: ['manual-accounts'],
    queryFn: api.getManualAccounts
  })

  // Query properties
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ['pm-properties'],
    queryFn: api.getProperties
  })

  // Query landlords
  const { data: landlords = [] } = useQuery<any[]>({
    queryKey: ['pm-landlords'],
    queryFn: api.getPmLandlords
  })

  // Query banks
  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: api.getBanks
  })

  // Form for Primary Account
  const primaryForm = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankCode: landlord?.bankCode || '',
      accountNumber: landlord?.accountNumber || '',
      accountName: landlord?.accountName || '',
      bankName: landlord?.bankName || '',
    }
  })

  // Form for Secondary Account
  const secondaryForm = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      bankCode: '',
      accountNumber: '',
      accountName: '',
      bankName: '',
    }
  })

  useEffect(() => {
    if (landlord) {
      primaryForm.reset({
        bankCode: landlord.bankCode || '',
        accountNumber: landlord.accountNumber || '',
        accountName: landlord.accountName || '',
        bankName: landlord.bankName || '',
      })
      setIsConfirmedPrimary(!!landlord.accountName)
      setIsEditingPrimary(!landlord.accountName)
    }
  }, [landlord, primaryForm])

  // Watchers
  const primaryBankCode = useWatch({ control: primaryForm.control, name: 'bankCode' })
  const primaryAccountNumber = useWatch({ control: primaryForm.control, name: 'accountNumber' })

  const secondaryBankCode = useWatch({ control: secondaryForm.control, name: 'bankCode' })
  const secondaryAccountNumber = useWatch({ control: secondaryForm.control, name: 'accountNumber' })

  // Auto-set Bank Names
  useEffect(() => {
    if (primaryBankCode) {
      const bank = banks.find(b => b.code === primaryBankCode)
      if (bank) primaryForm.setValue('bankName', bank.name)
    }
  }, [primaryBankCode, banks, primaryForm])

  useEffect(() => {
    if (secondaryBankCode) {
      const bank = banks.find(b => b.code === secondaryBankCode)
      if (bank) secondaryForm.setValue('bankName', bank.name)
    }
  }, [secondaryBankCode, banks, secondaryForm])

  // Verification triggers
  useEffect(() => {
    if (primaryBankCode && primaryAccountNumber?.length === 10 && isEditingPrimary) {
      const timer = setTimeout(() => {
        handleVerify(primaryAccountNumber, primaryBankCode, 'primary')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [primaryBankCode, primaryAccountNumber, isEditingPrimary])

  useEffect(() => {
    if (secondaryBankCode && secondaryAccountNumber?.length === 10 && isAddingSecondary) {
      const timer = setTimeout(() => {
        handleVerify(secondaryAccountNumber, secondaryBankCode, 'secondary')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [secondaryBankCode, secondaryAccountNumber, isAddingSecondary])

  const handleVerify = async (accountNo: string, bankC: string, type: 'primary' | 'secondary') => {
    if (!bankC || accountNo.length !== 10) return
    
    if (type === 'primary') setIsVerifyingPrimary(true)
    else setIsVerifyingSecondary(true)

    try {
      const data = await api.verifyPmBank(accountNo, bankC)
      const name = data.account_name || data.accountName
      if (name) {
        if (type === 'primary') {
          setTempVerifiedPrimaryName(name)
          success(`Account verified: ${name}`)
        } else {
          setTempVerifiedSecondaryName(name)
          success(`Account verified: ${name}`)
        }
      } else {
        throw new Error('Could not find account name')
      }
    } catch (err: any) {
      toastError(err.message || 'Invalid account details')
      if (type === 'primary') setTempVerifiedPrimaryName('')
      else setTempVerifiedSecondaryName('')
    } finally {
      if (type === 'primary') setIsVerifyingPrimary(false)
      else setIsVerifyingSecondary(false)
    }
  }

  // Mutations
  const updatePrimaryMutation = useMutation({
    mutationFn: (data: BankFormData) => api.updatePmBankInfo(data),
    onSuccess: () => {
      success('Primary settlement details updated successfully')
      setIsEditingPrimary(false)
      setIsConfirmedPrimary(true)
      setTempVerifiedPrimaryName('')
      queryClient.invalidateQueries({ queryKey: ['landlord-portfolio'] })
      refetchManualAccounts()
    },
    onError: (err: any) => toastError(err.message || 'Failed to save bank details')
  })

  const addSecondaryMutation = useMutation({
    mutationFn: (data: BankFormData) => api.addManualSettlementAccount({ ...data, isPrimary: false }),
    onSuccess: () => {
      success('Secondary settlement account added successfully')
      setIsAddingSecondary(false)
      setIsConfirmedSecondary(false)
      setTempVerifiedSecondaryName('')
      secondaryForm.reset()
      refetchManualAccounts()
    },
    onError: (err: any) => toastError(err.message || 'Failed to add manual account')
  })

  const deleteSecondaryMutation = useMutation({
    mutationFn: (id: number) => api.deleteManualSettlementAccount(id),
    onSuccess: () => {
      success('Settlement account deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      refetchManualAccounts()
    },
    onError: (err: any) => toastError(err.message || 'Failed to delete account')
  })

  const linkPropertiesMutation = useMutation({
    mutationFn: (params: { accountId: number; propertyUuids: string[] }) =>
      api.linkPropertiesToAccount(params.accountId, params.propertyUuids),
    onSuccess: () => {
      success('Properties linked successfully')
      setLinkingAccount(null)
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      refetchManualAccounts()
    },
    onError: (err: any) => toastError(err.message || 'Failed to link properties')
  })

  // Confirm Verification Helpers
  const handleConfirmPrimary = () => {
    primaryForm.setValue('accountName', tempVerifiedPrimaryName, { shouldDirty: true })
    primaryForm.setValue('bankName', banks.find(b => b.code === primaryBankCode)?.name || '', { shouldDirty: true })
    setIsConfirmedPrimary(true)
    success('Account name confirmed')
  }

  const handleConfirmSecondary = () => {
    secondaryForm.setValue('accountName', tempVerifiedSecondaryName, { shouldDirty: true })
    secondaryForm.setValue('bankName', banks.find(b => b.code === secondaryBankCode)?.name || '', { shouldDirty: true })
    setIsConfirmedSecondary(true)
    success('Account name confirmed')
  }

  // Properties selector filter logic
  const filteredProperties = properties.filter(prop => {
    const matchesSearch = prop.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (prop.address && prop.address.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // In our pm_property schema, landlordId points to landlord
    const matchesLandlord = !selectedLandlordUuid || prop.landlordId === Number(selectedLandlordUuid) || (prop.landlord && prop.landlord.uuid === selectedLandlordUuid)
    return matchesSearch && matchesLandlord
  })

  // Setup initial link state when opening link manager
  const openLinkManager = (account: any) => {
    setLinkingAccount(account)
    
    // Find currently linked properties for this account
    const currentlyLinkedUuids = account.pmProperties?.map((p: any) => p.uuid) || []
    setSelectedPropertyUuids(currentlyLinkedUuids)
  }

  const togglePropertySelection = (uuid: string) => {
    setSelectedPropertyUuids(prev => 
      prev.includes(uuid) ? prev.filter(id => id !== uuid) : [...prev, uuid]
    )
  }

  const handleSelectAll = () => {
    const filteredUuids = filteredProperties.map(p => p.uuid)
    setSelectedPropertyUuids(prev => {
      const otherUuids = prev.filter(uuid => !filteredUuids.includes(uuid))
      return [...otherUuids, ...filteredUuids]
    })
  }

  const handleDeselectAll = () => {
    const filteredUuids = filteredProperties.map(p => p.uuid)
    setSelectedPropertyUuids(prev => prev.filter(uuid => !filteredUuids.includes(uuid)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {/* Primary Settlement Account */}
      <div className="animate-fade-in" style={{ 
          background: 'white', 
          borderRadius: 24, 
          padding: 32,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
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
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Primary Settlement Account</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your main online bank transfer payout destination. Can also be linked to properties.</p>
          </div>
          
          {!isEditingPrimary && landlord?.accountNumber && (
            <button 
              onClick={() => {
                setIsEditingPrimary(true)
                setIsConfirmedPrimary(false)
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

        {isEditingPrimary ? (
          <form onSubmit={primaryForm.handleSubmit((data) => updatePrimaryMutation.mutate(data))} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="settlement-form__grid">
              <div className="form-group">
                <label className="form-label">Select Bank</label>
                <FormSelect
                  value={primaryBankCode || ''}
                  onChange={(val) => primaryForm.setValue('bankCode', val, { shouldValidate: true, shouldDirty: true })}
                  options={dedupeBanksByCode(banks).map(bank => ({ label: bank.name, value: bank.code }))}
                  placeholder="Select a bank"
                  searchable
                />
                {primaryForm.formState.errors.bankCode && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{primaryForm.formState.errors.bankCode.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input 
                  {...primaryForm.register('accountNumber')}
                  className="form-input"
                  placeholder="10-digit number"
                  maxLength={10}
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px' }}
                />
                {primaryForm.formState.errors.accountNumber && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{primaryForm.formState.errors.accountNumber.message}</p>}
              </div>
            </div>

            {isVerifyingPrimary && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--forest)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verifying account with Paystack...</span>
              </div>
            )}

            {tempVerifiedPrimaryName && !isConfirmedPrimary && (
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
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Verified Paystack Account Name:</p>
                  <p style={{ fontWeight: 700, color: 'var(--forest)' }}>{tempVerifiedPrimaryName}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    type="button" 
                    onClick={handleConfirmPrimary}
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
                    Confirm Correct
                  </button>
                </div>
              </div>
            )}

            {isConfirmedPrimary && (
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
                <p style={{ fontSize: 14 }}>Confirmed: <span style={{ fontWeight: 700, color: 'var(--forest)' }}>{tempVerifiedPrimaryName || landlord?.accountName}</span></p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {landlord?.accountNumber && (
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditingPrimary(false)
                    primaryForm.reset()
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
              )}
              <button 
                type="submit" 
                disabled={updatePrimaryMutation.isPending || !isConfirmedPrimary}
                style={{ 
                    flex: 1, 
                    padding: '12px', 
                    borderRadius: 12, 
                    border: 'none', 
                    background: isConfirmedPrimary ? 'var(--forest)' : 'var(--border)', 
                    color: 'white',
                    fontWeight: 600,
                    cursor: isConfirmedPrimary ? 'pointer' : 'not-allowed'
                }}
              >
                {updatePrimaryMutation.isPending ? 'Saving...' : 'Save Details'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 20 }}>
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
            
            {/* Link Properties button for Primary */}
            {landlord?.accountNumber && (
              <button
                onClick={() => {
                  const primaryRecord = manualAccounts.find(acc => acc.isPrimary) || {
                    id: -1, // Placeholder indicating primary link
                    isPrimary: true,
                    accountName: landlord.accountName,
                    bankName: landlord.bankName,
                    accountNumber: landlord.accountNumber,
                    pmProperties: properties.filter(p => !p.manualAccount || p.manualAccount.isPrimary)
                  }
                  openLinkManager(primaryRecord)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 12,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <Link size={14} />
                Link Properties to Primary Account ({properties.filter(p => p.manualAccount?.isPrimary).length} Linked)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Secondary Settlement Accounts */}
      <div className="animate-fade-in" style={{ 
          background: 'white', 
          borderRadius: 24, 
          padding: 32,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>Additional Payout Accounts</span>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Create secondary accounts to group different properties for distinct landlord offline transfers.</p>
          </div>
          
          {!isAddingSecondary && (
            <button 
              onClick={() => {
                setIsAddingSecondary(true)
                setIsConfirmedSecondary(false)
                secondaryForm.reset()
              }}
              style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  padding: '10px 20px', 
                  borderRadius: 12, 
                  background: 'var(--forest)',
                  color: 'white',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
              }}
            >
              <span>+ Add Account</span>
            </button>
          )}
        </div>

        {isAddingSecondary && (
          <form onSubmit={secondaryForm.handleSubmit((data) => addSecondaryMutation.mutate(data))} style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32, padding: 24, background: 'var(--bg)', borderRadius: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontWeight: 700 }}>New Secondary Account</h3>
              <button type="button" onClick={() => setIsAddingSecondary(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="settlement-form__grid">
              <div className="form-group">
                <label className="form-label">Select Bank</label>
                <FormSelect
                  value={secondaryBankCode || ''}
                  onChange={(val) => secondaryForm.setValue('bankCode', val, { shouldValidate: true, shouldDirty: true })}
                  options={dedupeBanksByCode(banks).map(bank => ({ label: bank.name, value: bank.code }))}
                  placeholder="Select a bank"
                  searchable
                />
                {secondaryForm.formState.errors.bankCode && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{secondaryForm.formState.errors.bankCode.message}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input 
                  {...secondaryForm.register('accountNumber')}
                  className="form-input"
                  placeholder="10-digit number"
                  maxLength={10}
                  style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)', padding: '0 12px', background: 'white' }}
                />
                {secondaryForm.formState.errors.accountNumber && <p style={{ color: 'var(--error)', fontSize: 11, marginTop: 4 }}>{secondaryForm.formState.errors.accountNumber.message}</p>}
              </div>
            </div>

            {isVerifyingSecondary && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={16} className="animate-spin" style={{ color: 'var(--forest)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verifying account with Paystack...</span>
              </div>
            )}

            {tempVerifiedSecondaryName && !isConfirmedSecondary && (
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
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Verified Paystack Account Name:</p>
                  <p style={{ fontWeight: 700, color: 'var(--forest)' }}>{tempVerifiedSecondaryName}</p>
                </div>
                <button 
                  type="button" 
                  onClick={handleConfirmSecondary}
                  style={{ 
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
                  Confirm Correct
                </button>
              </div>
            )}

            {isConfirmedSecondary && (
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
                <p style={{ fontSize: 14 }}>Confirmed: <span style={{ fontWeight: 700, color: 'var(--forest)' }}>{tempVerifiedSecondaryName}</span></p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button 
                type="button" 
                onClick={() => setIsAddingSecondary(false)}
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
                disabled={addSecondaryMutation.isPending || !isConfirmedSecondary}
                style={{ 
                    flex: 1, 
                    padding: '12px', 
                    borderRadius: 12, 
                    border: 'none', 
                    background: isConfirmedSecondary ? 'var(--forest)' : 'var(--border)', 
                    color: 'white',
                    fontWeight: 600,
                    cursor: isConfirmedSecondary ? 'pointer' : 'not-allowed'
                }}
              >
                {addSecondaryMutation.isPending ? 'Saving...' : 'Add Account'}
              </button>
            </div>
          </form>
        )}

        {manualAccounts.filter(acc => !acc.isPrimary).length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>No additional settlement accounts configured yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {manualAccounts.filter(acc => !acc.isPrimary).map(acc => (
              <div key={acc.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '20px 24px', 
                border: '1px solid var(--border)', 
                borderRadius: 16,
                background: 'white'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{acc.accountName}</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {acc.bankName} • {acc.accountNumber}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--forest)', marginTop: 6, fontWeight: 600 }}>
                    {acc.pmProperties?.length || 0} properties linked
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => openLinkManager(acc)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 10,
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Link size={13} />
                    <span>Link Properties</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this settlement account? All linked properties will be unlinked.')) {
                        deleteSecondaryMutation.mutate(acc.id)
                      }
                    }}
                    style={{
                      padding: '8px',
                      borderRadius: 10,
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property Link Manager Modal */}
      <Modal
        isOpen={!!linkingAccount}
        onClose={() => setLinkingAccount(null)}
        title="Link Properties to Settlement Account"
        subtitle={linkingAccount ? `Linking to: ${linkingAccount.accountName} (${linkingAccount.bankName})` : ''}
        icon={Link}
        maxWidth={650}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button
              onClick={() => setLinkingAccount(null)}
              style={{
                flex: 1,
                padding: 12,
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
              onClick={() => {
                let accountId = linkingAccount.id
                // If linking to primary, we pass the id of the primary manual account (usually represented by isPrimary record)
                if (linkingAccount.isPrimary) {
                  const primaryManualAcc = manualAccounts.find(acc => acc.isPrimary)
                  if (primaryManualAcc) {
                    accountId = primaryManualAcc.id
                  } else {
                    toastError('Please configure and save your Primary Account details first!')
                    return
                  }
                }
                linkPropertiesMutation.mutate({
                  accountId,
                  propertyUuids: selectedPropertyUuids
                })
              }}
              disabled={linkPropertiesMutation.isPending}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 12,
                border: 'none',
                background: 'var(--forest)',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {linkPropertiesMutation.isPending ? 'Linking...' : 'Save Links'}
            </button>
          </div>
        }
      >
        {linkingAccount && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search properties by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: '0 12px 0 36px',
                    fontSize: 13
                  }}
                />
              </div>

              <select
                value={selectedLandlordUuid}
                onChange={(e) => setSelectedLandlordUuid(e.target.value)}
                style={{
                  height: 44,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  padding: '0 12px',
                  fontSize: 13,
                  background: 'white',
                  width: 180
                }}
              >
                <option value="">All Landlords</option>
                {landlords.map((l: any) => (
                  <option key={l.uuid} value={l.uuid}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                {selectedPropertyUuids.length} OF {properties.length} SELECTED
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={handleSelectAll} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--forest)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Select All
                </button>
                <button 
                  onClick={handleDeselectAll} 
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Properties List */}
            <div style={{ overflowY: 'auto', padding: '4px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 200, maxHeight: 350 }}>
              {filteredProperties.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                  No properties match your filters.
                </div>
              ) : (
                filteredProperties.map((prop: any) => {
                  const isChecked = selectedPropertyUuids.includes(prop.uuid)
                  
                  // Show current linked account label
                  let currentLinkText = 'None'
                  if (prop.manualAccount) {
                    currentLinkText = prop.manualAccount.isPrimary ? 'Primary Account' : prop.manualAccount.accountName
                  }

                  return (
                    <div 
                      key={prop.uuid} 
                      onClick={() => togglePropertySelection(prop.uuid)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        background: isChecked ? 'rgba(34, 197, 94, 0.02)' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled via parent click
                          style={{ accentColor: 'var(--forest)', cursor: 'pointer' }}
                        />
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 13 }}>{prop.name}</p>
                          {prop.address && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{prop.address}</p>}
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: 11, 
                        padding: '4px 8px', 
                        borderRadius: 6, 
                        background: prop.manualAccount ? 'rgba(217, 119, 87, 0.08)' : 'var(--bg)',
                        color: prop.manualAccount ? 'var(--clay)' : 'var(--text-muted)',
                        fontWeight: 600
                      }}>
                        Linked to: {currentLinkText}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
