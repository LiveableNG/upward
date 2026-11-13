'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Search,
  Building,
  Target,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Layers,
  Package,
  Wrench,
  ShoppingBag,
  SlidersHorizontal,
  Check,
  X,
  Home,
  HeartPulse,
  Briefcase,
  BookOpen,
  Dumbbell,
  Car,
  Music,
  Utensils,
  Bed,
  Loader2,
} from 'lucide-react'
import {
  useGoalCategories,
  usePublicOfferings,
  useUserGoals,
  useSetUserGoals,
} from '../hooks/useGoals'
import { useTenantOrders } from '../hooks/useCommerceOrders'
import {
  getRecommendedOfferings,
  type RecommendedOfferingItem,
} from '../utils/recommendationEngine'
import { OfferingCard } from './OfferingCard'
import {
  getGoalTitle,
  getCategoryTitle,
  type GoalCategory,
  type UserGoal,
  type Goal,
  type GoalOffering,
  type OfferingType,
} from '../types/goals.types'
import { useAuth } from '@/features/auth/AuthContext'
import {
  type UserDeliveryLocation,
  getStoredDeliveryLocation,
} from '../utils/deliveryLocation'
import { DeliveryLocationBar } from './DeliveryLocationBar'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { useToast } from '@/components/common/Toast'
import '../styles/goals.css'

export function getGoalIconComponent(iconName?: string | null, slug?: string) {
  const name = `${iconName || ''} ${slug || ''}`.toLowerCase()
  if (
    name.includes('home') ||
    name.includes('decor') ||
    name.includes('kitchen') ||
    name.includes('apartment') ||
    name.includes('clean')
  ) {
    return Home
  }
  if (name.includes('fitness') || name.includes('gym') || name.includes('weight')) {
    return Dumbbell
  }
  if (name.includes('health') || name.includes('eat') || name.includes('wellness')) {
    return HeartPulse
  }
  if (
    name.includes('career') ||
    name.includes('work') ||
    name.includes('business') ||
    name.includes('office')
  ) {
    return Briefcase
  }
  if (name.includes('book') || name.includes('read') || name.includes('study')) {
    return BookOpen
  }
  if (name.includes('drive') || name.includes('car') || name.includes('move')) {
    return Car
  }
  if (name.includes('music') || name.includes('instrument')) {
    return Music
  }
  if (name.includes('food') || name.includes('meal')) {
    return Utensils
  }
  if (name.includes('sleep') || name.includes('bed')) {
    return Bed
  }
  return Target
}

const EMPTY_CATEGORIES: GoalCategory[] = []
const EMPTY_OFFERINGS: GoalOffering[] = []
const EMPTY_USER_GOALS: UserGoal[] = []

export const LifestyleDiscoveryScreen: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error: toastError } = useToast()

  // Queries
  const {
    data: categories = EMPTY_CATEGORIES,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useGoalCategories()

  const {
    data: offerings = EMPTY_OFFERINGS,
    isLoading: isOfferingsLoading,
    error: offeringsError,
    refetch: refetchOfferings,
  } = usePublicOfferings()

  const { data: userGoals = EMPTY_USER_GOALS, isLoading: isUserGoalsLoading } = useUserGoals()
  const setGoalsMutation = useSetUserGoals()
  const { data: tenantOrdersData } = useTenantOrders({ take: 20 })

  const activeOrdersCount = useMemo(() => {
    const orders = tenantOrdersData?.orders || []
    return orders.filter((ord) => {
      if (['CANCELLED', 'REFUNDED'].includes(ord.status)) return false
      return !['DELIVERED', 'SERVICE_COMPLETED', 'RECEIVED_CONFIRMED'].includes(ord.primaryStatus)
    }).length
  }, [tenantOrdersData])

  const { user } = useAuth()
  const userAddress = user?.properties?.[0]?.address
  const [deliveryLocation, setDeliveryLocation] = useState<UserDeliveryLocation>(() =>
    getStoredDeliveryLocation(userAddress),
  )
  const [prevUserAddress, setPrevUserAddress] = useState(userAddress)
  if (userAddress !== prevUserAddress) {
    setPrevUserAddress(userAddress)
    if (userAddress) {
      setDeliveryLocation(getStoredDeliveryLocation(userAddress))
    }
  }

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<OfferingType | 'ALL'>('ALL')

  const isQueryGoalsOpen = searchParams?.get('goals') === 'open'
  const queryGoalId = searchParams?.get('goalId')
  const parsedQueryGoalId = queryGoalId ? Number(queryGoalId) : null

  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(() => isQueryGoalsOpen)
  const [selectedActiveGoalId, setSelectedActiveGoalId] = useState<number | 'ALL'>(() =>
    parsedQueryGoalId && !isNaN(parsedQueryGoalId) ? parsedQueryGoalId : 'ALL',
  )

  const [prevQueryGoalsOpen, setPrevQueryGoalsOpen] = useState(isQueryGoalsOpen)
  if (isQueryGoalsOpen !== prevQueryGoalsOpen) {
    setPrevQueryGoalsOpen(isQueryGoalsOpen)
    if (isQueryGoalsOpen) {
      setIsGoalSheetOpen(true)
    }
  }

  const [prevQueryGoalId, setPrevQueryGoalId] = useState(queryGoalId)
  if (queryGoalId !== prevQueryGoalId) {
    setPrevQueryGoalId(queryGoalId)
    if (parsedQueryGoalId && !isNaN(parsedQueryGoalId)) {
      setSelectedActiveGoalId(parsedQueryGoalId)
    }
  }

  // Active user goals
  const activeUserGoals = useMemo(
    () => userGoals.filter((ug) => ug.status === 'ACTIVE' && ug.goal),
    [userGoals],
  )
  const hasSelectedGoals = activeUserGoals.length > 0
  const totalGoalsCount = useMemo(
    () => categories.reduce((acc, cat) => acc + (cat.goals?.length || 0), 0),
    [categories],
  )
  const hasNoGoals = !isCategoriesLoading && totalGoalsCount === 0
  // Note: Alliance marketplace integration paused; keep UI code intact below for future enablement
  const showAllianceBanner = false

  // Lock body scroll when goal sheet is open
  useEffect(() => {
    if (isGoalSheetOpen) {
      const originalOverflow = document.body.style.overflow
      const originalTouchAction = document.body.style.touchAction
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'

      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.touchAction = originalTouchAction
      }
    }
  }, [isGoalSheetOpen])

  // Sync draftGoalIds during render when active goals change
  const activeGoalIdsKey = useMemo(
    () =>
      userGoals
        .filter((ug): ug is typeof ug & { goalId: number } => ug.status === 'ACTIVE' && typeof ug.goalId === 'number')
        .map((ug) => ug.goalId)
        .sort((a, b) => a - b)
        .join(','),
    [userGoals],
  )

  const [draftGoalIds, setDraftGoalIds] = useState<Set<number>>(() => {
    const activeIds = userGoals
      .filter((ug): ug is typeof ug & { goalId: number } => ug.status === 'ACTIVE' && typeof ug.goalId === 'number')
      .map((ug) => ug.goalId)
    return new Set(activeIds)
  })

  const [prevActiveGoalIdsKey, setPrevActiveGoalIdsKey] = useState(activeGoalIdsKey)
  if (activeGoalIdsKey !== prevActiveGoalIdsKey) {
    setPrevActiveGoalIdsKey(activeGoalIdsKey)
    const activeIds = userGoals
      .filter((ug): ug is typeof ug & { goalId: number } => ug.status === 'ACTIVE' && typeof ug.goalId === 'number')
      .map((ug) => ug.goalId)
    setDraftGoalIds(new Set(activeIds))
  }

  const openGoalSheet = () => {
    const activeIds = userGoals
      .filter((ug): ug is typeof ug & { goalId: number } => ug.status === 'ACTIVE' && typeof ug.goalId === 'number')
      .map((ug) => ug.goalId)
    setDraftGoalIds(new Set(activeIds))
    setIsGoalSheetOpen(true)
  }

  const closeGoalSheet = () => {
    setIsGoalSheetOpen(false)
    if (searchParams?.get('goals') === 'open') {
      router.replace('/dashboard/lifestyle', { scroll: false })
    }
  }

  const toggleDraftGoal = (goalId: number) => {
    setDraftGoalIds((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) {
        next.delete(goalId)
      } else {
        next.add(goalId)
      }
      return next
    })
  }

  const handleSaveGoals = async () => {
    try {
      const goalIds = Array.from(draftGoalIds)
      await setGoalsMutation.mutateAsync({ goalIds })
      if (
        selectedActiveGoalId !== 'ALL' &&
        !draftGoalIds.has(selectedActiveGoalId)
      ) {
        setSelectedActiveGoalId('ALL')
      }
      success('Lifestyle preferences updated')
      closeGoalSheet()
    } catch (err: unknown) {
      const error = err as { message?: string }
      toastError(error?.message || 'Unable to update goals right now.')
    }
  }

  // Personalized & filtered offerings
  const displayItems = useMemo<RecommendedOfferingItem[]>(() => {
    return getRecommendedOfferings(offerings, userGoals, categories, {
      activeGoalId:
        selectedActiveGoalId === 'ALL' ? undefined : selectedActiveGoalId,
      typeFilter: selectedType,
      searchQuery,
    })
  }, [offerings, userGoals, categories, selectedActiveGoalId, selectedType, searchQuery])

  const handleOfferingClick = (offering: GoalOffering) => {
    const identifier = offering.uuid || offering.slug || String(offering.id)
    router.push(`/dashboard/lifestyle?id=${encodeURIComponent(identifier)}`, { scroll: false })
  }

  const isLoading = isCategoriesLoading || isOfferingsLoading

  return (
    <div className="lifestyle-discovery">
      {/* Compact Sticky Top Bar */}
      <header className="lifestyle-discovery__header">
        <div className="lifestyle-discovery__top-bar">
          <div className="lifestyle-discovery__top-left">
            <button
              type="button"
              className="lifestyle-discovery__back-btn"
              onClick={() => router.push('/dashboard')}
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="lifestyle-discovery__title-group">
              <h1 className="lifestyle-discovery__title">Lifestyle & Perks</h1>
              <p className="lifestyle-discovery__subtitle">
                Verified services, packages, and home essentials for tenants
              </p>
            </div>
          </div>

          <div className="lifestyle-discovery__top-actions">
            <button
              type="button"
              className={`lifestyle-discovery__goals-trigger ${
                activeOrdersCount > 0 ? 'lifestyle-discovery__goals-trigger--active' : ''
              }`}
              onClick={() => router.push('/dashboard/lifestyle/orders')}
              aria-label="View past orders and tracking"
              title="My Orders"
            >
              <Package size={14} />
              <span>Orders</span>
              {activeOrdersCount > 0 && (
                <span className="lifestyle-discovery__goals-badge">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`lifestyle-discovery__goals-trigger ${
                hasSelectedGoals ? 'lifestyle-discovery__goals-trigger--active' : ''
              }`}
              onClick={openGoalSheet}
              aria-label="Select and edit lifestyle goals"
            >
              <SlidersHorizontal size={14} />
              <span className="lifestyle-discovery__goals-text">
                {!hasSelectedGoals && <span className="lifestyle-discovery__goals-prefix">Set </span>}
                Goals
              </span>
              {hasSelectedGoals && (
                <span className="lifestyle-discovery__goals-badge">
                  {activeUserGoals.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Delivery Location Context Bar */}
        <div className="lifestyle-discovery__location-row">
          <DeliveryLocationBar
            location={deliveryLocation}
            onLocationChange={(loc) => setDeliveryLocation(loc)}
          />
        </div>

        {/* Search & Type Filter Row */}
        <div className="lifestyle-discovery__controls">
          <div className="lifestyle-discovery__search-wrap">
            <Search size={16} className="lifestyle-discovery__search-icon" />
            <input
              type="text"
              placeholder="Search products, services, or merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lifestyle-discovery__search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="lifestyle-discovery__search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="lifestyle-discovery__type-scroll-wrap">
            <div className="lifestyle-discovery__type-chips">
              <button
                type="button"
                className={`lifestyle-discovery__type-chip ${
                  selectedType === 'ALL'
                    ? 'lifestyle-discovery__type-chip--active'
                    : ''
                }`}
                onClick={() => setSelectedType('ALL')}
              >
                All
              </button>
              <button
                type="button"
                className={`lifestyle-discovery__type-chip ${
                  selectedType === 'PACKAGE'
                    ? 'lifestyle-discovery__type-chip--active'
                    : ''
                }`}
                onClick={() => setSelectedType('PACKAGE')}
              >
                <Package size={13} />
                <span>Packages</span>
              </button>
              <button
                type="button"
                className={`lifestyle-discovery__type-chip ${
                  selectedType === 'BUNDLE'
                    ? 'lifestyle-discovery__type-chip--active'
                    : ''
                }`}
                onClick={() => setSelectedType('BUNDLE')}
              >
                <Layers size={13} />
                <span>Bundles</span>
              </button>
              <button
                type="button"
                className={`lifestyle-discovery__type-chip ${
                  selectedType === 'SERVICE'
                    ? 'lifestyle-discovery__type-chip--active'
                    : ''
                }`}
                onClick={() => setSelectedType('SERVICE')}
              >
                <Wrench size={13} />
                <span>Services</span>
              </button>
              <button
                type="button"
                className={`lifestyle-discovery__type-chip ${
                  selectedType === 'PRODUCT'
                    ? 'lifestyle-discovery__type-chip--active'
                    : ''
                }`}
                onClick={() => setSelectedType('PRODUCT')}
              >
                <ShoppingBag size={13} />
                <span>Products</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="lifestyle-discovery__container">
        {/* Compact Goal Filter / Personalization Strip */}
        {!isUserGoalsLoading && (
          <div className="lifestyle-discovery__context-strip">
            {hasSelectedGoals ? (
              <div className="lifestyle-discovery__goal-scroll-wrap">
                <div className="lifestyle-discovery__goal-pills-row">
                  <button
                    type="button"
                    className={`lifestyle-discovery__goal-pill ${
                      selectedActiveGoalId === 'ALL'
                        ? 'lifestyle-discovery__goal-pill--active'
                        : ''
                    }`}
                    onClick={() => setSelectedActiveGoalId('ALL')}
                  >
                    All For You
                  </button>
                  {activeUserGoals.map((ug) => {
                    const gTitle = getGoalTitle(ug.goal) || `Goal #${ug.goalId}`
                    return (
                      <button
                        key={ug.goalId}
                        type="button"
                        className={`lifestyle-discovery__goal-pill ${
                          selectedActiveGoalId === ug.goalId
                            ? 'lifestyle-discovery__goal-pill--active'
                            : ''
                        }`}
                        onClick={() => {
                          if (ug.goalId) setSelectedActiveGoalId(ug.goalId)
                        }}
                      >
                        {gTitle}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    className="lifestyle-discovery__goal-edit-link"
                    onClick={openGoalSheet}
                  >
                    Edit goals
                  </button>
                </div>
              </div>
            ) : (
              <div className="lifestyle-discovery__nudge-bar">
                <div className="lifestyle-discovery__nudge-text">
                  <Target size={15} className="lifestyle-discovery__nudge-icon" />
                  <span>
                    Select your home & lifestyle goals to tailor recommendations.
                  </span>
                </div>
                <button
                  type="button"
                  className="lifestyle-discovery__nudge-action"
                  onClick={openGoalSheet}
                >
                  <span>Choose goals</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Contextual Moving Alliance Banner (Kept for future enablement) */}
        {showAllianceBanner && (
          <section className="lifestyle-discovery__alliance-bar">
            <div className="lifestyle-discovery__alliance-info">
              <Building size={18} className="lifestyle-discovery__alliance-icon" />
              <div>
                <div className="lifestyle-discovery__alliance-title">
                  Planning a move? Browse verified Upward Alliance homes
                </div>
                <div className="lifestyle-discovery__alliance-desc">
                  Pre-vetted rental listings with transparent terms.
                </div>
              </div>
            </div>
            <button
              type="button"
              className="lifestyle-discovery__alliance-btn"
              onClick={() => router.push('/dashboard/alliance')}
            >
              <span>View Homes</span>
              <ArrowRight size={14} />
            </button>
          </section>
        )}

        {/* Section Header */}
        <div className="lifestyle-discovery__section-header">
          <h2 className="lifestyle-discovery__section-title">
            {selectedActiveGoalId !== 'ALL'
              ? getGoalTitle(
                  activeUserGoals.find((g) => g.goalId === selectedActiveGoalId)
                    ?.goal,
                ) || 'Recommended for You'
              : hasSelectedGoals
                ? 'Curated for You'
                : 'Explore Perks'}
          </h2>
          {!isLoading && (
            <span className="lifestyle-discovery__count-badge">
              {displayItems.length}{' '}
              {displayItems.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="lifestyle-discovery__grid">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="offering-card offering-card--skeleton">
                <div className="offering-card__media-skeleton" />
                <div className="offering-card__body-skeleton" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {(offeringsError || categoriesError) && !isLoading && (
          <div className="lifestyle-discovery__error-card">
            <AlertCircle size={24} className="lifestyle-discovery__error-icon" />
            <p className="lifestyle-discovery__error-msg">
              Unable to load items right now.
            </p>
            <button
              type="button"
              className="lifestyle-discovery__retry-btn"
              onClick={() => {
                refetchOfferings()
                refetchCategories()
              }}
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading &&
          !offeringsError &&
          !categoriesError &&
          displayItems.length === 0 && (
            <div className="lifestyle-discovery__empty-state">
              {hasNoGoals && offerings.length === 0 ? (
                <>
                  <Target size={32} color="var(--text-muted)" className="lifestyle-discovery__empty-icon" />
                  <h3 className="lifestyle-discovery__empty-title">
                    Lifestyle perks coming soon
                  </h3>
                  <p className="lifestyle-discovery__empty-desc">
                    Verified merchant packages, moving discounts, and home essentials are not yet active for your property. Check back once available.
                  </p>
                  <button
                    type="button"
                    className="lifestyle-discovery__empty-btn"
                    onClick={() => router.push('/dashboard')}
                  >
                    Return to dashboard
                  </button>
                </>
              ) : (
                <>
                  <ShoppingBag size={30} className="lifestyle-discovery__empty-icon" />
                  <h3 className="lifestyle-discovery__empty-title">
                    No matching items found
                  </h3>
                  <p className="lifestyle-discovery__empty-desc">
                    Try clearing your search or switching categories.
                  </p>
                  {(searchQuery ||
                    selectedType !== 'ALL' ||
                    selectedActiveGoalId !== 'ALL') && (
                    <button
                      type="button"
                      className="lifestyle-discovery__empty-btn"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedType('ALL')
                        setSelectedActiveGoalId('ALL')
                      }}
                    >
                      Reset Filters
                    </button>
                  )}
                </>
              )}
            </div>
          )}

        {/* Offerings Grid */}
        {!isLoading && displayItems.length > 0 && (
          <div className="lifestyle-discovery__grid">
            {displayItems.map((item) => (
              <OfferingCard
                key={item.offering.id}
                item={item}
                userLocation={deliveryLocation}
                onClick={handleOfferingClick}
              />
            ))}
          </div>
        )}
      </main>

      {/* Inline Goal Preferences Drawer / Sheet */}
      <BottomSheetModal
        isOpen={isGoalSheetOpen}
        onClose={closeGoalSheet}
        title="Lifestyle Goals"
        subtitle={
          hasNoGoals
            ? 'No priorities currently available'
            : `Choose priorities to tailor your services & bundles (${draftGoalIds.size} selected)`
        }
        maxWidth="540px"
        headerActions={
          !hasNoGoals && (
            <button
              type="button"
              className="goal-sheet__save-btn"
              onClick={handleSaveGoals}
              disabled={setGoalsMutation.isPending}
            >
              {setGoalsMutation.isPending ? (
                <>
                  <Loader2 size={14} className="loader" />
                  <span>Saving</span>
                </>
              ) : (
                <span>Save</span>
              )}
            </button>
          )
        }
      >
        <div className="goal-sheet__body" style={{ padding: 0 }}>
          {hasNoGoals ? (
            <div
              className="lifestyle-discovery__empty-state"
              style={{ margin: '30px 20px', border: 'none', background: 'transparent' }}
            >
              <Target
                size={28}
                color="var(--text-muted)"
                className="lifestyle-discovery__empty-icon"
              />
              <h3 className="lifestyle-discovery__empty-title">
                No lifestyle goals available
              </h3>
              <p className="lifestyle-discovery__empty-desc">
                Priority packages have not been activated for your tenancy yet. Once configured, you can select them here.
              </p>
              <button
                type="button"
                className="lifestyle-discovery__empty-btn"
                onClick={closeGoalSheet}
              >
                Close
              </button>
            </div>
          ) : (
            categories.map((cat) => {
              const goals = cat.goals || []
              if (goals.length === 0) return null
              const catTitle = getCategoryTitle(cat) || 'Lifestyle'

              return (
                <div key={cat.id} className="goal-sheet__group">
                  <h3 className="goal-sheet__group-title">{catTitle}</h3>
                  <div className="goal-sheet__list">
                    {(goals as Goal[]).map((goal: Goal) => {
                      const isSelected = draftGoalIds.has(goal.id)
                      const gTitle =
                        getGoalTitle(goal) ||
                        goal.tagline ||
                        'Lifestyle Goal'
                      const gDesc = goal.tagline || goal.description
                      const IconComp = getGoalIconComponent(
                        goal.iconName,
                        goal.slug || cat.slug,
                      )

                      return (
                        <button
                          key={goal.id}
                          type="button"
                          className={`goal-card ${
                            isSelected ? 'goal-card--selected' : ''
                          }`}
                          onClick={() => toggleDraftGoal(goal.id)}
                        >
                          <div className="goal-card__icon-box">
                           <IconComp size={18} />
                          </div>
                          <div className="goal-card__body">
                            <div className="goal-card__name">{gTitle}</div>
                            {gDesc && gDesc !== gTitle && (
                              <div className="goal-card__desc">{gDesc}</div>
                            )}
                          </div>
                          <div className="goal-card__checkbox">
                            {isSelected && <Check size={13} strokeWidth={3} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </BottomSheetModal>
    </div>
  )
}

export function LifestyleDiscoverySkeleton() {
  return (
    <div className="lifestyle-discovery">
      <header className="lifestyle-discovery__header">
        <div className="lifestyle-discovery__header-left">
          <div
            style={{
              width: 140,
              height: 22,
              background: '#EAE3D9',
              borderRadius: 6,
              marginBottom: 6,
            }}
          />
          <div
            style={{
              width: 200,
              height: 12,
              background: '#F0EAE1',
              borderRadius: 4,
            }}
          />
        </div>
      </header>

      <div style={{ padding: '0 20px', marginTop: 14 }}>
        <div
          style={{
            width: '100%',
            height: 48,
            background: '#FFFFFF',
            border: '1.5px solid #ECE4D9',
            borderRadius: 12,
            marginBottom: 20,
          }}
        />
        <div className="lifestyle-discovery__grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="offering-card offering-card--skeleton">
              <div className="offering-card__media-skeleton" />
              <div className="offering-card__body-skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
