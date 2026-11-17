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
  ChevronDown,
  Package,
  Wrench,
  ShoppingBag,
  ShoppingCart,
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
  CreditCard,
  TrendingUp,
  Coins,
  Award,
  GraduationCap,
  Code,
  Laptop,
  Plane,
  Gift,
  Tag,
  Shirt,
  Mic,
  Palette,
  Shield,
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
import { OfferingCard, formatOfferingPrice } from './OfferingCard'
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
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/components/common/Toast'
import { useCart } from '../context/CartContext'
import '../styles/goals.css'

export function getGoalIconComponent(iconName?: string | null, slug?: string) {
  const name = `${iconName || ''} ${slug || ''}`.toLowerCase()
  if (name.includes('credit') || name.includes('rent-now')) {
    return CreditCard
  }
  if (
    name.includes('home') ||
    name.includes('decor') ||
    name.includes('kitchen') ||
    name.includes('apartment') ||
    name.includes('clean') ||
    name.includes('sofa')
  ) {
    return Home
  }
  if (name.includes('save') || name.includes('invest') || name.includes('coin') || name.includes('income')) {
    return TrendingUp
  }
  if (name.includes('award') || name.includes('cert') || name.includes('licence') || name.includes('exam')) {
    return Award
  }
  if (name.includes('grad') || name.includes('degree') || name.includes('child') || name.includes('school')) {
    return GraduationCap
  }
  if (name.includes('code') || name.includes('program') || name.includes('tech')) {
    return Code
  }
  if (name.includes('laptop') || name.includes('remote') || name.includes('digital')) {
    return Laptop
  }
  if (name.includes('plane') || name.includes('travel') || name.includes('abroad')) {
    return Plane
  }
  if (name.includes('gift')) {
    return Gift
  }
  if (name.includes('tag') || name.includes('pay-less') || name.includes('spend')) {
    return Tag
  }
  if (name.includes('shirt') || name.includes('laundry')) {
    return Shirt
  }
  if (name.includes('shop') || name.includes('grocery')) {
    return ShoppingBag
  }
  if (name.includes('mic') || name.includes('speak') || name.includes('presentation')) {
    return Mic
  }
  if (name.includes('palette') || name.includes('paint') || name.includes('creative')) {
    return Palette
  }
  if (name.includes('shield') || name.includes('martial') || name.includes('karate')) {
    return Shield
  }
  if (name.includes('fitness') || name.includes('gym') || name.includes('weight') || name.includes('sport')) {
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
  if (name.includes('book') || name.includes('read') || name.includes('study') || name.includes('english')) {
    return BookOpen
  }
  if (name.includes('drive') || name.includes('car') || name.includes('move') || name.includes('commute')) {
    return Car
  }
  if (name.includes('music') || name.includes('piano') || name.includes('instrument')) {
    return Music
  }
  if (name.includes('sparkle') || name.includes('custom') || name.includes('goal')) {
    return Target
  }
  return Target
}

const EMPTY_CATEGORIES: GoalCategory[] = []
const EMPTY_OFFERINGS: GoalOffering[] = []
const EMPTY_USER_GOALS: UserGoal[] = []

export const LifestyleDiscoveryScreen: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cart = useCart()
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

  const queryCategoryParam = searchParams?.get('category') || searchParams?.get('cat') || 'ALL'
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>(queryCategoryParam)

  const [prevQueryCategoryParam, setPrevQueryCategoryParam] = useState(queryCategoryParam)
  if (queryCategoryParam !== prevQueryCategoryParam) {
    setPrevQueryCategoryParam(queryCategoryParam)
    setSelectedCategorySlug(queryCategoryParam)
  }

  const isQueryGoalsOpen = searchParams?.get('goals') === 'open'
  const queryGoalId = searchParams?.get('goalId')
  const queryGoalSlug = searchParams?.get('goal')
  const queryCategorySlug = searchParams?.get('category') || searchParams?.get('cat')
  const parsedQueryGoalId = queryGoalId ? Number(queryGoalId) : null

  // Flat list of all system goals from published categories
  const allSystemGoals = useMemo(() => {
    return categories.flatMap((cat) =>
      (cat.goals || []).map((g) => ({
        ...g,
        categorySlug: cat.slug,
        categoryTitle: cat.title || cat.name,
      })),
    )
  }, [categories])

  const initialGoalId = useMemo<number | 'ALL'>(() => {
    if (parsedQueryGoalId && !isNaN(parsedQueryGoalId)) {
      return parsedQueryGoalId
    }
    if (queryGoalSlug && allSystemGoals.length > 0) {
      const match = allSystemGoals.find((g) => g.slug === queryGoalSlug)
      if (match) return match.id
    }
    if (queryCategorySlug && allSystemGoals.length > 0) {
      const match = allSystemGoals.find((g) => g.categorySlug === queryCategorySlug)
      if (match) return match.id
    }
    return 'ALL'
  }, [parsedQueryGoalId, queryGoalSlug, queryCategorySlug, allSystemGoals])

  const [isGoalSheetOpen, setIsGoalSheetOpen] = useState(() => isQueryGoalsOpen)
  const [selectedActiveGoalId, setSelectedActiveGoalId] = useState<number | 'ALL'>(initialGoalId)

  const [prevInitialGoalId, setPrevInitialGoalId] = useState(initialGoalId)
  if (initialGoalId !== prevInitialGoalId) {
    setPrevInitialGoalId(initialGoalId)
    setSelectedActiveGoalId(initialGoalId)
  }

  // Active user goals
  const activeUserGoals = useMemo(
    () =>
      userGoals.filter(
        (ug): ug is typeof ug & { goalId: number } =>
          ug.status === 'ACTIVE' && typeof ug.goalId === 'number' && !!ug.goal,
      ),
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

  // Robust cross-platform body scroll lock
  useBodyScrollLock(isGoalSheetOpen)

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
    return new Set<number>(activeIds)
  })

  const [prevActiveGoalIdsKey, setPrevActiveGoalIdsKey] = useState(activeGoalIdsKey)
  if (activeGoalIdsKey !== prevActiveGoalIdsKey) {
    setPrevActiveGoalIdsKey(activeGoalIdsKey)
    const activeIds = userGoals
      .filter((ug): ug is typeof ug & { goalId: number } => ug.status === 'ACTIVE' && typeof ug.goalId === 'number')
      .map((ug) => ug.goalId)
    setDraftGoalIds(new Set<number>(activeIds))
  }

  const openGoalSheet = () => {
    const activeIds = userGoals
      .filter((ug): ug is typeof ug & { goalId: number } => ug.status === 'ACTIVE' && typeof ug.goalId === 'number')
      .map((ug) => ug.goalId)
    setDraftGoalIds(new Set<number>(activeIds))
    setIsGoalSheetOpen(true)
  }

  const closeGoalSheet = () => {
    setIsGoalSheetOpen(false)
    if (searchParams?.get('goals') === 'open') {
      router.replace('/dashboard/lifestyle', { scroll: false })
    }
  }

  const toggleDraftGoal = (
    goalId: number,
    categoryGoals: Array<{ id: number }>,
    catTitle: string,
  ) => {
    setDraftGoalIds((prev) => {
      const next = new Set(prev)
      if (next.has(goalId)) {
        next.delete(goalId)
      } else {
        const countInCat = categoryGoals.filter((g) => next.has(g.id)).length
        if (countInCat >= 3) {
          toastError(`You can select up to 3 goals in ${catTitle}.`)
          return prev
        }
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
      categorySlug: selectedCategorySlug,
      typeFilter: selectedType,
      searchQuery,
    })
  }, [offerings, userGoals, categories, selectedCategorySlug, selectedType, searchQuery])

  // Promoted / Spotlight bundle (E-Commerce Featured Hero)
  const spotlightOffering = useMemo<GoalOffering | undefined>(() => {
    return offerings.find((o) => (o.status === 'PUBLISHED' || !o.status) && o.isPromoted)
  }, [offerings])

  const isLoading = isCategoriesLoading || isOfferingsLoading

  const showSpotlightHero =
    !isLoading &&
    Boolean(spotlightOffering) &&
    !searchQuery &&
    selectedType === 'ALL' &&
    selectedCategorySlug === 'ALL'

  // If spotlight hero is active, avoid duplicating the exact same offering as item #1 in the grid
  const gridItems = useMemo<RecommendedOfferingItem[]>(() => {
    if (showSpotlightHero && spotlightOffering) {
      return displayItems.filter(
        (item) =>
          item.offering.id !== spotlightOffering.id &&
          item.offering.uuid !== spotlightOffering.uuid
      )
    }
    return displayItems
  }, [displayItems, showSpotlightHero, spotlightOffering])

  const handleOfferingClick = (offering: GoalOffering) => {
    const identifier = offering.uuid || offering.slug || String(offering.id)
    router.push(`/dashboard/lifestyle?id=${encodeURIComponent(identifier)}`, { scroll: false })
  }

  return (
    <div className="lifestyle-discovery">
      {/* Compact Sticky Top Bar */}
      <header className="lifestyle-discovery__header">
        <div className="lifestyle-discovery__top-bar">
          <div className="lifestyle-discovery__top-left">
            <div className="lifestyle-discovery__title-group">
              <h1 className="lifestyle-discovery__title">Lifestyle & Perks</h1>
              <p className="lifestyle-discovery__subtitle">
                Verified packages, home essentials, and services for your goals
              </p>
            </div>
          </div>

          <div className="lifestyle-discovery__top-actions">
            <button
              type="button"
              className="lifestyle-discovery__goals-trigger"
              onClick={() => router.push('/dashboard/goals')}
              aria-label="Setup your goals"
              title="Setup Goals"
            >
              <Target size={14} />
              <span>Goals</span>
            </button>

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
              className={`lifestyle-discovery__goals-trigger lifestyle-discovery__cart-trigger ${
                cart.totalCount > 0 ? 'lifestyle-discovery__goals-trigger--active' : ''
              }`}
              onClick={cart.openCart}
              aria-label="View shopping cart"
              title="Your Cart"
            >
              <ShoppingCart size={14} />
              <span>Cart</span>
              {cart.totalCount > 0 && (
                <span className="lifestyle-discovery__goals-badge lifestyle-discovery__cart-badge">
                  {cart.totalCount}
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
                <span>Packs & Sets</span>
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
                <span>Bundle Sets</span>
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
                <span>Single Items</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="lifestyle-discovery__container">
        {/* Category Filter Dropdown */}
        <div className="lifestyle-discovery__category-bar">
          <div className="lifestyle-discovery__category-dropdown-box">
            <Layers size={14} className="lifestyle-discovery__category-dropdown-icon" />
            <select
              className="lifestyle-discovery__category-select"
              value={selectedCategorySlug}
              onChange={(e) => setSelectedCategorySlug(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id || cat.slug} value={cat.slug}>
                  {cat.title || cat.name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="lifestyle-discovery__category-dropdown-chevron" />
          </div>
          {selectedCategorySlug !== 'ALL' && (
            <button
              type="button"
              className="lifestyle-discovery__category-reset"
              onClick={() => setSelectedCategorySlug('ALL')}
            >
              Reset
            </button>
          )}
        </div>

        {/* E-Commerce Spotlight / Promoted Ad Hero Banner */}
        {showSpotlightHero && spotlightOffering && (
          <div
            className="lifestyle-discovery__spotlight"
            onClick={() => handleOfferingClick(spotlightOffering)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleOfferingClick(spotlightOffering)
              }
            }}
            style={{
              backgroundImage: `linear-gradient(92deg, rgba(16, 12, 10, 0.68) 0%, rgba(16, 12, 10, 0.42) 55%, rgba(16, 12, 10, 0.15) 100%), url(${
                spotlightOffering.promoCoverImage ||
                spotlightOffering.media?.find((m) => m.isPrimary)?.mediaUrl ||
                spotlightOffering.media?.[0]?.mediaUrl ||
                spotlightOffering.imageUrl ||
                'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80'
              })`,
            }}
          >
            <div className="lifestyle-discovery__spotlight-content">
              <h2 className="lifestyle-discovery__spotlight-title">
                {spotlightOffering.promoTitle || spotlightOffering.title}
              </h2>
              <p className="lifestyle-discovery__spotlight-desc">
                {spotlightOffering.promoSubtitle ||
                  spotlightOffering.subtitle ||
                  spotlightOffering.description ||
                  'Curated package for your home'}
              </p>
              <div className="lifestyle-discovery__spotlight-footer">
                <div className="lifestyle-discovery__spotlight-price">
                  <span>{formatOfferingPrice(spotlightOffering)}</span>
                  {spotlightOffering.pricingModel && spotlightOffering.pricingModel !== 'FIXED' && (
                    <span className="lifestyle-discovery__spotlight-pricing-model">
                      {spotlightOffering.pricingModel.toLowerCase().replace('_', ' ')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="lifestyle-discovery__spotlight-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOfferingClick(spotlightOffering)
                  }}
                >
                  <span>Explore Bundle</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
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
              ? allSystemGoals.find((g) => g.id === selectedActiveGoalId)?.title || 'Curated for You'
              : 'Explore Perks'}
          </h2>
          {!isLoading && (
            <span className="lifestyle-discovery__count-badge">
              {gridItems.length}{' '}
              {gridItems.length === 1 ? 'item' : 'items'}
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
          gridItems.length === 0 && (
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
                    {selectedActiveGoalId !== 'ALL'
                      ? 'No perks linked to this goal yet'
                      : 'No matching items found'}
                  </h3>
                  <p className="lifestyle-discovery__empty-desc">
                    {selectedActiveGoalId !== 'ALL'
                      ? 'We are curating verified packages and merchants for this goal. Check back soon or browse all available perks.'
                      : 'Try clearing your search or switching categories.'}
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
                      View All Perks
                    </button>
                  )}
                </>
              )}
            </div>
          )}

        {/* Offerings Grid */}
        {!isLoading && gridItems.length > 0 && (
          <div className="lifestyle-discovery__grid">
            {gridItems.map((item) => (
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
              const goals = (cat.goals || []) as Goal[]
              if (goals.length === 0) return null
              const catTitle = getCategoryTitle(cat) || 'Lifestyle'
              const selectedInCat = goals.filter((g) => draftGoalIds.has(g.id)).length
              const isCatMaxed = selectedInCat >= 3

              return (
                <div key={cat.id} className="goal-sheet__group">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <h3 className="goal-sheet__group-title" style={{ margin: 0 }}>{catTitle}</h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: isCatMaxed ? 'rgba(217, 119, 87, 0.12)' : 'var(--surface-sunken)',
                        color: isCatMaxed ? 'var(--clay)' : 'var(--text-muted)',
                        border: isCatMaxed ? '1px solid rgba(217, 119, 87, 0.3)' : '1px solid var(--border)',
                      }}
                    >
                      {selectedInCat}/3 selected {isCatMaxed ? '(max)' : ''}
                    </span>
                  </div>
                  <div className="goal-sheet__list">
                    {goals.map((goal: Goal) => {
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
                          onClick={() => toggleDraftGoal(goal.id, goals, catTitle)}
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
