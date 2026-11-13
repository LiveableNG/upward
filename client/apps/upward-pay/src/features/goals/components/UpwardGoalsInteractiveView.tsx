'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import '@/features/dashboard/styles/goals-dashboard.css'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Gift,
  Home,
  MapPin,
  Package,
  PiggyBank,
  Plus,
  Receipt,
  Share2,
  ShoppingBag,
  Target,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useScoreProfile } from '@/features/dashboard/services/scoreService'
import { getPublicWebUrl, copyTextToClipboard } from '@/lib/utils'
import { useToast } from '@/components/common/Toast'
import { haptics } from '@/lib/haptics'
import {
  type GoalCategoryId,
  type CustomGoalEntry,
  MAX_GOALS_PER_CATEGORY,
  UPWARD_GOAL_CATEGORIES,
  HOME_REFRESH_ITEMS,
  PROFESSIONAL_QUALIFICATIONS,
} from '../data/upwardGoalsSpec'
import { useUpwardGoalsStore } from '../hooks/useUpwardGoalsStore'

type SubScreen =
  | { type: 'list' }
  | { type: 'housing-hub' }
  | { type: 'own-home' }
  | { type: 'home-refresh' }
  | { type: 'category-question'; categoryId: GoalCategoryId; savedDone?: boolean }
  | { type: 'save-money'; savedDone?: boolean }
  | { type: 'custom-goal-form'; savedDone?: boolean }
  | { type: 'custom-goal-detail'; goalId: string }

interface UpwardGoalsInteractiveViewProps {
  mode: 'onboarding' | 'dashboard' | 'workspace'
  rentSavedPct?: number
  rentSavedNaira?: number
  rentTargetNaira?: number
  onFinishOnboarding?: () => void
  onSkipOnboarding?: () => void
}

function CircularRing({ pct, size = 52 }: { pct: number; size?: number }) {
  const center = size / 2
  const radius = center - 5
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(0, Math.round(pct)))
  const dash = circumference * (clamped / 100)
  const strokeColor = clamped > 0 ? 'var(--clay, #d97757)' : '#bcb3a7'

  return (
    <div
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        position: 'relative',
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: size, height: size, transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e2ddd7"
          strokeWidth="5"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--text, #0a0a0f)',
        }}
      >
        {clamped}%
      </div>
    </div>
  )
}

export function UpwardGoalsInteractiveView({
  mode,
  rentSavedPct = 0,
  rentSavedNaira = 0,
  rentTargetNaira = 2400000,
  onFinishOnboarding,
  onSkipOnboarding,
}: UpwardGoalsInteractiveViewProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { data: scoreProfile } = useScoreProfile()
  const toast = useToast()
  const firstName = user?.firstName || 'there'

  const scoreData = scoreProfile?.data
  const credScore = scoreData?.score || 500
  const maxScore = scoreData?.maxScore || 900
  const lowerBand = (scoreData?.band || '').toLowerCase()
  const scoreTone =
    lowerBand.includes('strong') || lowerBand.includes('good') || lowerBand.includes('excellent') || credScore >= 700
      ? 'good'
      : lowerBand.includes('risk') || lowerBand.includes('poor') || (scoreData?.isScorable && credScore < 500)
        ? 'risk'
        : 'building'

  const handleShareProfile = async () => {
    const identifier = user?.profileSlug || user?.uuid || 'me'
    const url = getPublicWebUrl(`/profile/${identifier}`)
    const ok = await copyTextToClipboard(url)
    if (ok) {
      haptics.success()
      toast.success('Your rent credibility profile link has been copied.', 'Profile Link Copied')
    } else {
      router.push('/dashboard/score-breakdown')
    }
  }

  const {
    store,
    updateStore,
    toggleGoalInCategory,
    setQualification,
    setSaveMoneyAnswers,
    addCustomGoal,
    toggleCustomGoalAction,
    removeCustomGoal,
    toggleMilestone,
    hasSelectedAtLeastOneGoal,
    getCategoryProgress,
  } = useUpwardGoalsStore()

  const [screen, setScreen] = useState<SubScreen>({ type: 'list' })

  // Custom goal form state
  const [cgTitle, setCgTitle] = useState('')
  const [cgDesc, setCgDesc] = useState('')
  const [cgTimeline, setCgTimeline] = useState('6 months')
  const [cgCustomDate, setCgCustomDate] = useState('')
  const [cgTargetAmount, setCgTargetAmount] = useState('')
  const [cgSuggestedCategory, setCgSuggestedCategory] = useState('')
  const [cgActions, setCgActions] = useState<string[]>([
    'Define my first milestone for this week',
    'Set a monthly budget or check-in reminder',
  ])
  const [cgNewActionInput, setCgNewActionInput] = useState('')

  // Custom qualification input state
  const [customQualText, setCustomQualText] = useState('')

  useEffect(() => {
    if (
      screen.type === 'custom-goal-detail' &&
      !store.customGoals.some((g) => g.id === screen.goalId)
    ) {
      setScreen({ type: 'list' })
    }
  }, [screen, store.customGoals])

  // Hide bottom & desktop navigation when inside any subscreen or onboarding
  useEffect(() => {
    if (typeof document === 'undefined') return
    const shouldHideNav = screen.type !== 'list' || mode === 'onboarding'
    document.body.classList.toggle('hide-subscreen-nav', shouldHideNav)
    return () => {
      document.body.classList.remove('hide-subscreen-nav')
    }
  }, [screen.type, mode])

  // Deep-link from Dashboard into Goals Page (/dashboard/goals?category=... or ?screen=...)
  useEffect(() => {
    if (mode !== 'workspace' || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const catParam = params.get('category') as GoalCategoryId | null
    const screenParam = params.get('screen')
    const goalIdParam = params.get('goalId')

    if (screenParam === 'home-refresh') {
      setScreen({ type: 'home-refresh' })
    } else if (screenParam === 'custom-form') {
      setScreen({ type: 'custom-goal-form' })
    } else if (screenParam === 'custom-detail' && goalIdParam) {
      setScreen({ type: 'custom-goal-detail', goalId: goalIdParam })
    } else if (catParam === 'housing') {
      setScreen({ type: 'housing-hub' })
    } else if (catParam === 'save_money') {
      setScreen({ type: 'save-money' })
    } else if (catParam && ['income', 'career', 'children'].includes(catParam)) {
      setScreen({ type: 'category-question', categoryId: catParam })
    }
  }, [mode])

  const handleToggleGoal = (categoryId: GoalCategoryId, goalId: string) => {
    haptics.selection()
    toggleGoalInCategory(categoryId, goalId)
  }

  const handleSaveCategory = (categoryId: GoalCategoryId) => {
    const selected = store.selectedByCategory[categoryId] || []
    if (selected.length === 0) {
      toast.info('Select at least 1 goal to save.', 'Choose a goal')
      return
    }
    haptics.success()
    toast.success('Your goals have been updated.', 'Saved')
    setScreen({ type: 'list' })
  }

  const getNextMilestoneForCategory = (categoryId: GoalCategoryId): string | null => {
    const cat = UPWARD_GOAL_CATEGORIES.find((c) => c.id === categoryId)
    if (!cat) return null
    const selected = store.selectedByCategory[categoryId] || []
    for (const gId of selected) {
      const g = cat.goals.find((x) => x.id === gId)
      if (!g) continue
      for (let i = 0; i < g.defaultMilestones.length; i++) {
        if (!store.completedMilestoneIds.includes(`${gId}:${i}`)) {
          return g.defaultMilestones[i]
        }
      }
    }
    return null
  }

  const handleCreateCustomGoal = (e?: React.SyntheticEvent) => {
    e?.preventDefault()
    if (!cgTitle.trim()) {
      toast.error('Please enter a title for your goal.')
      return
    }
    const parsedTarget = Number(cgTargetAmount.replace(/[^\d]/g, ''))
    addCustomGoal({
      title: cgTitle.trim(),
      description: cgDesc.trim() || 'Working steadily towards this personal goal.',
      whenTimeline: cgTimeline === 'Custom date' && cgCustomDate ? cgCustomDate : cgTimeline,
      targetDate: cgCustomDate || undefined,
      targetAmountNaira: parsedTarget > 0 ? parsedTarget : undefined,
      suggestedCategory: cgSuggestedCategory.trim() || undefined,
      actions: cgActions.filter(Boolean).map((a, idx) => ({
        id: `act-${Date.now()}-${idx}`,
        title: a,
        completed: false,
      })),
    })
    haptics.success()
    toast.success(`Added "${cgTitle.trim()}" to your goals.`, 'Custom Goal Created')
    setScreen({ type: 'list' })
  }

  const resetAndOpenCustomForm = () => {
    setCgTitle('')
    setCgDesc('')
    setCgTimeline('6 months')
    setCgCustomDate('')
    setCgTargetAmount('')
    setCgSuggestedCategory('')
    setCgActions([
      'Define my first milestone for this week',
      'Set a monthly budget or check-in reminder',
    ])
    setCgNewActionInput('')
    setScreen({ type: 'custom-goal-form' })
  }

  const getCategorySubtitle = (categoryId: GoalCategoryId): string => {
    const cat = UPWARD_GOAL_CATEGORIES.find((c) => c.id === categoryId)
    if (!cat) return ''

    if (categoryId === 'housing') {
      const selected = store.selectedByCategory.housing || []
      const extraTitles = selected
        .map((id) => cat.goals.find((g) => g.id === id)?.title)
        .filter(Boolean)
      const pct = getCategoryProgress('housing', rentSavedPct)
      if (extraTitles.length > 0) {
        return `${pct}% progress · ${extraTitles.slice(0, 2).join(', ')}${extraTitles.length > 2 ? ` +${extraTitles.length - 2}` : ''}`
      }
      return `${pct}% saved towards your next rent`
    }

    if (categoryId === 'save_money') {
      const a = store.saveMoneyAnswers
      const parts: string[] = []
      if (a.laundrySpendMonthly) parts.push('Laundry')
      if (a.groceryRegularItems.some((x) => x.trim())) parts.push('Groceries')
      if (a.openToRoommate) parts.push('Housing')
      if (a.commuteSpendMonthly) parts.push('Commute')
      return parts.length > 0
        ? `Configured: ${parts.join(', ')}`
        : cat.subtitle
    }

    const selected = store.selectedByCategory[categoryId] || []
    if (selected.length === 0) return cat.subtitle
    const titles = selected
      .map((id) => {
        const g = cat.goals.find((x) => x.id === id)
        const qual = store.qualifications[id]
        if (g && qual) return `${g.title} (${qual})`
        return g?.title
      })
      .filter(Boolean)
    return `${titles.join(' · ')}`
  }

  // ── SUBSCREEN: OWN A HOME (3 Steps + Interest) ──
  if (screen.type === 'own-home') {
    return (
      <div className="upward-goals-flow">
        <div className="upward-goals-flow__topbar">
          <button
            type="button"
            className="upward-goals-flow__back-btn"
            onClick={() => setScreen({ type: 'housing-hub' })}
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="upward-goals-flow__topbar-title">Buy a house</h2>
        </div>

        <p className="upward-goals-flow__subhead">
          Your goal does not have to be this year. Start preparing towards owning a home within the next 1–5 years.
        </p>

        <div className="upward-goals-flow__steps">
          <div className="upward-goals-flow__step-card">
            <div className="upward-goals-flow__step-num">1</div>
            <div>
              <h4>Start with education</h4>
              <p>Short webinars and practical guides on buying property in Nigeria — before you put money down.</p>
            </div>
          </div>
          <div className="upward-goals-flow__step-card">
            <div className="upward-goals-flow__step-num">2</div>
            <div>
              <h4>Join a cooperative</h4>
              <p>Pool resources with vetted Upward members to unlock collective land and housing opportunities.</p>
            </div>
          </div>
          <div className="upward-goals-flow__step-card">
            <div className="upward-goals-flow__step-num">3</div>
            <div>
              <h4>Events & site visits first</h4>
              <p>Visit housing developments in person and learn directly from experts before committing capital.</p>
            </div>
          </div>
        </div>

        <div className="upward-goals-flow__panel">
          <h4>Upcoming Home-Ownership Visit</h4>
          <p>
            We are organising a guided visit to inspect vetted housing opportunities. Register your interest and we will share dates first.
          </p>
        </div>

        <div className="upward-goals-flow__footer-stack">
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={() => {
              haptics.success()
              updateStore((prev) => ({
                ...prev,
                ownHomeInterested: true,
                selectedByCategory: {
                  ...prev.selectedByCategory,
                  housing: prev.selectedByCategory.housing.includes('buy-a-house')
                    ? prev.selectedByCategory.housing
                    : [...prev.selectedByCategory.housing, 'buy-a-house'].slice(0, MAX_GOALS_PER_CATEGORY),
                },
              }))
              toast.success('Interest saved! We will notify you as home-ownership events open.', 'Buy a House')
              setScreen({ type: 'housing-hub' })
            }}
          >
            {store.ownHomeInterested ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>Interest Registered</span>
                <Check size={16} />
              </span>
            ) : (
              'I am interested'
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── SUBSCREEN: HOME REFRESH PACKAGE (Prepare for the New Year) ──
  if (screen.type === 'home-refresh') {
    const saveHomeRefresh = () => {
      haptics.success()
      updateStore((prev) => ({
        ...prev,
        homeRefreshInterested: true,
        selectedByCategory: {
          ...prev.selectedByCategory,
          housing: prev.selectedByCategory.housing.includes('prepare-new-year')
            ? prev.selectedByCategory.housing
            : [...prev.selectedByCategory.housing, 'prepare-new-year'].slice(0, MAX_GOALS_PER_CATEGORY),
        },
      }))
      toast.success(
        `Saved ${store.homeRefreshSelectedItems.length} items in your Home Refresh bundle.`,
        'Home Refresh Package',
      )
      setScreen({ type: 'list' })
    }

    return (
      <div className="upward-goals-flow">
        <div className="upward-goals-flow__topbar">
          <button
            type="button"
            className="upward-goals-flow__back-btn"
            onClick={() => setScreen({ type: 'list' })}
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="upward-goals-flow__topbar-title">Home Refresh Bundle</h2>
          <button
            type="button"
            className="upward-goals-flow__topbar-save"
            onClick={saveHomeRefresh}
          >
            <Check size={14} />
            <span>Save</span>
          </button>
        </div>

        <p className="upward-goals-flow__subhead">
          Select the essentials you want in your New Year Home Refresh bundle.
        </p>

        <div className="upward-goals-flow__option-list">
          {HOME_REFRESH_ITEMS.map((item) => {
            const isChecked = store.homeRefreshSelectedItems.includes(item.id)
            return (
              <button
                key={item.id}
                type="button"
                className={`upward-goals-flow__check-option ${isChecked ? 'is-on' : ''}`}
                onClick={() => {
                  haptics.selection()
                  updateStore((prev) => {
                    const list = prev.homeRefreshSelectedItems
                    const next = list.includes(item.id)
                      ? list.filter((x) => x !== item.id)
                      : [...list, item.id]
                    return { ...prev, homeRefreshSelectedItems: next }
                  })
                }}
              >
                <span className="upward-goals-flow__tickbox">
                  <Check size={12} strokeWidth={2.5} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.category}</div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="upward-goals-flow__footer-stack" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={saveHomeRefresh}
          >
            Save Home Refresh Selection
          </button>

          <button
            type="button"
            className="btn btn--secondary btn--full"
            onClick={() => router.push('/dashboard/explore')}
          >
            <ShoppingBag size={16} />
            <span>Browse Marketplace</span>
          </button>
        </div>
      </div>
    )
  }

  // ── SUBSCREEN: HOUSING & LIFESTYLE HUB ──
  if (screen.type === 'housing-hub') {
    const pct = getCategoryProgress('housing', rentSavedPct)

    return (
      <div className="upward-goals-flow">
        <div className="upward-goals-flow__topbar">
          <button
            type="button"
            className="upward-goals-flow__back-btn"
            onClick={() => setScreen({ type: 'list' })}
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="upward-goals-flow__topbar-title">Home &amp; Lifestyle</h2>
        </div>

        {/* Rent Savings + Score Badge + Share & Rental Details */}
        <div className="upward-goals-flow__cred-card">
          <div className="upward-goals-flow__cred-top">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <button
                  type="button"
                  className={`upward-goals-flow__cred-score-badge upward-goals-flow__cred-score-badge--${scoreTone}`}
                  onClick={() => router.push('/dashboard/score-breakdown')}
                >
                  <span className="upward-goals-flow__cred-score-dot" />
                  <span>Score {credScore}/{maxScore}</span>
                  <ChevronRight size={12} />
                </button>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 2px', color: 'var(--text)' }}>
                {pct}% saved towards your next rent
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                ₦{rentSavedNaira.toLocaleString('en-NG')} of ₦{rentTargetNaira.toLocaleString('en-NG')} target
              </p>
            </div>
            <CircularRing pct={pct} size={56} />
          </div>

          <div className="upward-goals-flow__cred-actions">
            <button
              type="button"
              className="upward-goals-flow__cred-btn"
              onClick={handleShareProfile}
            >
              <Share2 size={14} color="var(--clay)" />
              <span>Share Profile</span>
            </button>
            <button
              type="button"
              className="upward-goals-flow__cred-btn"
              onClick={() => router.push('/dashboard/setup/rental?mode=edit')}
            >
              <Building2 size={14} color="var(--clay)" />
              <span>Rental Details</span>
            </button>
            <button
              type="button"
              className="upward-goals-flow__cred-btn"
              onClick={() => router.push('/dashboard/transactions')}
            >
              <Receipt size={14} color="var(--clay)" />
              <span>Transactions</span>
            </button>
          </div>
        </div>

        <div className="upward-goals-flow__section-label">Housing &amp; Lifestyle Actions</div>
        <div className="upward-goals-flow__action-list">
          <button
            type="button"
            className="upward-goals-flow__action-card"
            onClick={() => router.push('/dashboard/savings')}
          >
            <span className="upward-goals-flow__action-ico">
              <PiggyBank size={18} />
            </span>
            <span className="upward-goals-flow__action-copy">
              <h4>Pay less for my next rent (Save for Rent)</h4>
              <p>Build up savings towards your upcoming rent and earn daily returns.</p>
            </span>
            <ChevronRight size={16} className="upward-goals-flow__chev" />
          </button>

          <button
            type="button"
            className="upward-goals-flow__action-card"
            onClick={() => router.push('/dashboard/pay-rent')}
          >
            <span className="upward-goals-flow__action-ico">
              <CreditCard size={18} />
            </span>
            <span className="upward-goals-flow__action-copy">
              <h4>Pay my rent now</h4>
              <p>Make your rent payment through Upward with instant verified receipts.</p>
            </span>
            <ChevronRight size={16} className="upward-goals-flow__chev" />
          </button>

          <button
            type="button"
            className="upward-goals-flow__action-card"
            onClick={() => setScreen({ type: 'own-home' })}
          >
            <span className="upward-goals-flow__action-ico">
              <Home size={18} />
            </span>
            <span className="upward-goals-flow__action-copy">
              <h4>Buy a house</h4>
              <p>Education, housing cooperative, and guided site visits when you are ready.</p>
            </span>
            <ChevronRight size={16} className="upward-goals-flow__chev" />
          </button>

          <button
            type="button"
            className="upward-goals-flow__action-card"
            onClick={() => router.push('/dashboard/lifestyle?id=6c9895cf-46b0-4753-99b3-eb1f10f825f4')}
          >
            <span className="upward-goals-flow__action-ico">
              <Package size={18} />
            </span>
            <span className="upward-goals-flow__action-copy">
              <h4>Prepare for the new year (Home Refresh)</h4>
              <p>Carpets, footmats, mop, broom, brush, kitchen towels, and cutlery bundles.</p>
            </span>
            <ChevronRight size={16} className="upward-goals-flow__chev" />
          </button>

          {/* Move to a new apartment (Coming soon + location input) */}
          <div className="upward-goals-flow__panel" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={16} color="var(--clay)" />
                <h4 style={{ margin: 0 }}>Move to a new apartment</h4>
              </div>
              <span className="upward-goals-flow__badge upward-goals-flow__badge--collect">
                Coming soon
              </span>
            </div>
            <input
              type="text"
              className="upward-goals-flow__field"
              placeholder="Where do you want to move? (e.g. Lekki, Yaba, Ikeja, Abuja)"
              value={store.movePreferredArea}
              onChange={(e) =>
                updateStore((prev) => ({ ...prev, movePreferredArea: e.target.value }))
              }
            />
          </div>

          {/* Gift someone (Occasion selector) */}
          <div className="upward-goals-flow__panel" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Gift size={16} color="var(--clay)" />
              <h4 style={{ margin: 0 }}>Gift someone (Birthday / Christmas)</h4>
            </div>
            <div className="upward-goals-flow__chips">
              {['Birthday', 'Christmas', 'Parents / Family', 'Anniversary'].map((occ) => {
                const active = store.giftOccasions.includes(occ)
                return (
                  <button
                    key={occ}
                    type="button"
                    className={`upward-goals-flow__chip-btn ${active ? 'is-on' : ''}`}
                    onClick={() => {
                      haptics.selection()
                      updateStore((prev) => ({
                        ...prev,
                        giftOccasions: active
                          ? prev.giftOccasions.filter((x) => x !== occ)
                          : [...prev.giftOccasions, occ],
                      }))
                    }}
                  >
                    {occ}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SUBSCREEN: SAVE MONEY / PAY LESS FOR STUFF (Section D Questions) ──
  if (screen.type === 'save-money') {
    const a = store.saveMoneyAnswers

    if (screen.savedDone) {
      return (
        <div className="upward-goals-flow">
          <div className="upward-goals-flow__thanks">
            <div className="upward-goals-flow__thanks-icon">
              <Check size={28} />
            </div>
            <h2>Thank you, {firstName}</h2>
            <p>
              Your everyday spend preferences have been saved. Upward will use this to unlock group discounts and ways to pay less on groceries, laundry, housing, and commute.
            </p>
            <div className="upward-goals-flow__footer-stack" style={{ marginTop: 22 }}>
              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => setScreen({ type: 'list' })}
              >
                Back to goals
              </button>
            </div>
          </div>
        </div>
      )
    }

    const updateRegularItem = (idx: 0 | 1 | 2, val: string) => {
      const next: [string, string, string] = [...a.groceryRegularItems] as [string, string, string]
      next[idx] = val
      setSaveMoneyAnswers({ groceryRegularItems: next })
    }

    const updateTopSpendItem = (idx: 0 | 1 | 2, val: string) => {
      const next: [string, string, string] = [...a.groceryTopSpendItems] as [string, string, string]
      next[idx] = val
      setSaveMoneyAnswers({ groceryTopSpendItems: next })
    }

    return (
      <div className="upward-goals-flow">
        <div className="upward-goals-flow__topbar">
          <button
            type="button"
            className="upward-goals-flow__back-btn"
            onClick={() => setScreen({ type: 'list' })}
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="upward-goals-flow__topbar-title">Save Money / Pay Less</h2>
          <button
            type="button"
            className="upward-goals-flow__topbar-save"
            onClick={() => {
              haptics.success()
              toast.success('Spend preferences saved.', 'Saved')
              setScreen({ type: 'list' })
            }}
          >
            <Check size={14} />
            <span>Save</span>
          </button>
        </div>

        <p className="upward-goals-flow__subhead">
          Answer these quick questions so we can connect you with collective deals and ways to pay less every month.
        </p>

        {/* 1. Laundry */}
        <div className="upward-goals-flow__panel">
          <div className="upward-goals-flow__section-label">1. Laundry</div>
          <label className="upward-goals-flow__question-title">
            How much do you currently spend on drycleaning monthly?
          </label>
          <div className="upward-goals-flow__chips" style={{ marginTop: 8 }}>
            {['₦5,000 – ₦15,000', '₦15,000 – ₦30,000', '₦30,000 – ₦50,000', '₦50,000+'].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`upward-goals-flow__chip-btn ${a.laundrySpendMonthly === preset ? 'is-on' : ''}`}
                onClick={() => setSaveMoneyAnswers({ laundrySpendMonthly: preset })}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="upward-goals-flow__field"
            placeholder="Or enter exact monthly amount (e.g. ₦20,000)"
            value={a.laundrySpendMonthly}
            onChange={(e) => setSaveMoneyAnswers({ laundrySpendMonthly: e.target.value })}
          />
        </div>

        {/* 2. Grocery Regular */}
        <div className="upward-goals-flow__panel">
          <div className="upward-goals-flow__section-label">2. Grocery — Regular Purchases</div>
          <label className="upward-goals-flow__question-title">
            What 3 things do you buy regularly?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              className="upward-goals-flow__field"
              placeholder="1. e.g. Rice"
              value={a.groceryRegularItems[0]}
              onChange={(e) => updateRegularItem(0, e.target.value)}
            />
            <input
              type="text"
              className="upward-goals-flow__field"
              placeholder="2. e.g. Eggs"
              value={a.groceryRegularItems[1]}
              onChange={(e) => updateRegularItem(1, e.target.value)}
            />
            <input
              type="text"
              className="upward-goals-flow__field"
              placeholder="3. e.g. Oil"
              value={a.groceryRegularItems[2]}
              onChange={(e) => updateRegularItem(2, e.target.value)}
            />
          </div>
        </div>

        {/* 3. Grocery Top Spend */}
        <div className="upward-goals-flow__panel">
          <div className="upward-goals-flow__section-label">3. Grocery — Highest Monthly Spend</div>
          <label className="upward-goals-flow__question-title">
            What 3 things do you spend the most money on monthly?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
            <input
              type="text"
              className="upward-goals-flow__field"
              placeholder="1. e.g. Protein"
              value={a.groceryTopSpendItems[0]}
              onChange={(e) => updateTopSpendItem(0, e.target.value)}
            />
            <input
              type="text"
              className="upward-goals-flow__field"
              placeholder="2. e.g. Rice/Grains"
              value={a.groceryTopSpendItems[1]}
              onChange={(e) => updateTopSpendItem(1, e.target.value)}
            />
            <input
              type="text"
              className="upward-goals-flow__field"
              placeholder="3. e.g. Toiletries"
              value={a.groceryTopSpendItems[2]}
              onChange={(e) => updateTopSpendItem(2, e.target.value)}
            />
          </div>
        </div>

        {/* 4. Housing Roommate */}
        <div className="upward-goals-flow__panel">
          <div className="upward-goals-flow__section-label">4. Housing</div>
          <label className="upward-goals-flow__question-title">
            Would you be open to sharing your space with a roommate?
          </label>
          <div className="upward-goals-flow__chips" style={{ marginTop: 8 }}>
            {[
              { id: 'yes' as const, label: 'Yes, open to it' },
              { id: 'maybe' as const, label: 'Maybe / depends on the match' },
              { id: 'no' as const, label: 'No, prefer living solo' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`upward-goals-flow__chip-btn ${a.openToRoommate === opt.id ? 'is-on' : ''}`}
                onClick={() => setSaveMoneyAnswers({ openToRoommate: opt.id })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Commute */}
        <div className="upward-goals-flow__panel">
          <div className="upward-goals-flow__section-label">5. Commute</div>
          <label className="upward-goals-flow__question-title">
            How much do you spend on transportation per month?
          </label>
          <div className="upward-goals-flow__chips" style={{ marginTop: 8 }}>
            {['Under ₦25,000', '₦25,000 – ₦50,000', '₦50,000 – ₦100,000', '₦100,000+'].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`upward-goals-flow__chip-btn ${a.commuteSpendMonthly === preset ? 'is-on' : ''}`}
                onClick={() => setSaveMoneyAnswers({ commuteSpendMonthly: preset })}
              >
                {preset}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="upward-goals-flow__field"
            placeholder="Or enter exact monthly transport spend (e.g. ₦45,000)"
            value={a.commuteSpendMonthly}
            onChange={(e) => setSaveMoneyAnswers({ commuteSpendMonthly: e.target.value })}
          />
        </div>

        <div className="upward-goals-flow__footer-stack">
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={() => {
              haptics.success()
              setScreen({ type: 'save-money', savedDone: true })
            }}
          >
            Save this
          </button>
        </div>
      </div>
    )
  }

  // ── SUBSCREEN: CATEGORY QUESTIONNAIRE (Income, Career, Children) ──
  if (screen.type === 'category-question') {
    const cat = UPWARD_GOAL_CATEGORIES.find((c) => c.id === screen.categoryId)!
    const selectedIds = store.selectedByCategory[cat.id] || []

    if (screen.savedDone) {
      const selectedTitles = selectedIds
        .map((id) => cat.goals.find((g) => g.id === id)?.title)
        .filter(Boolean)
      return (
        <div className="upward-goals-flow">
          <div className="upward-goals-flow__thanks">
            <div className="upward-goals-flow__thanks-icon">
              <Check size={28} />
            </div>
            <h2>Thank you, {firstName}</h2>
            <p>
              {selectedTitles.length > 0
                ? `Added ${selectedTitles.map((t) => `“${t}”`).join(', ')} to your ${cat.shortTitle} goals.`
                : `Your ${cat.shortTitle} goals have been updated.`}{' '}
              We&apos;ll show you the next steps to get there.
            </p>
            <div className="upward-goals-flow__footer-stack" style={{ marginTop: 22 }}>
              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => setScreen({ type: 'list' })}
              >
                Back to goals
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="upward-goals-flow">
        <div className="upward-goals-flow__topbar">
          <button
            type="button"
            className="upward-goals-flow__back-btn"
            onClick={() => setScreen({ type: 'list' })}
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="upward-goals-flow__topbar-title">{cat.shortTitle}</h2>
          <span className="upward-goals-flow__chip">
            {selectedIds.length} selected
          </span>
          <button
            type="button"
            className="upward-goals-flow__topbar-save"
            onClick={() => handleSaveCategory(cat.id)}
          >
            <Check size={14} />
            <span>Save</span>
          </button>
        </div>

        <div className="upward-goals-flow__section-label">
          Select your goals
        </div>

        <div className="upward-goals-flow__option-list">
          {cat.goals.map((g) => {
            const isSelected = selectedIds.includes(g.id)
            const currentQual = store.qualifications[g.id] || ''
            return (
              <div key={g.id} className="upward-goals-flow__option-wrap">
                <button
                  type="button"
                  className={`upward-goals-flow__check-option ${isSelected ? 'is-on' : ''}`}
                  onClick={() => handleToggleGoal(cat.id, g.id)}
                >
                  <span className="upward-goals-flow__tickbox">
                    <Check size={12} strokeWidth={2.5} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {g.title}
                      {isSelected && currentQual ? (
                        <span style={{ fontWeight: 600, color: 'var(--clay)', marginLeft: 6 }}>
                          · {currentQual}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>

                {/* Inline Career Qualification / Licence Sub-Question */}
                {isSelected && g.requiresQualification && (
                  <div className="upward-goals-flow__inline-prompt">
                    <div className="upward-goals-flow__section-label" style={{ marginTop: 0 }}>
                      Which qualification / licence for &ldquo;{g.title}&rdquo;?
                    </div>
                    {PROFESSIONAL_QUALIFICATIONS.map((grp) => (
                      <div key={grp.group} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                          {grp.group}
                        </div>
                        <div className="upward-goals-flow__chips">
                          {grp.items.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className={`upward-goals-flow__chip-btn ${currentQual === item ? 'is-on' : ''}`}
                              onClick={() => {
                                haptics.selection()
                                setQualification(g.id, item)
                              }}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <input
                      type="text"
                      className="upward-goals-flow__field"
                      placeholder="Or type a qualification / licence not listed..."
                      value={currentQual}
                      onChange={(e) => {
                        setQualification(g.id, e.target.value)
                      }}
                    />
                  </div>
                )}

                {/* Inline Side-Income Opportunity Sub-Question */}
                {isSelected && g.requiresSideIncomePrompt && (
                  <div className="upward-goals-flow__inline-prompt">
                    <div className="upward-goals-flow__section-label" style={{ marginTop: 0 }}>
                      Side-Income Opportunity &amp; Community
                    </div>
                    <input
                      type="text"
                      className="upward-goals-flow__field"
                      style={{ marginTop: 4, marginBottom: 8 }}
                      placeholder="What type of opportunity do you want to pursue? (e.g. Consulting, E-commerce, Tech freelance)"
                      value={store.sideIncomeOpportunity}
                      onChange={(e) =>
                        updateStore((prev) => ({ ...prev, sideIncomeOpportunity: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className={`upward-goals-flow__check-option ${store.joinSideIncomeCommunity ? 'is-on' : ''}`}
                      onClick={() =>
                        updateStore((prev) => ({
                          ...prev,
                          joinSideIncomeCommunity: !prev.joinSideIncomeCommunity,
                        }))
                      }
                    >
                      <span className="upward-goals-flow__tickbox">
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                      <span style={{ fontSize: 13 }}>
                        Connect me with relevant speakers, trainers, communities, and events
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Children's Clubs follow-up */}
        {cat.id === 'children' && selectedIds.length > 0 && (
          <div className="upward-goals-flow__panel" style={{ marginTop: 14 }}>
            <div className="upward-goals-flow__section-label">
              Interested in Children&apos;s Communities or Clubs?
            </div>
            <div className="upward-goals-flow__chips">
              {[
                'Mathematics Club',
                'Lawn Tennis & Sports Club',
                'Coding & Robotics Club',
                'Music & Piano Club',
                'Creative Arts Club',
              ].map((club) => {
                const active = store.childClubsInterested.includes(club)
                return (
                  <button
                    key={club}
                    type="button"
                    className={`upward-goals-flow__chip-btn ${active ? 'is-on' : ''}`}
                    onClick={() => {
                      haptics.selection()
                      updateStore((prev) => ({
                        ...prev,
                        childClubsInterested: active
                          ? prev.childClubsInterested.filter((c) => c !== club)
                          : [...prev.childClubsInterested, club],
                      }))
                    }}
                  >
                    {club}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <label className="upward-goals-flow__section-label">
            Anything else we should know? (Optional)
          </label>
          <textarea
            className="upward-goals-flow__field"
            rows={2}
            placeholder="Tell us in your own words..."
            value={store.categoryNotes[cat.id] || ''}
            onChange={(e) =>
              updateStore((prev) => ({
                ...prev,
                categoryNotes: { ...prev.categoryNotes, [cat.id]: e.target.value },
              }))
            }
          />
        </div>

        <div className="upward-goals-flow__footer-stack" style={{ marginTop: 14 }}>
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={() => handleSaveCategory(cat.id)}
          >
            Save this
          </button>
        </div>
      </div>
    )
  }

  // ── SUBSCREEN: CUSTOM GOAL CREATOR (Section E) ──
  if (screen.type === 'custom-goal-form') {
    if (screen.savedDone) {
      return (
        <div className="upward-goals-flow">
          <div className="upward-goals-flow__thanks">
            <div className="upward-goals-flow__thanks-icon">
              <Check size={28} />
            </div>
            <h2>Your custom goal is set</h2>
            <p>
              &ldquo;{cgTitle}&rdquo; has been added to your goals along with your timeline and action steps.
            </p>
            <div className="upward-goals-flow__footer-stack" style={{ marginTop: 22 }}>
              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => setScreen({ type: 'list' })}
              >
                Back to goals
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="upward-goals-flow">
        <div className="upward-goals-flow__topbar">
          <button
            type="button"
            className="upward-goals-flow__back-btn"
            onClick={() => setScreen({ type: 'list' })}
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="upward-goals-flow__topbar-title">Create Custom Goal</h2>
          <button
            type="button"
            className="upward-goals-flow__topbar-save"
            onClick={handleCreateCustomGoal}
          >
            <Check size={14} />
            <span>Save</span>
          </button>
        </div>

        <p className="upward-goals-flow__subhead">
          Tell Upward what you want to achieve, when you want to achieve it, and the actions you intend to take.
        </p>

        <form onSubmit={handleCreateCustomGoal}>
          <div className="upward-goals-flow__section-label">1. Create my own goal</div>
          <input
            type="text"
            className="upward-goals-flow__field"
            placeholder="e.g. Buy a car, Plan my wedding, Launch a podcast..."
            value={cgTitle}
            onChange={(e) => setCgTitle(e.target.value)}
            required
          />
          <div className="upward-goals-flow__chips" style={{ marginBottom: 12 }}>
            {['Buy a car', 'Wedding', 'Emergency fund', 'Sponsor a family member', 'Learn a new language'].map(
              (chip) => (
                <button
                  key={chip}
                  type="button"
                  className={`upward-goals-flow__chip-btn ${cgTitle === chip ? 'is-on' : ''}`}
                  onClick={() => setCgTitle(chip)}
                >
                  {chip}
                </button>
              ),
            )}
          </div>

          <div className="upward-goals-flow__section-label">2. Describe what I want to achieve</div>
          <textarea
            className="upward-goals-flow__field"
            rows={2}
            placeholder="Explain the outcome you are working towards..."
            value={cgDesc}
            onChange={(e) => setCgDesc(e.target.value)}
          />

          <div className="upward-goals-flow__section-label">3. When do you want to achieve this?</div>
          <div className="upward-goals-flow__chips" style={{ marginBottom: 10 }}>
            {['3 months', '6 months', '1 year', '2+ years', 'Custom date'].map((t) => (
              <button
                key={t}
                type="button"
                className={`upward-goals-flow__chip-btn ${cgTimeline === t ? 'is-on' : ''}`}
                onClick={() => setCgTimeline(t)}
              >
                {t}
              </button>
            ))}
          </div>
          {cgTimeline === 'Custom date' && (
            <input
              type="date"
              className="upward-goals-flow__field"
              value={cgCustomDate}
              onChange={(e) => setCgCustomDate(e.target.value)}
            />
          )}

          <div className="upward-goals-flow__section-label">Target budget (Optional, ₦)</div>
          <input
            type="text"
            inputMode="numeric"
            className="upward-goals-flow__field"
            placeholder="e.g. 1,500,000"
            value={cgTargetAmount}
            onChange={(e) => setCgTargetAmount(e.target.value)}
          />

          <div className="upward-goals-flow__section-label">4. Add actions towards my goal</div>
          <div className="upward-goals-flow__option-list" style={{ marginBottom: 8 }}>
            {cgActions.map((act, idx) => (
              <div
                key={`${act}-${idx}`}
                className="upward-goals-flow__check-option is-on"
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{act}</span>
                <button
                  type="button"
                  onClick={() => setCgActions((prev) => prev.filter((_, i) => i !== idx))}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  aria-label="Remove action"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              type="text"
              className="upward-goals-flow__field"
              style={{ marginBottom: 0, flex: 1 }}
              placeholder="Add an action step you intend to take..."
              value={cgNewActionInput}
              onChange={(e) => setCgNewActionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (cgNewActionInput.trim()) {
                    setCgActions((prev) => [...prev, cgNewActionInput.trim()])
                    setCgNewActionInput('')
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn btn--secondary"
              style={{ height: 44, padding: '0 16px' }}
              onClick={() => {
                if (cgNewActionInput.trim()) {
                  setCgActions((prev) => [...prev, cgNewActionInput.trim()])
                  setCgNewActionInput('')
                }
              }}
            >
              Add
            </button>
          </div>

          <div className="upward-goals-flow__section-label">
            5. Suggest a new goal category (Optional)
          </div>
          <input
            type="text"
            className="upward-goals-flow__field"
            placeholder="Tell Upward about a goal category not currently listed..."
            value={cgSuggestedCategory}
            onChange={(e) => setCgSuggestedCategory(e.target.value)}
          />

          <div className="upward-goals-flow__footer-stack" style={{ marginTop: 14 }}>
            <button type="submit" className="btn btn--primary btn--full">
              Create Goal
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ── SUBSCREEN: CUSTOM GOAL DETAIL ──
  if (screen.type === 'custom-goal-detail') {
    const goal = store.customGoals.find((g) => g.id === screen.goalId)
    if (!goal) {
      return null
    }
    const doneCount = goal.actions.filter((a) => a.completed).length
    const pct = goal.actions.length > 0 ? Math.round((doneCount / goal.actions.length) * 100) : 0

    return (
      <div className="upward-goals-flow">
        <div className="upward-goals-flow__topbar">
          <button
            type="button"
            className="upward-goals-flow__back-btn"
            onClick={() => setScreen({ type: 'list' })}
          >
            <ArrowLeft size={16} />
          </button>
          <h2 className="upward-goals-flow__topbar-title">{goal.title}</h2>
          <button
            type="button"
            onClick={() => {
              removeCustomGoal(goal.id)
              setScreen({ type: 'list' })
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            aria-label="Delete custom goal"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="upward-goals-flow__progress-banner">
          <CircularRing pct={pct} size={60} />
          <div>
            <h3>{goal.title}</h3>
            <p>
              Timeline: {goal.whenTimeline}
              {goal.targetAmountNaira
                ? ` · Target: ₦${goal.targetAmountNaira.toLocaleString('en-NG')}`
                : ''}
            </p>
          </div>
        </div>

        {goal.description && (
          <div className="upward-goals-flow__panel">
            <h4>What I want to achieve</h4>
            <p>{goal.description}</p>
          </div>
        )}

        <div className="upward-goals-flow__section-label">
          Action Steps ({doneCount}/{goal.actions.length} completed)
        </div>
        <div className="upward-goals-flow__option-list">
          {goal.actions.map((act) => (
            <button
              key={act.id}
              type="button"
              className={`upward-goals-flow__check-option ${act.completed ? 'is-on' : ''}`}
              onClick={() => {
                haptics.selection()
                toggleCustomGoalAction(goal.id, act.id)
              }}
            >
              <span className="upward-goals-flow__tickbox">
                <Check size={12} strokeWidth={2.5} />
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: act.completed ? 'line-through' : 'none',
                  color: act.completed ? 'var(--text-muted)' : 'var(--text)',
                }}
              >
                {act.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── MAIN SCREEN: CATEGORIES + DEFAULT HOUSING + HOME REFRESH ADVERT + CUSTOM GOALS ──
  const housingCategory = UPWARD_GOAL_CATEGORIES.find((c) => c.id === 'housing')!
  const otherCategories = UPWARD_GOAL_CATEGORIES.filter((c) => c.id !== 'housing')
  const housingPct = getCategoryProgress('housing', rentSavedPct)
  const housingNextStep = getNextMilestoneForCategory('housing')

  // On Dashboard: show only configured/active categories so the dashboard stays clean and focused
  const displayedOtherCategories =
    mode === 'dashboard'
      ? otherCategories.filter((cat) => {
          const selectedCount = (store.selectedByCategory[cat.id] || []).length
          const pct = getCategoryProgress(cat.id)
          return selectedCount > 0 || pct > 0
        })
      : otherCategories

  return (
    <div className="upward-goals-flow">
      {mode === 'onboarding' && (
        <div className="upward-goals-flow__onboarding-head">
          <div>
            <span className="upward-goals-flow__eyebrow">WELCOME TO UPWARD</span>
            <h1 className="upward-goals-flow__main-title">Your Goals</h1>
            <p className="upward-goals-flow__subhead" style={{ marginBottom: 0 }}>
              Choose the personal goals you want to work towards this year, or continue straight to your dashboard.
            </p>
          </div>
          {onSkipOnboarding && (
            <button
              type="button"
              className="upward-goals-flow__skip-btn"
              onClick={onSkipOnboarding}
            >
              Skip for now
            </button>
          )}
        </div>
      )}

      {mode !== 'onboarding' && (
        <div className="upward-goals-flow__section-header">
          <div>
            <h2 className="upward-goals-flow__section-title">
              {mode === 'dashboard' ? 'Other Goals & Offers' : 'Your Goals'}
            </h2>
            <p className="upward-goals-flow__section-sub">
              {mode === 'dashboard'
                ? 'Personal goals and seasonal home bundles'
                : 'Select and configure what you are working towards'}
            </p>
          </div>
          {mode === 'dashboard' ? (
            <button
              type="button"
              className="upward-goals-flow__new-goal-pill"
              onClick={() => router.push('/dashboard/goals')}
            >
              <span>Manage goals</span>
              <ChevronRight size={14} />
            </button>
          ) : (
            hasSelectedAtLeastOneGoal && (
              <button
                type="button"
                className="upward-goals-flow__new-goal-pill"
                onClick={resetAndOpenCustomForm}
              >
                <Plus size={15} />
                <span>Custom goal</span>
              </button>
            )
          )}
        </div>
      )}

      {/* 1. HOME & LIFESTYLE GOALS CARD (Shown in Onboarding & Workspace; on Dashboard it is the top Hero Card) */}
      <div className="upward-goals-flow__card-list">
        {mode !== 'dashboard' && (
          <button
            type="button"
            className="upward-goals-flow__goal-card upward-goals-flow__goal-card--active-housing"
            onClick={() => setScreen({ type: 'housing-hub' })}
          >
            <div className="upward-goals-flow__goal-card-copy">
              <div className="upward-goals-flow__kicker-row">
                <span className="upward-goals-flow__badge upward-goals-flow__badge--live">
                  In progress
                </span>
                <span className="upward-goals-flow__count-tag">
                  {(store.selectedByCategory.housing || []).length}/{MAX_GOALS_PER_CATEGORY} active
                </span>
              </div>
              <h3>{housingCategory.title}</h3>
              <p>{getCategorySubtitle('housing')}</p>
            </div>
            <CircularRing pct={housingPct} size={52} />
          </button>
        )}

        {/* HOME REFRESH PACKAGES ADVERT BANNER (Warm Light App Theme) */}
        <div
          className="upward-goals-flow__refresh-advert"
          onClick={() => router.push('/dashboard/lifestyle?id=6c9895cf-46b0-4753-99b3-eb1f10f825f4')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              router.push('/dashboard/lifestyle?id=6c9895cf-46b0-4753-99b3-eb1f10f825f4')
            }
          }}
        >
          <div className="upward-goals-flow__refresh-advert-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=900&q=80"
              alt="New Year Home Refresh Package"
              className="upward-goals-flow__refresh-advert-img"
              loading="lazy"
            />
            <div className="upward-goals-flow__refresh-advert-badge">
              <Package size={12} />
              <span>NEW YEAR HOME REFRESH PACKAGE</span>
            </div>
          </div>
          <div className="upward-goals-flow__refresh-advert-body">
            <h4>Prepare your home for the new year</h4>
            <p>
              Curated marketplace bundles: room &amp; bathroom carpets, footmats, mop, broom, brush, sponge, kitchen towels &amp; cutlery.
            </p>
            <div className="upward-goals-flow__refresh-advert-actions">
              <button
                type="button"
                className="upward-goals-flow__refresh-cta-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push('/dashboard/lifestyle?id=6c9895cf-46b0-4753-99b3-eb1f10f825f4')
                }}
              >
                <span>Explore Bundle</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* 2. USER'S CUSTOM GOALS (if any) */}
        {store.customGoals.map((cg: CustomGoalEntry) => {
          const done = cg.actions.filter((a) => a.completed).length
          const pct = cg.actions.length > 0 ? Math.round((done / cg.actions.length) * 100) : 0
          const nextAction = cg.actions.find((a) => !a.completed)?.title
          return (
            <button
              key={cg.id}
              type="button"
              className="upward-goals-flow__goal-card"
              onClick={() => {
                if (mode === 'dashboard') {
                  router.push(`/dashboard/goals?screen=custom-detail&goalId=${encodeURIComponent(cg.id)}`)
                } else {
                  setScreen({ type: 'custom-goal-detail', goalId: cg.id })
                }
              }}
            >
              <div className="upward-goals-flow__goal-card-copy">
                <div className="upward-goals-flow__kicker-row">
                  <span className="upward-goals-flow__badge upward-goals-flow__badge--live">
                    Target · {cg.whenTimeline}
                  </span>
                </div>
                <h3>{cg.title}</h3>
                <p>
                  {cg.targetAmountNaira
                    ? `Target: ₦${cg.targetAmountNaira.toLocaleString('en-NG')} · `
                    : ''}
                  {done}/{cg.actions.length} steps completed
                </p>
                {mode === 'dashboard' && nextAction && (
                  <div className="upward-goals-flow__goal-milestone-row">
                    <Target size={13} color="var(--clay)" />
                    <span>Next step: {nextAction}</span>
                  </div>
                )}
              </div>
              <CircularRing pct={pct} size={52} />
            </button>
          )
        })}

        {/* 3. OTHER PERSONAL GOAL CATEGORIES */}
        {displayedOtherCategories.map((cat) => {
          const selectedCount = (store.selectedByCategory[cat.id] || []).length
          const pct = getCategoryProgress(cat.id)
          const isStarted = selectedCount > 0 || pct > 0
          const nextStep = getNextMilestoneForCategory(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              className="upward-goals-flow__goal-card"
              onClick={() => {
                haptics.selection()
                if (mode === 'dashboard') {
                  router.push(`/dashboard/goals?category=${cat.id}`)
                  return
                }
                if (cat.id === 'save_money') {
                  setScreen({ type: 'save-money' })
                } else {
                  setScreen({ type: 'category-question', categoryId: cat.id })
                }
              }}
            >
              <div className="upward-goals-flow__goal-card-copy">
                <div className="upward-goals-flow__kicker-row">
                  <span
                    className={`upward-goals-flow__badge ${
                      isStarted
                        ? 'upward-goals-flow__badge--live'
                        : 'upward-goals-flow__badge--collect'
                    }`}
                  >
                    {isStarted ? 'In progress' : cat.badgeDefault}
                  </span>
                  {cat.id !== 'save_money' && selectedCount > 0 && (
                    <span className="upward-goals-flow__count-tag">
                      {selectedCount} active
                    </span>
                  )}
                </div>
                <h3>{cat.title}</h3>
                <p>{getCategorySubtitle(cat.id)}</p>
                {mode === 'dashboard' && nextStep && (
                  <div className="upward-goals-flow__goal-milestone-row">
                    <Target size={13} color="var(--clay)" />
                    <span>Next step: {nextStep}</span>
                  </div>
                )}
              </div>
              <CircularRing pct={pct} size={52} />
            </button>
          )
        })}
      </div>

      {/* 4. FOOTER ACTION (Dashboard routes to /dashboard/goals; Workspace/Onboarding opens custom goal creator) */}
      {mode === 'dashboard' ? (
        <button
          type="button"
          className="upward-goals-flow__custom-link"
          onClick={() => router.push('/dashboard/goals')}
        >
          <Plus size={15} />
          <span>Add or configure goals</span>
        </button>
      ) : (
        hasSelectedAtLeastOneGoal && (
          <button
            type="button"
            className="upward-goals-flow__custom-link"
            onClick={resetAndOpenCustomForm}
          >
            <Plus size={15} />
            <span>Create a custom goal</span>
          </button>
        )
      )}

      {/* 5. WORKSPACE MILESTONE CHECKLIST (When in /dashboard/goals workspace mode) */}
      {mode === 'workspace' && (
        <div className="upward-goals-flow__workspace-steps">
          <div className="upward-goals-flow__section-label" style={{ marginTop: 22 }}>
            Your Active Action Steps
          </div>
          {UPWARD_GOAL_CATEGORIES.map((cat) => {
            const selectedIds = store.selectedByCategory[cat.id] || []
            return selectedIds.map((gId) => {
              const goal = cat.goals.find((g) => g.id === gId)
              if (!goal) return null
              const qual = store.qualifications[gId]
              return (
                <div key={`${cat.id}-${gId}`} className="upward-goals-flow__panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <span className="upward-goals-flow__badge upward-goals-flow__badge--collect">
                        {cat.shortTitle}
                      </span>
                      <h4 style={{ marginTop: 4, fontSize: 15, fontWeight: 700 }}>
                        {goal.title} {qual ? `(${qual})` : ''}
                      </h4>
                    </div>
                    {goal.actionHref && (
                      <button
                        type="button"
                        className="upward-goals-flow__chip-btn is-on"
                        onClick={() => router.push(goal.actionHref!)}
                      >
                        Open →
                      </button>
                    )}
                  </div>
                  <div className="upward-goals-flow__option-list">
                    {goal.defaultMilestones.map((ms, idx) => {
                      const key = `${gId}:${idx}`
                      const done = store.completedMilestoneIds.includes(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`upward-goals-flow__check-option ${done ? 'is-on' : ''}`}
                          onClick={() => {
                            haptics.selection()
                            toggleMilestone(key)
                          }}
                        >
                          <span className="upward-goals-flow__tickbox">
                            <Check size={12} strokeWidth={2.5} />
                          </span>
                          <span
                            style={{
                              fontSize: 13.5,
                              textDecoration: done ? 'line-through' : 'none',
                              color: done ? 'var(--text-muted)' : 'var(--text)',
                            }}
                          >
                            {ms}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          })}
        </div>
      )}

      {mode === 'onboarding' && onFinishOnboarding && (
        <div className="upward-goals-flow__onboarding-footer">
          <button
            type="button"
            className="btn btn--primary btn--full"
            onClick={onFinishOnboarding}
          >
            <span>Continue to Dashboard</span>
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  )
}
