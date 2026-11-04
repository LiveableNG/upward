'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Search,
  Sparkles,
  Compass,
  Building,
  Target,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Package,
  Wrench,
  ShoppingBag,
} from 'lucide-react'
import { useGoalCategories, usePublicOfferings, useUserGoals } from '../hooks/useGoals'
import {
  getRecommendedOfferings,
  hasMovingGoal,
  type RecommendedOfferingItem,
} from '../utils/recommendationEngine'
import { OfferingCard } from './OfferingCard'
import { OfferingDetailModal } from './OfferingDetailModal'
import { VendorCredibilityModal } from './VendorCredibilityModal'
import type { GoalOffering, CommerceVendor, OfferingType } from '../types/goals.types'

export const LifestyleDiscoveryScreen: React.FC = () => {
  const router = useRouter()

  // Queries
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useGoalCategories()

  const {
    data: offerings = [],
    isLoading: isOfferingsLoading,
    error: offeringsError,
    refetch: refetchOfferings,
  } = usePublicOfferings()

  const {
    data: userGoals = [],
    isLoading: isUserGoalsLoading,
  } = useUserGoals()

  // UI State
  const [activeTab, setActiveTab] = useState<'FOR_YOU' | 'EXPLORE'>('FOR_YOU')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'ALL'>('ALL')
  const [selectedType, setSelectedType] = useState<OfferingType | 'ALL'>('ALL')
  const [selectedActiveGoalId, setSelectedActiveGoalId] = useState<number | 'ALL'>('ALL')

  // Modal State
  const [selectedOffering, setSelectedOffering] = useState<GoalOffering | null>(null)
  const [selectedVendor, setSelectedVendor] = useState<CommerceVendor | null>(null)

  // Derived state
  const activeUserGoals = useMemo(
    () => userGoals.filter((ug) => ug.status === 'ACTIVE' && ug.goal),
    [userGoals],
  )
  const hasSelectedGoals = activeUserGoals.length > 0
  const isMovingGoalActive = useMemo(() => hasMovingGoal(userGoals), [userGoals])

  // Personalized recommendations
  const recommendedItems = useMemo<RecommendedOfferingItem[]>(() => {
    return getRecommendedOfferings(offerings, userGoals, categories, {
      activeGoalId: selectedActiveGoalId === 'ALL' ? undefined : selectedActiveGoalId,
      typeFilter: selectedType,
      searchQuery,
    })
  }, [offerings, userGoals, categories, selectedActiveGoalId, selectedType, searchQuery])

  // Catalog filtered offerings (Explore tab)
  const catalogOfferings = useMemo<GoalOffering[]>(() => {
    return (offerings as GoalOffering[]).filter((offering: GoalOffering) => {
      if (offering.status && offering.status !== 'PUBLISHED') return false

      // Category filter
      if (selectedCategoryId !== 'ALL') {
        const belongsToCat = offering.goals?.some(
          (g) => g.goal?.categoryId === selectedCategoryId,
        )
        if (!belongsToCat) return false
      }

      // Type filter
      if (selectedType !== 'ALL' && offering.type !== selectedType) {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const titleMatch = (offering.title || offering.name || '').toLowerCase().includes(q)
        const descMatch = (offering.description || '').toLowerCase().includes(q)
        const vendorMatch = (offering.vendor?.name || '').toLowerCase().includes(q)
        if (!titleMatch && !descMatch && !vendorMatch) return false
      }

      return true
    })
  }, [offerings, selectedCategoryId, selectedType, searchQuery])

  const isLoading = isCategoriesLoading || isOfferingsLoading

  return (
    <div className="lifestyle-discovery">
      {/* Top Header */}
      <header className="lifestyle-discovery__header">
        <div className="lifestyle-discovery__header-nav">
          <button
            type="button"
            className="lifestyle-discovery__back-btn"
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="lifestyle-discovery__header-actions">
            <button
              type="button"
              className="lifestyle-discovery__goals-btn"
              onClick={() => router.push('/dashboard/goals')}
            >
              <Target size={15} />
              <span>Manage Goals</span>
              {activeUserGoals.length > 0 && (
                <span className="lifestyle-discovery__goals-count">
                  {activeUserGoals.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="lifestyle-discovery__intro">
          <span className="lifestyle-discovery__badge">
            <Sparkles size={12} strokeWidth={2.5} />
            Lifestyle & Commerce
          </span>
          <h1 className="lifestyle-discovery__title">Curated For Your Life</h1>
          <p className="lifestyle-discovery__subtitle">
            Tailored packages, verified services, and tenant privileges matched to your goals.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="lifestyle-discovery__tabs">
          <button
            type="button"
            className={`lifestyle-discovery__tab ${
              activeTab === 'FOR_YOU' ? 'lifestyle-discovery__tab--active' : ''
            }`}
            onClick={() => setActiveTab('FOR_YOU')}
          >
            <Sparkles size={16} />
            <span>For You</span>
            {hasSelectedGoals && (
              <span className="lifestyle-discovery__tab-dot" />
            )}
          </button>

          <button
            type="button"
            className={`lifestyle-discovery__tab ${
              activeTab === 'EXPLORE' ? 'lifestyle-discovery__tab--active' : ''
            }`}
            onClick={() => setActiveTab('EXPLORE')}
          >
            <Compass size={16} />
            <span>Explore Catalog</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="lifestyle-discovery__container">
        {/* Search & Filter Bar */}
        <div className="lifestyle-discovery__controls">
          <div className="lifestyle-discovery__search-wrap">
            <Search size={18} className="lifestyle-discovery__search-icon" />
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
                ×
              </button>
            )}
          </div>

          {/* Offering Type Chips */}
          <div className="lifestyle-discovery__type-chips">
            <button
              type="button"
              className={`lifestyle-discovery__type-chip ${
                selectedType === 'ALL' ? 'lifestyle-discovery__type-chip--active' : ''
              }`}
              onClick={() => setSelectedType('ALL')}
            >
              All Types
            </button>
            <button
              type="button"
              className={`lifestyle-discovery__type-chip ${
                selectedType === 'PACKAGE' ? 'lifestyle-discovery__type-chip--active' : ''
              }`}
              onClick={() => setSelectedType('PACKAGE')}
            >
              <Package size={13} />
              Packages
            </button>
            <button
              type="button"
              className={`lifestyle-discovery__type-chip ${
                selectedType === 'BUNDLE' ? 'lifestyle-discovery__type-chip--active' : ''
              }`}
              onClick={() => setSelectedType('BUNDLE')}
            >
              <Layers size={13} />
              Bundles
            </button>
            <button
              type="button"
              className={`lifestyle-discovery__type-chip ${
                selectedType === 'SERVICE' ? 'lifestyle-discovery__type-chip--active' : ''
              }`}
              onClick={() => setSelectedType('SERVICE')}
            >
              <Wrench size={13} />
              Services
            </button>
            <button
              type="button"
              className={`lifestyle-discovery__type-chip ${
                selectedType === 'PRODUCT' ? 'lifestyle-discovery__type-chip--active' : ''
              }`}
              onClick={() => setSelectedType('PRODUCT')}
            >
              <ShoppingBag size={13} />
              Products
            </button>
          </div>
        </div>

        {/* Tab 1: For You */}
        {activeTab === 'FOR_YOU' && (
          <div className="lifestyle-discovery__tab-content">
            {/* Zero-Goals Personalization Banner */}
            {!hasSelectedGoals && !isUserGoalsLoading && (
              <section className="lifestyle-discovery__banner lifestyle-discovery__banner--personalize">
                <div className="lifestyle-discovery__banner-content">
                  <div className="lifestyle-discovery__banner-icon">
                    <Target size={24} />
                  </div>
                  <div>
                    <h3 className="lifestyle-discovery__banner-title">
                      Personalize Your Lifestyle Perks
                    </h3>
                    <p className="lifestyle-discovery__banner-desc">
                      Select your current life and rental goals to unlock curated packages, moving assistance, and verified merchant deals.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="lifestyle-discovery__banner-btn"
                  onClick={() => router.push('/dashboard/goals')}
                >
                  <span>Select Goals</span>
                  <ArrowRight size={15} />
                </button>
              </section>
            )}

            {/* Active Goals Quick Filter Filter Pills */}
            {hasSelectedGoals && (
              <div className="lifestyle-discovery__goal-filter-bar">
                <span className="lifestyle-discovery__goal-filter-label">
                  Matched to:
                </span>
                <div className="lifestyle-discovery__goal-filter-scroll">
                  <button
                    type="button"
                    className={`lifestyle-discovery__goal-pill ${
                      selectedActiveGoalId === 'ALL'
                        ? 'lifestyle-discovery__goal-pill--active'
                        : ''
                    }`}
                    onClick={() => setSelectedActiveGoalId('ALL')}
                  >
                    All Active Goals ({activeUserGoals.length})
                  </button>
                  {activeUserGoals.map((ug) => (
                    <button
                      key={ug.goalId}
                      type="button"
                      className={`lifestyle-discovery__goal-pill ${
                        selectedActiveGoalId === ug.goalId
                          ? 'lifestyle-discovery__goal-pill--active'
                          : ''
                      }`}
                      onClick={() => setSelectedActiveGoalId(ug.goalId)}
                    >
                      {ug.goal?.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Moving Goal Contextual Alliance Banner */}
            {isMovingGoalActive && (
              <section className="lifestyle-discovery__banner lifestyle-discovery__banner--alliance">
                <div className="lifestyle-discovery__banner-content">
                  <div className="lifestyle-discovery__banner-icon lifestyle-discovery__banner-icon--alliance">
                    <Building size={24} />
                  </div>
                  <div>
                    <span className="lifestyle-discovery__alliance-tag">
                      Moving Goal Perk
                    </span>
                    <h3 className="lifestyle-discovery__banner-title">
                      Verified Rental Listings on Alliance
                    </h3>
                    <p className="lifestyle-discovery__banner-desc">
                      Looking for your next home? Browse pre-verified properties with zero deposit requirements for Upward tenants.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="lifestyle-discovery__banner-btn lifestyle-discovery__banner-btn--alliance"
                  onClick={() => router.push('/dashboard/alliance')}
                >
                  <span>View Alliance Homes</span>
                  <ArrowRight size={15} />
                </button>
              </section>
            )}

            {/* Recommendations Section */}
            <div className="lifestyle-discovery__section-header">
              <h2 className="lifestyle-discovery__section-title">
                {selectedActiveGoalId !== 'ALL'
                  ? `Offerings for ${activeUserGoals.find((g) => g.goalId === selectedActiveGoalId)?.goal?.name}`
                  : hasSelectedGoals
                  ? 'Recommended For Your Journey'
                  : 'Trending Lifestyle Offerings'}
              </h2>
              <span className="lifestyle-discovery__count-badge">
                {recommendedItems.length} available
              </span>
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
            {(offeringsError || categoriesError) && (
              <div className="lifestyle-discovery__error-card">
                <AlertCircle size={24} className="lifestyle-discovery__error-icon" />
                <p className="lifestyle-discovery__error-msg">
                  Unable to load offerings right now.
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
                  Retry
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && recommendedItems.length === 0 && (
              <div className="lifestyle-discovery__empty-state">
                <Target size={36} className="lifestyle-discovery__empty-icon" />
                <h3 className="lifestyle-discovery__empty-title">
                  No offerings match your filters
                </h3>
                <p className="lifestyle-discovery__empty-desc">
                  Try clearing your search query or switching offering types.
                </p>
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
              </div>
            )}

            {/* Items Grid */}
            {!isLoading && recommendedItems.length > 0 && (
              <div className="lifestyle-discovery__grid">
                {recommendedItems.map((item) => (
                  <OfferingCard
                    key={item.offering.id}
                    item={item}
                    onClick={(offering) => setSelectedOffering(offering)}
                    onVendorClick={(vendor) => setSelectedVendor(vendor)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Explore Catalog */}
        {activeTab === 'EXPLORE' && (
          <div className="lifestyle-discovery__tab-content">
            {/* Category Filter Pills */}
            <div className="lifestyle-discovery__category-scroll">
              <button
                type="button"
                className={`lifestyle-discovery__cat-pill ${
                  selectedCategoryId === 'ALL'
                    ? 'lifestyle-discovery__cat-pill--active'
                    : ''
                }`}
                onClick={() => setSelectedCategoryId('ALL')}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`lifestyle-discovery__cat-pill ${
                    selectedCategoryId === cat.id
                      ? 'lifestyle-discovery__cat-pill--active'
                      : ''
                  }`}
                  onClick={() => setSelectedCategoryId(cat.id)}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="lifestyle-discovery__section-header">
              <h2 className="lifestyle-discovery__section-title">
                {selectedCategoryId !== 'ALL'
                  ? categories.find((c) => c.id === selectedCategoryId)?.name
                  : 'All Offerings'}
              </h2>
              <span className="lifestyle-discovery__count-badge">
                {catalogOfferings.length} offerings
              </span>
            </div>

            {/* Offerings Grid */}
            {!isLoading && catalogOfferings.length > 0 && (
              <div className="lifestyle-discovery__grid">
                {catalogOfferings.map((offering: GoalOffering) => (
                  <OfferingCard
                    key={offering.id}
                    item={{
                      offering,
                      isGoalMatch: false,
                    }}
                    onClick={(off) => setSelectedOffering(off)}
                    onVendorClick={(vendor) => setSelectedVendor(vendor)}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && catalogOfferings.length === 0 && (
              <div className="lifestyle-discovery__empty-state">
                <Compass size={36} className="lifestyle-discovery__empty-icon" />
                <h3 className="lifestyle-discovery__empty-title">
                  No offerings found
                </h3>
                <p className="lifestyle-discovery__empty-desc">
                  We could not find anything matching the selected category or filters.
                </p>
                <button
                  type="button"
                  className="lifestyle-discovery__empty-btn"
                  onClick={() => {
                    setSelectedCategoryId('ALL')
                    setSelectedType('ALL')
                    setSearchQuery('')
                  }}
                >
                  Reset Catalog Filters
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Offering Detail Modal */}
      <OfferingDetailModal
        offering={selectedOffering}
        isOpen={Boolean(selectedOffering)}
        onClose={() => setSelectedOffering(null)}
        onVendorClick={(vendor) => {
          setSelectedOffering(null)
          setSelectedVendor(vendor)
        }}
      />

      {/* Vendor Credibility Modal */}
      <VendorCredibilityModal
        vendor={selectedVendor}
        isOpen={Boolean(selectedVendor)}
        onClose={() => setSelectedVendor(null)}
      />
    </div>
  )
}
