import React, { useState, useEffect, useCallback } from 'react'
import {
  Ticket,
  PiggyBank,
  Search,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Copy,
  Check,
  UserCheck,
  Sparkles,
  Link2,
} from 'lucide-react'
import { apiService } from '../services/api.service'
import { showToast } from '@upward/client-core'

interface RewardsAndVouchersProps {
  token?: string
}

type ActiveTab = 'USERS_AND_AWARD' | 'AUTOMATED_RULES' | 'CAMPAIGNS_AND_LEDGER'

const PRESET_VOUCHER_REASONS = [
  { label: 'Game Winner', sourceType: 'GAME_WINNER', reason: 'External Game Winner Reward' },
  {
    label: 'Campaign Participation',
    sourceType: 'CAMPAIGN_SIGNUP',
    reason: 'Promotional Campaign Participation Reward',
  },
  {
    label: 'Completed Income Form',
    sourceType: 'FORM_COMPLETION',
    reason: 'Completed income information form',
  },
  {
    label: 'Completed Career Goals Form',
    sourceType: 'FORM_COMPLETION',
    reason: 'Completed career goals form',
  },
  {
    label: 'Completed Home Insurance Form',
    sourceType: 'FORM_COMPLETION',
    reason: 'Completed home insurance information form',
  },
  { label: 'Manual Reward', sourceType: 'ADMIN_MANUAL', reason: 'Manual Promotional Voucher Reward' },
]

function formatNgn(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export default function RewardsAndVouchers({ token }: RewardsAndVouchersProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('USERS_AND_AWARD')
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')

  // User search & selected user detail
  const [searchQuery, setSearchQuery] = useState('')
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [userResults, setUserResults] = useState<any[]>([])
  const [selectedUserUuid, setSelectedUserUuid] = useState<string | null>(null)
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null)
  const [loadingUserDetail, setLoadingUserDetail] = useState(false)

  // Manual Voucher Award Form
  const [awardMode, setAwardMode] = useState<'VOUCHER' | 'CASHBACK'>('VOUCHER')
  const [voucherAmountNaira, setVoucherAmountNaira] = useState<number>(1000)
  const [voucherSourceType, setVoucherSourceType] = useState<string>('GAME_WINNER')
  const [voucherReason, setVoucherReason] = useState<string>('External Game Winner Reward')
  const [voucherCampaignTag, setVoucherCampaignTag] = useState<string>('')
  const [voucherExpiryDays, setVoucherExpiryDays] = useState<string>('')
  const [voucherNotes, setVoucherNotes] = useState<string>('')
  const [submittingAward, setSubmittingAward] = useState(false)

  // Cashback Pool Top-up
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [topUpAmountNaira, setTopUpAmountNaira] = useState<number>(500000)
  const [submittingTopUp, setSubmittingTopUp] = useState(false)

  // Rule editing state
  const [editingRuleKey, setEditingRuleKey] = useState<string | null>(null)
  const [ruleAmountNaira, setRuleAmountNaira] = useState<number>(1000)
  const [ruleMinQualifyingNaira, setRuleMinQualifyingNaira] = useState<number>(0)
  const [ruleMaxPerUser, setRuleMaxPerUser] = useState<number>(1)
  const [ruleCampaignTag, setRuleCampaignTag] = useState<string>('')
  const [savingRule, setSavingRule] = useState(false)

  // Campaign link generator
  const [customCampaignTag, setCustomCampaignTag] = useState('voucher-signup')
  const [copiedLink, setCopiedLink] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoadingDashboard(true)
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''
      const res = await apiService.get(`/admin/rewards/dashboard${qs}`, token)
      if (res?.data) {
        setDashboardData(res.data)
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to load rewards dashboard', true)
    } finally {
      setLoadingDashboard(false)
    }
  }, [token, statusFilter])

  const searchUsers = useCallback(
    async (q: string) => {
      setSearchingUsers(true)
      try {
        const res = await apiService.get(
          `/admin/rewards/users/search?q=${encodeURIComponent(q)}&limit=25`,
          token,
        )
        if (res?.data) {
          setUserResults(res.data)
        }
      } catch (err: any) {
        showToast(err?.message || 'Failed to search users', true)
      } finally {
        setSearchingUsers(false)
      }
    },
    [token],
  )

  const fetchUserDetail = useCallback(
    async (userUuid: string) => {
      setLoadingUserDetail(true)
      setSelectedUserUuid(userUuid)
      try {
        const res = await apiService.get(`/admin/rewards/users/${userUuid}`, token)
        if (res?.data) {
          setSelectedUserDetail(res.data)
        }
      } catch (err: any) {
        showToast(err?.message || 'Failed to load user voucher history', true)
      } finally {
        setLoadingUserDetail(false)
      }
    },
    [token],
  )

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, searchUsers])

  const handleAwardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserUuid) {
      showToast('Please select a user first', true)
      return
    }
    if (!voucherAmountNaira || voucherAmountNaira <= 0) {
      showToast('Please enter a valid reward amount in Naira', true)
      return
    }
    if (!voucherReason.trim()) {
      showToast('Please specify a reason for awarding this reward', true)
      return
    }

    setSubmittingAward(true)
    try {
      if (awardMode === 'VOUCHER') {
        await apiService.post(
          '/admin/rewards/vouchers/award',
          {
            userUuid: selectedUserUuid,
            amountNaira: Number(voucherAmountNaira),
            sourceType: voucherSourceType,
            reason: voucherReason.trim(),
            campaignTag: voucherCampaignTag.trim() || undefined,
            expiryDays: voucherExpiryDays ? Number(voucherExpiryDays) : undefined,
            notes: voucherNotes.trim() || undefined,
          },
          token,
        )
        showToast(
          `Successfully credited ${formatNgn(voucherAmountNaira)} promotional voucher to user's balance!`,
        )
      } else {
        await apiService.post(
          '/admin/rewards/cashback/award',
          {
            userUuid: selectedUserUuid,
            amountNaira: Number(voucherAmountNaira),
            reason: voucherReason.trim(),
          },
          token,
        )
        showToast(
          `Successfully credited ${formatNgn(voucherAmountNaira)} cashback directly to user's Savings Wallet!`,
        )
      }

      setVoucherNotes('')
      await Promise.all([fetchUserDetail(selectedUserUuid), fetchDashboard(), searchUsers(searchQuery)])
    } catch (err: any) {
      showToast(err?.message || 'Failed to award reward', true)
    } finally {
      setSubmittingAward(false)
    }
  }

  const handleToggleRuleActive = async (rule: any) => {
    try {
      await apiService.patch(
        `/admin/rewards/rules/${rule.triggerKey}`,
        { isActive: !rule.isActive },
        token,
      )
      showToast(`Rule "${rule.name}" ${!rule.isActive ? 'activated' : 'paused'}`)
      fetchDashboard()
    } catch (err: any) {
      showToast(err?.message || 'Failed to update rule', true)
    }
  }

  const handleSaveRule = async (triggerKey: string) => {
    setSavingRule(true)
    try {
      await apiService.patch(
        `/admin/rewards/rules/${triggerKey}`,
        {
          rewardAmountNaira: Number(ruleAmountNaira),
          minQualifyingAmountNaira: Number(ruleMinQualifyingNaira),
          maxPerUser: Number(ruleMaxPerUser),
          campaignTag: ruleCampaignTag.trim() || null,
        },
        token,
      )
      showToast('Reward trigger configuration updated')
      setEditingRuleKey(null)
      fetchDashboard()
    } catch (err: any) {
      showToast(err?.message || 'Failed to save rule configuration', true)
    } finally {
      setSavingRule(false)
    }
  }

  const handleTopUpPool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topUpAmountNaira || topUpAmountNaira <= 0) return
    setSubmittingTopUp(true)
    try {
      await apiService.post(
        '/admin/rewards/cashback-pool/top-up',
        { amountNaira: Number(topUpAmountNaira) },
        token,
      )
      showToast(`Added ${formatNgn(topUpAmountNaira)} to the designated Cashback Pool`)
      setShowTopUpModal(false)
      fetchDashboard()
    } catch (err: any) {
      showToast(err?.message || 'Failed to top up cashback pool', true)
    } finally {
      setSubmittingTopUp(false)
    }
  }

  const overview = dashboardData?.overview
  const rules: any[] = dashboardData?.rules || []
  const recentVouchers: any[] = dashboardData?.vouchers?.items || []
  const campaignStats: any[] = overview?.campaignStats || []

  const promoUrl = `https://upward.goodtenants.io/signup/voucher${
    customCampaignTag && customCampaignTag !== 'voucher-signup'
      ? `?campaign=${encodeURIComponent(customCampaignTag)}`
      : ''
  }`

  const copyCampaignUrl = () => {
    navigator.clipboard.writeText(promoUrl)
    setCopiedLink(true)
    showToast('Promotional registration URL copied to clipboard')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Rewards &amp; Promotional Voucher System
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: 4 }}>
            Manage promotional marketplace discount vouchers, automated form/campaign triggers, and
            Savings Wallet cashback rewards.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => setShowTopUpModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--white)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <PiggyBank size={15} />
            <span>Top Up Cashback Pool</span>
          </button>

          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loadingDashboard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--white)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loadingDashboard ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            padding: '18px',
            borderRadius: 12,
            background: 'var(--white)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            TOTAL VOUCHERS ISSUED
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>
            {formatNgn(overview?.totalVouchersIssuedNaira || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
            {overview?.totalVouchersIssuedCount || 0} individual voucher records
          </div>
        </div>

        <div
          style={{
            padding: '18px',
            borderRadius: 12,
            background: 'var(--white)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            ACTIVE UNREDEEMED VOUCHERS
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent)', marginTop: 6 }}>
            {formatNgn(overview?.totalActiveVoucherBalanceNaira || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
            Available for marketplace checkout
          </div>
        </div>

        <div
          style={{
            padding: '18px',
            borderRadius: 12,
            background: 'var(--white)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            VOUCHERS REDEEMED
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: 6 }}>
            {formatNgn(overview?.totalVouchersRedeemedNaira || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
            Applied to Upward Marketplace purchases
          </div>
        </div>

        <div
          style={{
            padding: '18px',
            borderRadius: 12,
            background: 'var(--white)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            SAVINGS CASHBACK CREDITED
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: 6 }}>
            {formatNgn(overview?.totalCashbackCreditedNaira || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 4 }}>
            Pool Available:{' '}
            <strong>{formatNgn(overview?.cashbackPool?.availableBalanceNaira || 0)}</strong>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '1px solid var(--border)',
          marginBottom: 20,
        }}
      >
        {(
          [
            {
              id: 'USERS_AND_AWARD',
              label: 'User Voucher Lookup & Manual Credit',
              icon: UserCheck,
            },
            {
              id: 'AUTOMATED_RULES',
              label: 'Automated Reward Triggers & Amounts',
              icon: SlidersHorizontal,
            },
            {
              id: 'CAMPAIGNS_AND_LEDGER',
              label: 'Promotional Sign-Up Campaigns & Global Ledger',
              icon: Ticket,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: User Search & Manual Voucher / Cashback Credit */}
      {activeTab === 'USERS_AND_AWARD' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '380px 1fr',
            gap: 20,
            alignItems: 'start',
          }}
        >
          {/* Left Panel: User Search & Selection */}
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                1. Search &amp; Select Registered User
              </div>
              <div style={{ position: 'relative' }}>
                <Search
                  size={15}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or campaign..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px 9px 34px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              {searchingUsers && userResults.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Searching users...
                </div>
              ) : userResults.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No users found matching "{searchQuery}"
                </div>
              ) : (
                userResults.map((u) => {
                  const isSelected = selectedUserUuid === u.uuid
                  return (
                    <button
                      key={u.uuid}
                      type="button"
                      onClick={() => fetchUserDetail(u.uuid)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        border: 'none',
                        borderBottom: '1px solid var(--border)',
                        background: isSelected ? 'var(--accent-faint, rgba(217,119,87,0.08))' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {u.fullName || 'Unnamed User'}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {u.email}
                        </div>
                        {u.signupCampaignTag && (
                          <span
                            style={{
                              display: 'inline-block',
                              marginTop: 4,
                              fontSize: '10.5px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: 'rgba(217,119,87,0.12)',
                              color: 'var(--accent)',
                            }}
                          >
                            Campaign: {u.signupCampaignTag}
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                          {formatNgn(u.availableVoucherBalanceNaira)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Voucher Bal
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Panel: Selected User Balance, Award Form & Transaction History */}
          <div>
            {!selectedUserUuid ? (
              <div
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <Ticket size={32} style={{ margin: '0 auto 12px', color: 'var(--accent)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Select a User to View Balance &amp; Credit Vouchers
                </h3>
                <p style={{ fontSize: '13px', maxWidth: 420, margin: '6px auto 0' }}>
                  Click any registered user on the left to inspect their cumulative voucher balance,
                  individual voucher records, and credit a new voucher or cashback reward.
                </p>
              </div>
            ) : loadingUserDetail || !selectedUserDetail ? (
              <div
                style={{
                  background: 'var(--white)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                Loading user rewards profile...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Selected User Summary Header */}
                <div
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                        {selectedUserDetail.user.fullName}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 2 }}>
                        {selectedUserDetail.user.email}
                        {selectedUserDetail.user.phone ? ` • ${selectedUserDetail.user.phone}` : ''}
                      </div>
                      {selectedUserDetail.user.signupCampaignTag && (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 8,
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: 'rgba(217, 119, 87, 0.12)',
                            color: 'var(--accent)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          <Sparkles size={12} />
                          <span>Registered via Campaign: {selectedUserDetail.user.signupCampaignTag}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: 10,
                          background: 'rgba(217, 119, 87, 0.1)',
                          border: '1px solid rgba(217, 119, 87, 0.3)',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>
                          AVAILABLE VOUCHER BALANCE
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
                          {formatNgn(selectedUserDetail.summary.availableBalanceNaira)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Earned: {formatNgn(selectedUserDetail.summary.totalEarnedNaira)} • Redeemed:{' '}
                          {formatNgn(selectedUserDetail.summary.totalRedeemedNaira)}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: 10,
                          background: 'rgba(16, 185, 129, 0.08)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                          SAVINGS WALLET CASHBACK
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
                          {formatNgn(selectedUserDetail.summary.totalCashbackNaira)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Real cash credited to Savings Vault
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual Credit Form (Adds to user's existing balance) */}
                <form
                  onSubmit={handleAwardSubmit}
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                        2. Credit Reward to {selectedUserDetail.user.firstName}
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                        Manually awarding a voucher adds a new individual voucher record to the
                        user’s existing balance without overwriting previous rewards.
                      </p>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAwardMode('VOUCHER')
                          setVoucherReason('External Game Winner Reward')
                        }}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: awardMode === 'VOUCHER' ? 'var(--accent)' : 'var(--white)',
                          color: awardMode === 'VOUCHER' ? '#fff' : 'var(--text)',
                        }}
                      >
                        Promotional Voucher
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAwardMode('CASHBACK')
                          setVoucherReason('Qualifying Savings Activity Cashback')
                        }}
                        style={{
                          padding: '6px 12px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: awardMode === 'CASHBACK' ? '#059669' : 'var(--white)',
                          color: awardMode === 'CASHBACK' ? '#fff' : 'var(--text)',
                        }}
                      >
                        Savings Cashback
                      </button>
                    </div>
                  </div>

                  {awardMode === 'VOUCHER' && (
                    <div style={{ marginBottom: 14 }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: 6,
                        }}
                      >
                        Quick Reason Presets
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {PRESET_VOUCHER_REASONS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setVoucherSourceType(preset.sourceType)
                              setVoucherReason(preset.reason)
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: 999,
                              border:
                                voucherReason === preset.reason
                                  ? '1px solid var(--accent)'
                                  : '1px solid var(--border)',
                              background:
                                voucherReason === preset.reason
                                  ? 'rgba(217, 119, 87, 0.12)'
                                  : 'var(--surface-hover)',
                              color:
                                voucherReason === preset.reason ? 'var(--accent)' : 'var(--text)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: 4,
                        }}
                      >
                        Amount (₦) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={voucherAmountNaira}
                        onChange={(e) => setVoucherAmountNaira(Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: '13.5px',
                        }}
                        required
                      />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: 4,
                        }}
                      >
                        Reason / Activity Label *
                      </label>
                      <input
                        type="text"
                        value={voucherReason}
                        onChange={(e) => setVoucherReason(e.target.value)}
                        placeholder="e.g. Game Winner, Campaign Participation, Manual Reward"
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          fontSize: '13.5px',
                        }}
                        required
                      />
                    </div>

                    {awardMode === 'VOUCHER' && (
                      <>
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              marginBottom: 4,
                            }}
                          >
                            Campaign Tag (Optional)
                          </label>
                          <input
                            type="text"
                            value={voucherCampaignTag}
                            onChange={(e) => setVoucherCampaignTag(e.target.value)}
                            placeholder="e.g. ig-trivia-nov"
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              fontSize: '13px',
                            }}
                          />
                        </div>

                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: 'var(--text-secondary)',
                              marginBottom: 4,
                            }}
                          >
                            Expiry Days (Optional)
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={voucherExpiryDays}
                            onChange={(e) => setVoucherExpiryDays(e.target.value)}
                            placeholder="Leave blank for no expiry"
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              fontSize: '13px',
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {awardMode === 'VOUCHER' ? (
                        <>
                          New voucher balance after credit:{' '}
                          <strong style={{ color: 'var(--text)' }}>
                            {formatNgn(
                              (selectedUserDetail.summary.availableBalanceNaira || 0) +
                                (Number(voucherAmountNaira) || 0),
                            )}
                          </strong>
                        </>
                      ) : (
                        <>
                          Funded from Cashback Pool and credited directly to Savings Wallet principal.
                        </>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingAward}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '10px 18px',
                        borderRadius: 8,
                        border: 'none',
                        background: awardMode === 'VOUCHER' ? 'var(--accent)' : '#059669',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Plus size={15} />
                      <span>
                        {submittingAward
                          ? 'Crediting...'
                          : awardMode === 'VOUCHER'
                            ? `Credit ${formatNgn(voucherAmountNaira)} Voucher`
                            : `Credit ${formatNgn(voucherAmountNaira)} Cashback`}
                      </span>
                    </button>
                  </div>
                </form>

                {/* User's Individual Voucher Ledger & Transaction History */}
                <div
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '20px',
                  }}
                >
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
                    3. User’s Individual Voucher Ledger (
                    {selectedUserDetail.summary.vouchers?.length || 0})
                  </h3>

                  {!selectedUserDetail.summary.vouchers ||
                  selectedUserDetail.summary.vouchers.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                      This user has no promotional vouchers yet.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr
                            style={{
                              borderBottom: '1px solid var(--border)',
                              textAlign: 'left',
                              color: 'var(--text-muted)',
                              fontSize: '11.5px',
                            }}
                          >
                            <th style={{ padding: '8px 10px' }}>CODE</th>
                            <th style={{ padding: '8px 10px' }}>REASON / SOURCE</th>
                            <th style={{ padding: '8px 10px' }}>AMOUNT</th>
                            <th style={{ padding: '8px 10px' }}>REDEEMED</th>
                            <th style={{ padding: '8px 10px' }}>REMAINING</th>
                            <th style={{ padding: '8px 10px' }}>STATUS</th>
                            <th style={{ padding: '8px 10px' }}>EARNED / TIMESTAMPS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedUserDetail.summary.vouchers.map((v: any) => (
                            <tr key={v.uuid} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px', fontWeight: 600, fontFamily: 'monospace' }}>
                                {v.code}
                              </td>
                              <td style={{ padding: '10px' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v.reason}</div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                  {v.sourceType}
                                  {v.campaignTag ? ` • Campaign: ${v.campaignTag}` : ''}
                                  {v.awardedByAdminEmail ? ` • By ${v.awardedByAdminEmail}` : ''}
                                </div>
                              </td>
                              <td style={{ padding: '10px', fontWeight: 700 }}>
                                {formatNgn(v.amountNaira)}
                              </td>
                              <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                                {formatNgn(v.redeemedAmountNaira)}
                              </td>
                              <td style={{ padding: '10px', fontWeight: 700, color: 'var(--accent)' }}>
                                {formatNgn(v.remainingAmountNaira)}
                              </td>
                              <td style={{ padding: '10px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: 999,
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    background:
                                      v.status === 'ACTIVE'
                                        ? 'rgba(16,185,129,0.12)'
                                        : v.status === 'PARTIALLY_REDEEMED'
                                          ? 'rgba(245,158,11,0.14)'
                                          : v.status === 'REDEEMED'
                                            ? 'rgba(59,130,246,0.12)'
                                            : 'rgba(239,68,68,0.12)',
                                    color:
                                      v.status === 'ACTIVE'
                                        ? '#059669'
                                        : v.status === 'PARTIALLY_REDEEMED'
                                          ? '#d97706'
                                          : v.status === 'REDEEMED'
                                            ? '#2563eb'
                                            : '#dc2626',
                                  }}
                                >
                                  {v.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                                <div>Earned: {new Date(v.createdAt).toLocaleString()}</div>
                                {v.redeemedAt && (
                                  <div>Redeemed: {new Date(v.redeemedAt).toLocaleString()}</div>
                                )}
                                {v.expiresAt && (
                                  <div>Expires: {new Date(v.expiresAt).toLocaleDateString()}</div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Automated Reward Triggers & Configurable Amounts */}
      {activeTab === 'AUTOMATED_RULES' && (
        <div
          style={{
            background: 'var(--white)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '20px',
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Configurable Automated Reward Triggers
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: 4 }}>
              Adjust voucher and cashback amounts or qualifying thresholds for any activity without
              requiring a code change.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border)',
                    textAlign: 'left',
                    color: 'var(--text-muted)',
                    fontSize: '11.5px',
                  }}
                >
                  <th style={{ padding: '10px' }}>ACTIVITY / TRIGGER KEY</th>
                  <th style={{ padding: '10px' }}>CATEGORY</th>
                  <th style={{ padding: '10px' }}>REWARD AMOUNT</th>
                  <th style={{ padding: '10px' }}>MIN QUALIFYING AMOUNT</th>
                  <th style={{ padding: '10px' }}>MAX PER USER</th>
                  <th style={{ padding: '10px' }}>STATUS</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => {
                  const isEditing = editingRuleKey === rule.triggerKey
                  return (
                    <tr key={rule.triggerKey} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{rule.name}</div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            fontFamily: 'monospace',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {rule.triggerKey}
                          {rule.campaignTag ? ` • tag: ${rule.campaignTag}` : ''}
                        </div>
                        {rule.description && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                            {rule.description}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 999,
                            fontSize: '11px',
                            fontWeight: 700,
                            background:
                              rule.rewardCategory === 'CASHBACK'
                                ? 'rgba(16,185,129,0.12)'
                                : 'rgba(217,119,87,0.14)',
                            color:
                              rule.rewardCategory === 'CASHBACK' ? '#059669' : 'var(--accent)',
                          }}
                        >
                          {rule.rewardCategory}
                        </span>
                      </td>

                      <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={ruleAmountNaira}
                            onChange={(e) => setRuleAmountNaira(Number(e.target.value))}
                            style={{
                              width: 110,
                              padding: '6px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                            }}
                          />
                        ) : (
                          formatNgn(rule.rewardAmountNaira)
                        )}
                      </td>

                      <td style={{ padding: '12px 10px' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            value={ruleMinQualifyingNaira}
                            onChange={(e) => setRuleMinQualifyingNaira(Number(e.target.value))}
                            style={{
                              width: 110,
                              padding: '6px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                            }}
                          />
                        ) : rule.minQualifyingAmountNaira > 0 ? (
                          formatNgn(rule.minQualifyingAmountNaira)
                        ) : (
                          'None'
                        )}
                      </td>

                      <td style={{ padding: '12px 10px' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            min={0}
                            value={ruleMaxPerUser}
                            onChange={(e) => setRuleMaxPerUser(Number(e.target.value))}
                            style={{
                              width: 70,
                              padding: '6px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                            }}
                          />
                        ) : rule.maxPerUser === 0 ? (
                          'Unlimited'
                        ) : (
                          `${rule.maxPerUser}x`
                        )}
                      </td>

                      <td style={{ padding: '12px 10px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleRuleActive(rule)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: rule.isActive
                              ? 'rgba(16,185,129,0.14)'
                              : 'rgba(107,114,128,0.15)',
                            color: rule.isActive ? '#059669' : 'var(--text-muted)',
                          }}
                        >
                          {rule.isActive ? 'ACTIVE' : 'PAUSED'}
                        </button>
                      </td>

                      <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                        {isEditing ? (
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              type="button"
                              disabled={savingRule}
                              onClick={() => handleSaveRule(rule.triggerKey)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: 'var(--accent)',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRuleKey(null)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--border)',
                                background: 'var(--white)',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRuleKey(rule.triggerKey)
                              setRuleAmountNaira(rule.rewardAmountNaira)
                              setRuleMinQualifyingNaira(rule.minQualifyingAmountNaira)
                              setRuleMaxPerUser(rule.maxPerUser)
                              setRuleCampaignTag(rule.campaignTag || '')
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              background: 'var(--white)',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Configure
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Promotional Sign-Up Campaigns & Global Ledger */}
      {activeTab === 'CAMPAIGNS_AND_LEDGER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Promotional Registration Link Builder */}
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Link2 size={18} color="var(--accent)" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Promotional Voucher Sign-Up Page Link Generator
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 14px' }}>
              Share the dedicated promotional sign-up page. Users who register through this link are
              tagged with the campaign identifier and automatically receive their promotional
              voucher.
            </p>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Campaign Tag:
                </span>
                <input
                  type="text"
                  value={customCampaignTag}
                  onChange={(e) => setCustomCampaignTag(e.target.value)}
                  placeholder="voucher-signup"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                    width: 180,
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 260,
                  padding: '9px 14px',
                  borderRadius: 8,
                  background: 'var(--surface-hover)',
                  border: '1px solid var(--border)',
                  fontFamily: 'monospace',
                  fontSize: '12.5px',
                  color: 'var(--text)',
                }}
              >
                {promoUrl}
              </div>

              <button
                type="button"
                onClick={copyCampaignUrl}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedLink ? 'Copied!' : 'Copy Registration Link'}</span>
              </button>
            </div>

            {campaignStats.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  Campaign Performance Breakdown
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'left',
                        color: 'var(--text-muted)',
                        fontSize: '11.5px',
                      }}
                    >
                      <th style={{ padding: '8px' }}>CAMPAIGN TAG</th>
                      <th style={{ padding: '8px' }}>SIGN-UPS</th>
                      <th style={{ padding: '8px' }}>VOUCHERS CREDITED</th>
                      <th style={{ padding: '8px' }}>TOTAL VOUCHER VALUE</th>
                      <th style={{ padding: '8px' }}>REDEEMED VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaignStats.map((c: any) => (
                      <tr key={c.campaignTag} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px', fontWeight: 700 }}>{c.campaignTag}</td>
                        <td style={{ padding: '8px' }}>{c.signupsCount}</td>
                        <td style={{ padding: '8px' }}>{c.vouchersAwardedCount}</td>
                        <td style={{ padding: '8px', fontWeight: 600 }}>
                          {formatNgn(c.totalVoucherValueNaira)}
                        </td>
                        <td style={{ padding: '8px', color: '#059669', fontWeight: 600 }}>
                          {formatNgn(c.totalRedeemedNaira)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Global Voucher Transaction History */}
          <div
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Recent Promotional Vouchers Ledger
              </h3>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                }}
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active (Unredeemed)</option>
                <option value="PARTIALLY_REDEEMED">Partially Redeemed</option>
                <option value="REDEEMED">Fully Redeemed</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>

            {recentVouchers.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No voucher records found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'left',
                        color: 'var(--text-muted)',
                        fontSize: '11.5px',
                      }}
                    >
                      <th style={{ padding: '8px 10px' }}>CODE</th>
                      <th style={{ padding: '8px 10px' }}>USER</th>
                      <th style={{ padding: '8px 10px' }}>REASON / CAMPAIGN</th>
                      <th style={{ padding: '8px 10px' }}>AMOUNT</th>
                      <th style={{ padding: '8px 10px' }}>REMAINING</th>
                      <th style={{ padding: '8px 10px' }}>STATUS</th>
                      <th style={{ padding: '8px 10px' }}>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVouchers.map((v: any) => (
                      <tr key={v.uuid} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 600 }}>
                          {v.code}
                        </td>
                        <td style={{ padding: '10px' }}>
                          {v.user ? (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('USERS_AND_AWARD')
                                fetchUserDetail(v.user.uuid)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                textAlign: 'left',
                                cursor: 'pointer',
                                color: 'var(--accent)',
                                fontWeight: 600,
                              }}
                            >
                              {v.user.firstName} {v.user.lastName} ({v.user.email})
                            </button>
                          ) : (
                            `User #${v.userId}`
                          )}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600 }}>{v.reason}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {v.sourceType}
                            {v.campaignTag ? ` • Campaign: ${v.campaignTag}` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{formatNgn(v.amountNaira)}</td>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--accent)' }}>
                          {formatNgn(v.remainingAmountNaira)}
                        </td>
                        <td style={{ padding: '10px' }}>{v.status}</td>
                        <td style={{ padding: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(v.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Up Cashback Pool Modal */}
      {showTopUpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
          onClick={() => setShowTopUpModal(false)}
        >
          <form
            onSubmit={handleTopUpPool}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--white)',
              borderRadius: 14,
              padding: '24px',
              width: '100%',
              maxWidth: 420,
              border: '1px solid var(--border)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>
              Top Up Designated Cashback Pool
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Savings cashback rewards are real monetary value funded from this pool into qualifying
              users’ Savings Wallets.
            </p>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Top-Up Amount (₦)
            </label>
            <input
              type="number"
              min={1}
              value={topUpAmountNaira}
              onChange={(e) => setTopUpAmountNaira(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontSize: '14px',
                marginBottom: 16,
              }}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowTopUpModal(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--white)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingTopUp}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#059669',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {submittingTopUp ? 'Updating...' : `Add ${formatNgn(topUpAmountNaira)}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
