'use client'

import React, { useState, useMemo } from 'react'
import {
  Building2,
  PieChart,
  Sliders,
  Plus,
  Search,
  CheckCircle2,
  Info,
  RotateCcw,
  Percent,
  Trash2,
  ShieldCheck,
  HelpCircle,
  Landmark,
  Layers,
  Edit2,
  Check,
  ArrowRight
} from 'lucide-react'
import { useToast } from '@/components/common/Toast'
import { Modal } from '@/components/ui/Modal/Modal'
import { ConfirmationModal } from '@/components/common/ConfirmationModal'
import { FormSelect, SelectOption } from '@/components/ui/Select/FormSelect'
import { DataTable, Column } from '@/components/common/DataTable'
import {
  SettlementAccount,
  SplitProfile,
  SplitProfileItem,
} from '../../services/paymentService'
import { Property } from '../../services/propertyService'
import {
  useSplitProfiles,
  useCreateSplitProfile,
  useUpdateSplitProfile,
  useDeleteSplitProfile,
  useAttachSplitProfile,
  useAssignPropertyRouting,
} from '../../hooks/useSplitProfiles'

interface SettlementSplitSectionProps {
  accounts: SettlementAccount[]
  primaryAccount: SettlementAccount | undefined
  properties: Property[]
  canManageCompanySettings: boolean
}

interface SplitItemFormRow {
  id: string
  manualAccountUuid: string
  percentage: number
}

export function SettlementSplitSection({
  accounts,
  primaryAccount,
  properties,
  canManageCompanySettings,
}: SettlementSplitSectionProps) {
  const { success, error: toastError } = useToast()

  // Profiles hook
  const { profiles, isLoading: isLoadingProfiles } = useSplitProfiles()
  const createProfileMutation = useCreateSplitProfile()
  const updateProfileMutation = useUpdateSplitProfile()
  const deleteProfileMutation = useDeleteSplitProfile()
  const attachProfileMutation = useAttachSplitProfile()
  const assignRoutingMutation = useAssignPropertyRouting()

  // Tab: 'profiles' | 'assignments'
  const [activeSubTab, setActiveSubTab] = useState<'profiles' | 'assignments'>('profiles')

  // Tooltip / Explainer popover states
  const [isFallbackTooltipOpen, setIsFallbackTooltipOpen] = useState(false)
  const [isManualTransferTooltipOpen, setIsManualTransferTooltipOpen] = useState(false)

  // Profile Create / Edit Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<SplitProfile | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileDescription, setProfileDescription] = useState('')
  const [profileIsDefault, setProfileIsDefault] = useState(false)
  const [splitMode, setSplitMode] = useState<'single' | 'custom'>('custom')
  const [singleAccountUuid, setSingleAccountUuid] = useState('')
  const [splitRows, setSplitRows] = useState<SplitItemFormRow[]>([])

  // Profile Delete Confirmation State
  const [profileToDelete, setProfileToDelete] = useState<SplitProfile | null>(null)

  // Attach Profile to Properties Modal State
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false)
  const [profileToAttach, setProfileToAttach] = useState<SplitProfile | null>(null)
  const [selectedPropertyUuids, setSelectedPropertyUuids] = useState<string[]>([])
  const [attachSearchQuery, setAttachSearchQuery] = useState('')

  // Assignments filter & search
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'profile' | 'account' | 'default'>('all')

  // Account options for FormSelect
  const accountSelectOptions: SelectOption[] = useMemo(() => {
    return accounts.map((a) => ({
      label: `${a.bankName} • ${a.accountNumber}${a.title ? ` (${a.title})` : ''}${a.isPrimary ? ' [Default]' : ''}`,
      shortLabel: `${a.bankName} (${a.title || a.accountNumber.slice(-4)})`,
      value: a.uuid,
    }))
  }, [accounts])

  // Routing options for FormSelect (Single Source of Truth)
  const routingSelectOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      {
        label: `Default Fallback (${primaryAccount ? `${primaryAccount.bankName} •••• ${primaryAccount.accountNumber.slice(-4)}` : 'Primary Account'})`,
        value: 'default',
      },
    ]

    // Group 1: Split Profiles
    profiles.forEach((p) => {
      opts.push({
        label: `[Split Profile] ${p.name} (${p.items.map((it) => `${it.percentage}%`).join('/')})`,
        value: `profile:${p.uuid}`,
      })
    })

    // Group 2: Direct Accounts
    accounts.forEach((a) => {
      opts.push({
        label: `[Direct Account] ${a.bankName} (•••• ${a.accountNumber.slice(-4)})${a.title ? ` - ${a.title}` : ''}${a.isPrimary ? ' [Default]' : ''}`,
        value: `account:${a.uuid}`,
      })
    })

    return opts
  }, [profiles, accounts, primaryAccount])


  // Split calculation helper
  const totalPercentage = useMemo(() => {
    if (splitMode === 'single') return 100
    return splitRows.reduce((acc, row) => acc + (Number(row.percentage) || 0), 0)
  }, [splitMode, splitRows])

  // Open Create Profile Modal
  const handleOpenCreateModal = () => {
    setEditingProfile(null)
    setProfileName('')
    setProfileDescription('')
    setProfileIsDefault(false)
    setSplitMode('custom')

    const firstUuid = primaryAccount?.uuid || accounts[0]?.uuid || ''
    const secondUuid = accounts.find((a) => a.uuid !== firstUuid)?.uuid || firstUuid
    setSingleAccountUuid(firstUuid)
    setSplitRows([
      { id: '1', manualAccountUuid: firstUuid, percentage: 70 },
      { id: '2', manualAccountUuid: secondUuid, percentage: 30 },
    ])
    setIsProfileModalOpen(true)
  }

  // Open Edit Profile Modal
  const handleOpenEditModal = (profile: SplitProfile) => {
    setEditingProfile(profile)
    setProfileName(profile.name)
    setProfileDescription(profile.description || '')
    setProfileIsDefault(profile.isDefault)

    if (profile.items.length === 1 && Number(profile.items[0].percentage) === 100) {
      setSplitMode('single')
      setSingleAccountUuid(profile.items[0].manualAccountUuid)
      setSplitRows([
        {
          id: '1',
          manualAccountUuid: profile.items[0].manualAccountUuid,
          percentage: 100,
        },
      ])
    } else {
      setSplitMode('custom')
      setSingleAccountUuid(profile.items[0]?.manualAccountUuid || '')
      setSplitRows(
        profile.items.map((it, idx) => ({
          id: String(idx + 1),
          manualAccountUuid: it.manualAccountUuid,
          percentage: Number(it.percentage),
        }))
      )
    }
    setIsProfileModalOpen(true)
  }

  // Save Split Profile (Create or Update)
  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      toastError('Please enter a name for this split profile')
      return
    }

    let itemsPayload: Array<{ manualAccountUuid: string; percentage: number }> = []

    if (splitMode === 'single') {
      if (!singleAccountUuid) {
        toastError('Please select a recipient account')
        return
      }
      itemsPayload = [{ manualAccountUuid: singleAccountUuid, percentage: 100 }]
    } else {
      if (splitRows.length === 0) {
        toastError('Please add at least one recipient account')
        return
      }
      if (Math.abs(totalPercentage - 100) > 0.01) {
        toastError(`Total percentage must equal exactly 100%. Currently: ${totalPercentage}%`)
        return
      }
      for (const row of splitRows) {
        if (!row.manualAccountUuid) {
          toastError('All split recipients must have a valid account selected')
          return
        }
        if (row.percentage <= 0 || row.percentage > 100) {
          toastError('Each split row must have a percentage between 1% and 100%')
          return
        }
      }
      itemsPayload = splitRows.map((r) => ({
        manualAccountUuid: r.manualAccountUuid,
        percentage: Number(r.percentage),
      }))
    }

    try {
      if (editingProfile) {
        await updateProfileMutation.mutateAsync({
          uuid: editingProfile.uuid,
          data: {
            name: profileName.trim(),
            description: profileDescription.trim() || undefined,
            isDefault: profileIsDefault,
            items: itemsPayload,
          },
        })
        success('Split profile updated successfully')
      } else {
        await createProfileMutation.mutateAsync({
          name: profileName.trim(),
          description: profileDescription.trim() || undefined,
          isDefault: profileIsDefault,
          items: itemsPayload,
        })
        success('Split profile created successfully')
      }
      setIsProfileModalOpen(false)
    } catch (err: any) {
      toastError(err?.message || 'Failed to save split profile')
    }
  }

  // Delete Profile confirmation
  const handleConfirmDelete = async () => {
    if (!profileToDelete) return
    try {
      await deleteProfileMutation.mutateAsync(profileToDelete.uuid)
      success(`Split profile "${profileToDelete.name}" deleted`)
      setProfileToDelete(null)
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete split profile')
    }
  }

  // Open Attach Profile Modal
  const handleOpenAttachModal = (profile: SplitProfile) => {
    setProfileToAttach(profile)
    const attachedUuids = properties
      .filter((p: any) => p.splitProfileId === profile.id)
      .map((p) => p.uuid)
    setSelectedPropertyUuids(attachedUuids)
    setAttachSearchQuery('')
    setIsAttachModalOpen(true)
  }

  // Save Attach Profile
  const handleSaveAttach = async () => {
    if (!profileToAttach) return
    try {
      await attachProfileMutation.mutateAsync({
        uuid: profileToAttach.uuid,
        propertyUuids: selectedPropertyUuids,
      })
      success(`Assigned "${profileToAttach.name}" to ${selectedPropertyUuids.length} properties`)
      setIsAttachModalOpen(false)
    } catch (err: any) {
      toastError(err?.message || 'Failed to attach split profile to properties')
    }
  }

  // Filtered properties for attach modal
  const attachFilteredProperties = useMemo(() => {
    return properties.filter((p) =>
      p.name.toLowerCase().includes(attachSearchQuery.toLowerCase())
    )
  }, [properties, attachSearchQuery])

  // Filtered properties for assignments table
  const assignmentFilteredProperties = useMemo(() => {
    return properties.filter((p: any) => {
      const matchesSearch =
        p.name.toLowerCase().includes(assignmentSearch.toLowerCase()) ||
        (p.address && p.address.toLowerCase().includes(assignmentSearch.toLowerCase()))

      const hasProfile = Boolean(p.splitProfileId)
      const directAccount = accounts.find((a) => a.id === p.manualAccountId)
      const hasDirectAccount = Boolean(directAccount && !directAccount.isPrimary)

      if (assignmentFilter === 'profile') return matchesSearch && hasProfile
      if (assignmentFilter === 'account') return matchesSearch && !hasProfile && hasDirectAccount
      if (assignmentFilter === 'default') return matchesSearch && !hasProfile && !hasDirectAccount
      return matchesSearch
    })
  }, [properties, accounts, assignmentSearch, assignmentFilter])

  // Columns for Profiles DataTable
  const profileColumns: Column<SplitProfile>[] = useMemo(() => [
    {
      header: 'Profile Name',
      render: (profile) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14 }}>
              {profile.name}
            </span>
            {profile.isDefault && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 12,
                  background: 'var(--forest-faint, #f0f7ef)',
                  color: 'var(--forest, #166534)',
                  border: '1px solid rgba(22, 101, 52, 0.2)',
                  textTransform: 'uppercase',
                }}
              >
                Default
              </span>
            )}
          </div>
          {profile.description && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {profile.description}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Split Distribution (Rent)',
      render: (profile) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {profile.items.map((item, idx) => {
            const acc = accounts.find((a) => a.uuid === item.manualAccountUuid || a.id === item.manualAccountId)
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span
                  style={{
                    fontWeight: 700,
                    color: 'var(--forest, #166534)',
                    background: 'var(--forest-faint, #f0f7ef)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    minWidth: 42,
                    textAlign: 'center',
                  }}
                >
                  {item.percentage}%
                </span>
                <span style={{ color: 'var(--dark)' }}>
                  {acc ? `${acc.bankName} (${acc.title || acc.accountNumber})` : 'Settlement Account'}
                </span>
              </div>
            )
          })}
        </div>
      ),
    },
    {
      header: 'Assigned Properties',
      render: (profile) => {
        const count = properties.filter((p: any) => p.splitProfileId === profile.id).length
        return (
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {count} {count === 1 ? 'Property' : 'Properties'}
          </span>
        )
      },
    },
    {
      header: 'Actions',
      align: 'right',
      render: (profile) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          {canManageCompanySettings && (
            <>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => handleOpenAttachModal(profile)}
                style={{ height: 32, fontSize: 12, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Layers size={13} />
                <span>Assign</span>
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => handleOpenEditModal(profile)}
                style={{ height: 32, fontSize: 12, padding: '0 8px' }}
                title="Edit Profile"
              >
                <Edit2 size={13} />
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setProfileToDelete(profile)}
                style={{ height: 32, fontSize: 12, padding: '0 8px', color: 'var(--danger, #dc2626)' }}
                title="Delete Profile"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ], [accounts, properties, canManageCompanySettings])

  // Columns for Assignments DataTable (Single Source of Truth)
  const assignmentColumns: Column<Property>[] = useMemo(() => [
    {
      header: 'Property',
      render: (prop) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--dark)', fontSize: 14 }}>{prop.name}</div>
          {prop.address && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {prop.address}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Assigned Destination / Routing',
      render: (prop: any) => {
        const profile = profiles.find((p) => p.id === prop.splitProfileId)
        if (profile) {
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <PieChart size={14} color="var(--forest, #166534)" />
                <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 13 }}>
                  {profile.name}
                </span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {profile.items.map((it) => `${it.percentage}%`).join(' / ')} split on Rent • Non-rent to Default
              </p>
            </div>
          )
        }

        const directAccount = accounts.find((a) => a.id === prop.manualAccountId)
        if (directAccount && !directAccount.isPrimary) {
          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Landmark size={14} color="var(--clay, #b45309)" />
                <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 13 }}>
                  {directAccount.bankName} (•••• {directAccount.accountNumber.slice(-4)})
                </span>
                {directAccount.title && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(217, 119, 6, 0.1)', color: '#b45309' }}>
                    {directAccount.title}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                100% of Rent to this account • Non-rent to Default
              </p>
            </div>
          )
        }

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={14} color="var(--forest, #166534)" />
              <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 13 }}>
                Default Account Fallback
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              100% routes to {primaryAccount ? `${primaryAccount.bankName} (•••• ${primaryAccount.accountNumber.slice(-4)})` : 'Primary Account'}
            </p>
          </div>
        )
      },
    },
    {
      header: 'Routing Status',
      render: (prop: any) => {
        const hasProfile = Boolean(prop.splitProfileId)
        const directAccount = accounts.find((a) => a.id === prop.manualAccountId)
        const hasDirect = Boolean(directAccount && !directAccount.isPrimary)

        if (hasProfile) {
          return (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--forest-faint, #f0f7ef)',
                color: 'var(--forest, #166534)',
                border: '1px solid rgba(22, 101, 52, 0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              Split Profile
            </span>
          )
        }

        if (hasDirect) {
          return (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: 'var(--clay-faint, rgba(217, 119, 6, 0.1))',
                color: 'var(--clay, #b45309)',
                border: '1px solid rgba(217, 119, 6, 0.2)',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}
            >
              Direct Account
            </span>
          )
        }

        return (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 6,
              background: 'var(--bg-soft, #f4f3ef)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            Default Fallback
          </span>
        )
      },
    },
    {
      header: 'Quick Assign Routing',
      align: 'right',
      render: (prop: any) => {
        if (!canManageCompanySettings) return null

        let currentValue = 'default'
        if (prop.splitProfileId) {
          const prof = profiles.find((p) => p.id === prop.splitProfileId)
          if (prof) currentValue = `profile:${prof.uuid}`
        } else if (prop.manualAccountId) {
          const acc = accounts.find((a) => a.id === prop.manualAccountId)
          if (acc) currentValue = `account:${acc.uuid}`
        }

        return (
          <div style={{ width: 260, display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
            <FormSelect
              value={currentValue}
              options={routingSelectOptions}
              onChange={async (newVal) => {
                const val = String(newVal)
                try {
                  if (val.startsWith('profile:')) {
                    const profUuid = val.replace('profile:', '')
                    await assignRoutingMutation.mutateAsync({
                      propertyUuid: prop.uuid,
                      routingType: 'PROFILE',
                      targetUuid: profUuid,
                    })
                    success(`Assigned split profile to ${prop.name}`)
                  } else if (val.startsWith('account:')) {
                    const accUuid = val.replace('account:', '')
                    await assignRoutingMutation.mutateAsync({
                      propertyUuid: prop.uuid,
                      routingType: 'ACCOUNT',
                      targetUuid: accUuid,
                    })
                    success(`Assigned direct account to ${prop.name}`)
                  } else {
                    await assignRoutingMutation.mutateAsync({
                      propertyUuid: prop.uuid,
                      routingType: 'DEFAULT',
                    })
                    success(`Reset ${prop.name} to Default Fallback`)
                  }
                } catch (err: any) {
                  toastError(err?.message || 'Failed to update property routing')
                }
              }}
              triggerStyle={{ height: 32, fontSize: 12 }}
            />
          </div>
        )
      },
    },
  ], [profiles, properties, accounts, primaryAccount, routingSelectOptions, canManageCompanySettings, assignRoutingMutation, success, toastError])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Explainer Callouts: Fallback Routing & Manual Offline Bank Transfer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Fallback Waterfall Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: 16,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--forest-faint, #f0f7ef)',
                color: 'var(--forest, #166534)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>
                  Default Fallback Active
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 12,
                    background: 'var(--forest-faint, #f0f7ef)',
                    color: 'var(--forest, #166534)',
                  }}
                >
                  Zero-Strand Protection
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Any property without a custom split profile routes 100% of collected rent to{' '}
                <strong style={{ color: 'var(--dark)' }}>
                  {primaryAccount ? `${primaryAccount.bankName} (${primaryAccount.accountNumber})` : 'Default Account'}
                </strong>.
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setIsFallbackTooltipOpen(!isFallbackTooltipOpen)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, height: 28, padding: '0 10px' }}
            >
              <HelpCircle size={13} color="var(--forest, #166534)" />
              <span>How Waterfall Routing Works</span>
            </button>

            {isFallbackTooltipOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setIsFallbackTooltipOpen(false)} />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    width: 320,
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>Routing Waterfall</span>
                    <button type="button" onClick={() => setIsFallbackTooltipOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div><strong>1. Invoice Split Preset:</strong> Highest priority. Selected during payment request creation.</div>
                    <div><strong>2. Property Split Profile:</strong> Assigned to this property below (splits Rent).</div>
                    <div><strong>3. Default Account Fallback:</strong> If no split profile is assigned, 100% goes to your Default Bank Account.</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Offline Bank Transfers & Non-Rent Line Items Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 14,
            padding: 16,
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--ivory-dim, #fbfaf9)',
                color: 'var(--dark)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid var(--border)',
              }}
            >
              <Landmark size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--dark)' }}>
                  Manual Transfers & Fee Routing
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 12,
                    background: 'var(--bg-soft, #f4f3ef)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Industry Standard
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                Tenants uploading bank transfer receipts always see your single Default Account. Additional line items (Service Charge, Caution Deposit) route 100% to your Default Account.
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setIsManualTransferTooltipOpen(!isManualTransferTooltipOpen)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, height: 28, padding: '0 10px' }}
            >
              <Info size={13} color="var(--dark)" />
              <span>Why Only Default Account for Transfers?</span>
            </button>

            {isManualTransferTooltipOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setIsManualTransferTooltipOpen(false)} />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    width: 340,
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--dark)' }}>Manual Collection Policy</span>
                    <button type="button" onClick={() => setIsManualTransferTooltipOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div><strong>Single Destination:</strong> To avoid tenant confusion or accidental split payments, manual bank transfer instructions only display your verified Default Account.</div>
                    <div><strong>Rent vs. Extra Fees:</strong> Only the Rent portion of an invoice is distributed according to split rules. Non-rent items (Management fee, Service charge, Caution fee) route directly to your Default Account.</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs & Actions Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'inline-flex', padding: 4, borderRadius: 10, background: 'var(--bg-soft, #f4f3ef)', gap: 2 }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('profiles')}
            style={{
              border: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeSubTab === 'profiles' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'profiles' ? 'var(--dark)' : 'var(--text-muted)',
              boxShadow: activeSubTab === 'profiles' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Split Profiles ({profiles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('assignments')}
            style={{
              border: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              background: activeSubTab === 'assignments' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'assignments' ? 'var(--dark)' : 'var(--text-muted)',
              boxShadow: activeSubTab === 'assignments' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Property Assignments ({properties.length})
          </button>
        </div>

        {canManageCompanySettings && (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={handleOpenCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36 }}
          >
            <Plus size={15} />
            <span>Create Split Profile</span>
          </button>
        )}
      </div>

      {/* 3. Main Views (Profiles or Assignments) */}
      {activeSubTab === 'profiles' ? (
        <DataTable<SplitProfile>
          columns={profileColumns}
          data={profiles}
          isLoading={isLoadingProfiles}
          emptyMessage="No split profiles created yet. Click 'Create Split Profile' to set up a reusable split configuration."
          pageSize={10}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Assignment Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search properties..."
                value={assignmentSearch}
                onChange={(e) => setAssignmentSearch(e.target.value)}
                className="settings__input"
                style={{ paddingLeft: 32, height: 36, fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'inline-flex', padding: 3, borderRadius: 8, background: 'var(--bg-soft, #f4f3ef)', gap: 2 }}>
              <button
                type="button"
                onClick={() => setAssignmentFilter('all')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: assignmentFilter === 'all' ? '#ffffff' : 'transparent',
                  color: assignmentFilter === 'all' ? 'var(--dark)' : 'var(--text-muted)',
                }}
              >
                All ({properties.length})
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('profile')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: assignmentFilter === 'profile' ? '#ffffff' : 'transparent',
                  color: assignmentFilter === 'profile' ? 'var(--dark)' : 'var(--text-muted)',
                }}
              >
                Split Profiles
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('account')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: assignmentFilter === 'account' ? '#ffffff' : 'transparent',
                  color: assignmentFilter === 'account' ? 'var(--dark)' : 'var(--text-muted)',
                }}
              >
                Direct Accounts
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter('default')}
                style={{
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: assignmentFilter === 'default' ? '#ffffff' : 'transparent',
                  color: assignmentFilter === 'default' ? 'var(--dark)' : 'var(--text-muted)',
                }}
              >
                Default Fallback
              </button>
            </div>
          </div>

          <DataTable<Property>
            columns={assignmentColumns}
            data={assignmentFilteredProperties}
            emptyMessage="No properties found matching your search."
            pageSize={10}
          />
        </div>
      )}

      {/* 4. Create / Edit Split Profile Modal */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title={editingProfile ? 'Edit Split Profile' : 'Create Split Profile'}
        subtitle="Configure how rent amounts are divided across settlement accounts."
        icon={PieChart}
        maxWidth={580}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setIsProfileModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSaveProfile}
              disabled={createProfileMutation.isPending || updateProfileMutation.isPending}
            >
              {createProfileMutation.isPending || updateProfileMutation.isPending
                ? 'Saving...'
                : editingProfile
                ? 'Save Changes'
                : 'Create Profile'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile Name & Description */}
          <div>
            <label className="settings__label">Profile Name *</label>
            <input
              type="text"
              placeholder="e.g. Standard Landlord (70/30) or Co-Ownership (50/50)"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="settings__input"
            />
          </div>

          <div>
            <label className="settings__label">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. For residential managed properties in Lekki"
              value={profileDescription}
              onChange={(e) => setProfileDescription(e.target.value)}
              className="settings__input"
            />
          </div>

          {/* Mode Switcher: 100% Single Account vs Custom Split */}
          <div>
            <label className="settings__label">Settlement Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setSplitMode('single')
                  if (!singleAccountUuid) setSingleAccountUuid(primaryAccount?.uuid || accounts[0]?.uuid || '')
                }}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: splitMode === 'single' ? '1.5px solid var(--forest, #166534)' : '1px solid var(--border)',
                  background: splitMode === 'single' ? 'var(--forest-faint, #f0f7ef)' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: splitMode === 'single' ? 'var(--forest, #166534)' : 'var(--dark)' }}>
                  100% Single Account
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Send all rent to one dedicated account
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSplitMode('custom')}
                style={{
                  padding: '12px',
                  borderRadius: 10,
                  border: splitMode === 'custom' ? '1.5px solid var(--forest, #166534)' : '1px solid var(--border)',
                  background: splitMode === 'custom' ? 'var(--forest-faint, #f0f7ef)' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: splitMode === 'custom' ? 'var(--forest, #166534)' : 'var(--dark)' }}>
                  Custom % Split
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Divide rent by % between accounts
                </span>
              </button>
            </div>
          </div>

          {/* Preset Buttons for Custom Split */}
          {splitMode === 'custom' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Quick Presets:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[
                    { label: '70 / 30', values: [70, 30] },
                    { label: '80 / 20', values: [80, 20] },
                    { label: '50 / 50', values: [50, 50] },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => {
                        const first = splitRows[0]?.manualAccountUuid || primaryAccount?.uuid || accounts[0]?.uuid || ''
                        const second = splitRows[1]?.manualAccountUuid || accounts.find((a) => a.uuid !== first)?.uuid || first
                        setSplitRows([
                          { id: '1', manualAccountUuid: first, percentage: preset.values[0] },
                          { id: '2', manualAccountUuid: second, percentage: preset.values[1] },
                        ])
                      }}
                      style={{ fontSize: 11, height: 26, padding: '0 8px' }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rows List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {splitRows.map((row, idx) => (
                  <div
                    key={row.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--bg-soft, #f4f3ef)',
                      padding: 8,
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <FormSelect
                        value={row.manualAccountUuid}
                        options={accountSelectOptions}
                        onChange={(val) => {
                          setSplitRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, manualAccountUuid: val } : r))
                          )
                        }}
                        placeholder="Select Account"
                        triggerStyle={{ height: 36, fontSize: 12 }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 100 }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={row.percentage}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setSplitRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, percentage: val } : r))
                          )
                        }}
                        className="settings__input"
                        style={{ height: 36, fontSize: 13, textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>%</span>
                    </div>
                    {splitRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSplitRows((prev) => prev.filter((r) => r.id !== row.id))}
                        className="btn-icon"
                        style={{ color: 'var(--danger, #dc2626)', width: 32, height: 32 }}
                        title="Remove row"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const available = accounts.find((a) => !splitRows.some((r) => r.manualAccountUuid === a.uuid))
                    const nextUuid = available?.uuid || accounts[0]?.uuid || ''
                    setSplitRows((prev) => [
                      ...prev,
                      { id: String(Date.now()), manualAccountUuid: nextUuid, percentage: 0 },
                    ])
                  }}
                  className="btn btn--secondary btn--sm"
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}
                >
                  <Plus size={14} />
                  <span>Add Recipient Account</span>
                </button>
              </div>

              {/* Total Percentage Gauge */}
              <div
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: Math.abs(totalPercentage - 100) < 0.01 ? 'var(--forest-faint, #f0f7ef)' : 'var(--rose-faint, #fdf2f2)',
                  border: Math.abs(totalPercentage - 100) < 0.01 ? '1px solid rgba(22, 101, 52, 0.2)' : '1px solid rgba(220, 38, 38, 0.2)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>
                  Total Allocation:
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: Math.abs(totalPercentage - 100) < 0.01 ? 'var(--forest, #166534)' : 'var(--danger, #dc2626)',
                  }}
                >
                  {totalPercentage}% / 100%
                </span>
              </div>
            </div>
          )}

          {/* Single Account Selection */}
          {splitMode === 'single' && (
            <div>
              <label className="settings__label">Recipient Settlement Account</label>
              <FormSelect
                value={singleAccountUuid}
                options={accountSelectOptions}
                onChange={(val) => setSingleAccountUuid(val)}
                placeholder="Select Recipient Account"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* 5. Attach Profile to Properties Modal */}
      <Modal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        title={`Assign "${profileToAttach?.name || ''}"`}
        subtitle="Select the properties where rent payments should follow this split profile."
        icon={Layers}
        maxWidth={540}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setIsAttachModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleSaveAttach}
              disabled={attachProfileMutation.isPending}
            >
              {attachProfileMutation.isPending ? 'Assigning...' : `Assign to ${selectedPropertyUuids.length} Properties`}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, marginRight: 10 }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search properties..."
                value={attachSearchQuery}
                onChange={(e) => setAttachSearchQuery(e.target.value)}
                className="settings__input"
                style={{ paddingLeft: 32, height: 34, fontSize: 12 }}
              />
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                if (selectedPropertyUuids.length === properties.length) {
                  setSelectedPropertyUuids([])
                } else {
                  setSelectedPropertyUuids(properties.map((p) => p.uuid))
                }
              }}
              style={{ fontSize: 11, height: 34 }}
            >
              {selectedPropertyUuids.length === properties.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div
            style={{
              maxHeight: 280,
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {attachFilteredProperties.map((prop) => {
              const isSelected = selectedPropertyUuids.includes(prop.uuid)
              return (
                <label
                  key={prop.uuid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--forest-faint, #f0f7ef)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPropertyUuids((prev) => [...prev, prop.uuid])
                      } else {
                        setSelectedPropertyUuids((prev) => prev.filter((id) => id !== prop.uuid))
                      }
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{prop.name}</div>
                    {prop.address && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{prop.address}</div>}
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      </Modal>

      {/* 6. Delete Profile Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(profileToDelete)}
        onClose={() => setProfileToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Split Profile"
        message={`Are you sure you want to delete "${profileToDelete?.name}"? Any properties currently assigned to this profile will fall back to your Default Settlement Account.`}
        confirmText="Delete Profile"
        type="danger"
        isPending={deleteProfileMutation.isPending}
      />
    </div>
  )
}
