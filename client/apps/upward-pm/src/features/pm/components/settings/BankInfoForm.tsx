'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import { useQuery } from '@tanstack/react-query'
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Check,
  Star,
  Link as LinkIcon,
  ShieldCheck,
  Loader2,
  Search,
  Building2,
  Info
} from 'lucide-react'
import { api } from '@/lib/api'
import { dedupeBanksByCode } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal/Modal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import {
  useSettlementAccounts,
  useCreateSettlementAccount,
  useUpdateSettlementAccount,
  useSetDefaultSettlementAccount,
  useDeleteSettlementAccount,
  useLinkPropertiesToAccount
} from '../../hooks/useSettlementAccounts'
import { SettlementAccount } from '../../services/paymentService'

const accountSchema = z.object({
  bankCode: z.string().min(1, 'Please select a bank'),
  accountNumber: z.string().length(10, 'Account number must be 10 digits'),
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  isPrimary: z.boolean().optional(),
})

type AccountFormData = z.infer<typeof accountSchema>

interface Bank {
  name: string
  code: string
}

export function BankInfoForm() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const canManageCompanySettings = user?.canManageCompanySettings !== false && user?.accountType !== 'PM_EMPLOYEE'

  const { data: accounts = [], isLoading: isLoadingAccounts } = useSettlementAccounts()
  const { data: banks = [] } = useQuery<Bank[]>({
    queryKey: ['banks'],
    queryFn: api.getBanks
  })
  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ['pm-properties'],
    queryFn: api.getProperties
  })

  const createMutation = useCreateSettlementAccount()
  const updateMutation = useUpdateSettlementAccount()
  const setDefaultMutation = useSetDefaultSettlementAccount()
  const deleteMutation = useDeleteSettlementAccount()
  const linkPropertiesMutation = useLinkPropertiesToAccount()

  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<SettlementAccount | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [tempVerifiedName, setTempVerifiedName] = useState('')
  const [isConfirmed, setIsConfirmed] = useState(false)

  // Link property modal state
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkingAccount, setLinkingAccount] = useState<SettlementAccount | null>(null)
  const [selectedPropertyUuids, setSelectedPropertyUuids] = useState<string[]>([])
  const [propertySearch, setPropertySearch] = useState('')

  // Delete & Set Default Confirmations
  const [accountToDelete, setAccountToDelete] = useState<SettlementAccount | null>(null)
  const [accountToSetDefault, setAccountToSetDefault] = useState<SettlementAccount | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isDirty }
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      bankCode: '',
      accountNumber: '',
      accountName: '',
      bankName: '',
      isPrimary: false,
    }
  })

  const selectedBankCode = useWatch({ control, name: 'bankCode' })
  const accountNumber = useWatch({ control, name: 'accountNumber' })

  // Auto-populate bank name when code changes
  useEffect(() => {
    if (selectedBankCode) {
      const bank = banks.find(b => b.code === selectedBankCode)
      if (bank) setValue('bankName', bank.name)
    }
  }, [selectedBankCode, banks, setValue])

  // Reset confirmation if account number changes
  useEffect(() => {
    if (isDirty) {
      setIsConfirmed(false)
      setTempVerifiedName('')
    }
  }, [selectedBankCode, accountNumber, isDirty])

  // Auto-verify 10 digit account numbers
  useEffect(() => {
    if (selectedBankCode && accountNumber?.length === 10 && !isConfirmed) {
      const timer = setTimeout(() => {
        handleVerify()
      }, 750)
      return () => clearTimeout(timer)
    }
  }, [selectedBankCode, accountNumber, isConfirmed])

  const handleVerify = async () => {
    if (!selectedBankCode || accountNumber?.length !== 10) return

    setIsVerifying(true)
    try {
      const data = await api.verifyPmBank(accountNumber, selectedBankCode)
      const name = data.account_name || data.accountName
      if (name) {
        setTempVerifiedName(name)
        success(`Account verified: ${name}`)
      } else {
        throw new Error('Could not resolve account name')
      }
    } catch (err: any) {
      toastError(err.message || 'Invalid account details')
      setTempVerifiedName('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleConfirmAccount = () => {
    setValue('accountName', tempVerifiedName, { shouldDirty: true })
    const bank = banks.find(b => b.code === selectedBankCode)
    if (bank) setValue('bankName', bank.name, { shouldDirty: true })
    setIsConfirmed(true)
    success('Account name confirmed')
  }

  const handleOpenAddModal = () => {
    setEditingAccount(null)
    reset({
      bankCode: '',
      accountNumber: '',
      accountName: '',
      bankName: '',
      isPrimary: accounts.length === 0,
    })
    setTempVerifiedName('')
    setIsConfirmed(false)
    setIsAccountModalOpen(true)
  }

  const handleOpenEditModal = (account: SettlementAccount) => {
    setEditingAccount(account)
    reset({
      bankCode: account.bankCode || '',
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      isPrimary: account.isPrimary,
    })
    setTempVerifiedName(account.accountName)
    setIsConfirmed(true)
    setIsAccountModalOpen(true)
  }

  const handleSaveAccount = (data: AccountFormData) => {
    if (editingAccount) {
      updateMutation.mutate(
        { uuid: editingAccount.uuid, data },
        {
          onSuccess: () => {
            success('Settlement account updated successfully')
            setIsAccountModalOpen(false)
          },
          onError: (err: any) => {
            toastError(err?.message || 'Failed to update settlement account')
          }
        }
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          success('Settlement account added successfully')
          setIsAccountModalOpen(false)
        },
        onError: (err: any) => {
          toastError(err?.message || 'Failed to add settlement account')
        }
      })
    }
  }

  const handleConfirmSetDefault = () => {
    if (!accountToSetDefault) return
    setDefaultMutation.mutate(accountToSetDefault.uuid, {
      onSuccess: () => {
        success(`${accountToSetDefault.bankName} is now the default settlement account`)
        setAccountToSetDefault(null)
      },
      onError: (err: any) => {
        toastError(err?.message || 'Failed to set default account')
      }
    })
  }

  const handleConfirmDelete = () => {
    if (!accountToDelete) return
    deleteMutation.mutate(accountToDelete.uuid, {
      onSuccess: () => {
        success('Settlement account deleted successfully')
        setAccountToDelete(null)
      },
      onError: (err: any) => {
        toastError(err?.message || 'Failed to delete account')
      }
    })
  }

  const handleOpenLinkModal = (account: SettlementAccount) => {
    setLinkingAccount(account)
    const linkedUuids = account.pmProperties?.map(p => p.uuid) || []
    setSelectedPropertyUuids(linkedUuids)
    setPropertySearch('')
    setIsLinkModalOpen(true)
  }

  const handleTogglePropertyLink = (propertyUuid: string) => {
    setSelectedPropertyUuids(prev =>
      prev.includes(propertyUuid)
        ? prev.filter(id => id !== propertyUuid)
        : [...prev, propertyUuid]
    )
  }

  const handleSavePropertyLinks = () => {
    if (!linkingAccount) return
    linkPropertiesMutation.mutate(
      { uuid: linkingAccount.uuid, propertyUuids: selectedPropertyUuids },
      {
        onSuccess: () => {
          success('Properties linked successfully')
          setIsLinkModalOpen(false)
        },
        onError: (err: any) => {
          toastError(err?.message || 'Failed to link properties')
        }
      }
    )
  }

  const filteredProperties = properties.filter((p: any) =>
    p.name?.toLowerCase().includes(propertySearch.toLowerCase()) ||
    p.address?.toLowerCase().includes(propertySearch.toLowerCase())
  )

  return (
    <section className="settings__section" id="settlement-accounts">
      <div className="settings__section-header">
        <div className="settings__section-header-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h2 className="settings__section-title">Settlement Accounts</h2>
            <p className="settings__section-subtitle">
              Configure multiple bank accounts for rent payouts and payment requests.
            </p>
          </div>
          {canManageCompanySettings && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleOpenAddModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>Add Settlement Account</span>
            </button>
          )}
        </div>
      </div>

      {!canManageCompanySettings && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--ivory-dim, #fbfaf9)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20
        }}>
          <ShieldCheck size={20} color="var(--forest, #2d5a27)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Settlement accounts are configured and managed by your organization administrator. You can view available payout accounts for payment requests.
          </p>
        </div>
      )}

      {isLoadingAccounts ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>Loading settlement accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'var(--bg-card, #ffffff)',
          border: '1px dashed var(--border)',
          borderRadius: 16,
        }}>
          <Landmark size={40} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--dark)' }}>No Settlement Accounts Configured</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 420, margin: '0 auto 20px' }}>
            {canManageCompanySettings
              ? 'Add your organization bank accounts to receive automated tenant payments and custom invoice settlements.'
              : 'Your organization administrator has not configured payout bank accounts yet.'}
          </p>
          {canManageCompanySettings && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleOpenAddModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>Add Primary Account</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {accounts.map(account => {
            const linkedPropsCount = account.pmProperties?.length || 0

            return (
              <div
                key={account.uuid}
                style={{
                  background: 'var(--bg-card, #ffffff)',
                  border: account.isPrimary ? '1.5px solid var(--forest, #2d5a27)' : '1px solid var(--border)',
                  borderRadius: 14,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 16,
                  boxShadow: account.isPrimary ? '0 4px 16px rgba(45, 90, 39, 0.08)' : '0 2px 8px rgba(0,0,0,0.02)',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: account.isPrimary ? 'var(--forest-faint, #f0f7ef)' : 'var(--bg-soft, #f6f6f4)',
                        color: account.isPrimary ? 'var(--forest, #2d5a27)' : 'var(--dark, #1a1a1a)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Landmark size={20} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--dark)' }}>
                          {account.bankName}
                        </h4>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                          {account.accountNumber}
                        </span>
                      </div>
                    </div>

                    {account.isPrimary && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        background: 'var(--forest-faint, #f0f7ef)',
                        color: 'var(--forest, #2d5a27)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        border: '1px solid rgba(45, 90, 39, 0.15)'
                      }}>
                        <CheckCircle2 size={12} />
                        Default
                      </span>
                    )}
                  </div>

                  <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg-soft, #f6f6f4)', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                      Account Name
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', display: 'block', wordBreak: 'break-word' }}>
                      {account.accountName}
                    </span>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={14} color="var(--text-muted)" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {linkedPropsCount === 0 ? 'No specific properties assigned' : `${linkedPropsCount} assigned ${linkedPropsCount === 1 ? 'property' : 'properties'}`}
                    </span>
                  </div>
                </div>

                {canManageCompanySettings && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 4 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '4px 8px', height: 'auto', fontSize: 12 }}
                        onClick={() => handleOpenLinkModal(account)}
                        title="Link properties to this account"
                      >
                        <LinkIcon size={13} style={{ marginRight: 4 }} />
                        Properties
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        style={{ padding: '4px 8px', height: 'auto', fontSize: 12 }}
                        onClick={() => handleOpenEditModal(account)}
                        title="Edit details"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {!account.isPrimary && (
                        <>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            style={{ padding: '4px 8px', height: 'auto', fontSize: 12, color: 'var(--forest, #2d5a27)' }}
                            onClick={() => setAccountToSetDefault(account)}
                            title="Make default settlement account"
                          >
                            Set as Default
                          </button>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            style={{ padding: '4px 8px', height: 'auto', fontSize: 12, color: 'var(--error, #e53935)' }}
                            onClick={() => setAccountToDelete(account)}
                            title="Delete account"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit Settlement Account Modal */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title={editingAccount ? 'Edit Settlement Account' : 'Add Settlement Account'}
        subtitle="Ensure account details are correct for seamless rent settlements."
        icon={Landmark}
        maxWidth={520}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ flex: 1 }}
              onClick={() => setIsAccountModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleSubmit(handleSaveAccount)}
              disabled={createMutation.isPending || updateMutation.isPending || !isConfirmed}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingAccount ? 'Update Account' : 'Add Account'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(handleSaveAccount)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="settings__field">
            <label className="settings__label">Select Bank</label>
            <select {...register('bankCode')} className="settings__input">
              <option value="">Choose a bank...</option>
              {dedupeBanksByCode(banks).map(bank => (
                <option key={bank.code} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
            {errors.bankCode && <span className="text-error text-xs" style={{ color: 'var(--error)' }}>{errors.bankCode.message}</span>}
          </div>

          <div className="settings__field">
            <label className="settings__label">Account Number</label>
            <input
              {...register('accountNumber')}
              className="settings__input"
              placeholder="10-digit NUBAN number"
              maxLength={10}
            />
            {errors.accountNumber && <span className="text-error text-xs" style={{ color: 'var(--error)' }}>{errors.accountNumber.message}</span>}
          </div>

          {isVerifying && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 8 }}>
              <Loader2 size={16} className="animate-spin" color="var(--forest)" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Verifying account name with bank...</span>
            </div>
          )}

          {tempVerifiedName && !isConfirmed && (
            <div style={{
              padding: 14,
              borderRadius: 10,
              background: 'var(--forest-faint, #f0f7ef)',
              border: '1px solid rgba(45, 90, 39, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Account Name Found:</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)', margin: '2px 0 0' }}>{tempVerifiedName}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  style={{ flex: 1, padding: '6px 12px' }}
                  onClick={handleConfirmAccount}
                >
                  <Check size={14} style={{ marginRight: 4 }} />
                  Confirm Name
                </button>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  style={{ flex: 1, padding: '6px 12px' }}
                  onClick={() => {
                    setTempVerifiedName('')
                    setValue('accountNumber', '')
                  }}
                >
                  Change Number
                </button>
              </div>
            </div>
          )}

          {isConfirmed && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--forest-faint, #f0f7ef)',
              border: '1px solid rgba(45, 90, 39, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle2 size={18} color="var(--forest, #2d5a27)" />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Verified Account Name:</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--forest, #2d5a27)', margin: 0 }}>
                  {tempVerifiedName || editingAccount?.accountName}
                </p>
              </div>
            </div>
          )}

          {!editingAccount && accounts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <input
                type="checkbox"
                id="isPrimaryCheck"
                {...register('isPrimary')}
                style={{ width: 16, height: 16, accentColor: 'var(--forest)' }}
              />
              <label htmlFor="isPrimaryCheck" style={{ fontSize: 13, color: 'var(--dark)', cursor: 'pointer' }}>
                Set as default settlement account for new requests
              </label>
            </div>
          )}
        </form>
      </Modal>

      {/* Link Properties Modal */}
      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Assign Properties to Account"
        subtitle={`Select properties that should route settlements directly to ${linkingAccount?.bankName} (${linkingAccount?.accountNumber}).`}
        icon={Building2}
        maxWidth={560}
        footer={
          <div style={{ display: 'flex', gap: 12, width: '100%' }}>
            <button
              type="button"
              className="btn btn--secondary"
              style={{ flex: 1 }}
              onClick={() => setIsLinkModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ flex: 1 }}
              onClick={handleSavePropertyLinks}
              disabled={linkPropertiesMutation.isPending}
            >
              {linkPropertiesMutation.isPending ? 'Saving...' : `Save (${selectedPropertyUuids.length} selected)`}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="settings__input"
              style={{ paddingLeft: 36 }}
              placeholder="Search properties..."
              value={propertySearch}
              onChange={e => setPropertySearch(e.target.value)}
            />
          </div>

          <div style={{
            maxHeight: 280,
            overflowY: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            {filteredProperties.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                No properties found.
              </p>
            ) : (
              filteredProperties.map((p: any) => {
                const isChecked = selectedPropertyUuids.includes(p.uuid)
                return (
                  <label
                    key={p.uuid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: isChecked ? 'var(--forest-faint, #f0f7ef)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleTogglePropertyLink(p.uuid)}
                      style={{ width: 16, height: 16, accentColor: 'var(--forest)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dark)', display: 'block' }}>
                        {p.name}
                      </span>
                      {p.address && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {p.address}
                        </span>
                      )}
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>
      </Modal>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={!!accountToSetDefault}
        title="Set Default Settlement Account"
        message={`Are you sure you want to set ${accountToSetDefault?.bankName} (${accountToSetDefault?.accountNumber}) as the default settlement account? Future payment requests and general payouts will route here by default.`}
        confirmText="Set as Default"
        confirmVariant="primary"
        isLoading={setDefaultMutation.isPending}
        onConfirm={handleConfirmSetDefault}
        onClose={() => setAccountToSetDefault(null)}
      />

      <ConfirmationModal
        isOpen={!!accountToDelete}
        title="Delete Settlement Account"
        message={`Are you sure you want to delete ${accountToDelete?.bankName} (${accountToDelete?.accountNumber})? Properties linked to this account will fall back to your default account.`}
        confirmText="Delete Account"
        confirmVariant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setAccountToDelete(null)}
      />
    </section>
  )
}
