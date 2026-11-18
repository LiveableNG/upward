'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  Clock,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  Globe,
  Star,
  AlertCircle,
  Share2,
  Check,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Send,
  MapPin,
  ShoppingCart,
  Wrench,
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useCart, type CartItem } from '../context/CartContext'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'
import { useGoalOfferingDetail, usePublicOfferings } from '../hooks/useGoals'
import { useCreateCommerceInquiry } from '../hooks/useCommerceOrders'
import {
  getGoalTitle,
  isVendorVerified,
  type GoalOffering,
} from '../types/goals.types'
import {
  OfferingCard,
  formatOfferingPrice,
  formatCurrencyValue,
  getOfferingTypeIcon,
} from './OfferingCard'
import {
  getStoredDeliveryLocation,
  saveStoredDeliveryLocation,
  isOfferingDeliverableToLocation,
  formatShortLocation,
  type UserDeliveryLocation,
} from '../utils/deliveryLocation'
import { fetchDeliveryZones } from '../services/goalsService'
import { DeliveryLocationBar } from './DeliveryLocationBar'
import { CommerceCheckoutModal } from './CommerceCheckoutModal'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { getPublicWebUrl, copyTextToClipboard } from '@/lib/utils'
import '../styles/goals.css'

interface OfferingDetailScreenProps {
  identifier: string
}

function formatNgn(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getSafeExternalUrl(raw?: string | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    const parsed = new URL(withProtocol)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString()
    }
    return null
  } catch {
    return null
  }
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

function instantScrollToTop() {
  if (typeof window === 'undefined') return
  const html = document.documentElement
  const prev = html.style.scrollBehavior
  html.style.scrollBehavior = 'auto'
  window.scrollTo(0, 0)
  html.scrollTop = 0
  document.body.scrollTop = 0
  html.style.scrollBehavior = prev
}

export function OfferingDetailSkeleton({ onBack }: { onBack?: () => void }) {
  const handleBack = onBack || (() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    }
  })

  useIsomorphicLayoutEffect(() => {
    instantScrollToTop()
  }, [])

  return (
    <div className="offering-detail" data-hide-bottom-nav="true">
      <header className="offering-detail__header">
        <button
          type="button"
          className="offering-detail__back-btn"
          onClick={handleBack}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
      </header>
      <div className="offering-detail__container animate-pulse">
        <div className="offering-detail__layout">
          <div className="offering-detail__main">
            <div className="offering-detail__skeleton-media" />
            <div className="offering-detail__skeleton-block" />
            <div className="offering-detail__skeleton-block" />
          </div>
          <div className="offering-detail__aside">
            <div className="offering-detail__skeleton-block" style={{ height: '240px' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function renderStructuredOverview(description: string, offering: GoalOffering) {
  if (!description.includes('•') && !description.includes('🧹') && !description.includes('🚿')) {
    return <p className="offering-detail__description">{description}</p>
  }

  const lines = description.split('\n').map((l) => l.trim()).filter(Boolean)
  const introLines: string[] = []
  const categories: Array<{ title: string; items: Array<{ name: string; price?: string }> }> = []
  let currentCategory: { title: string; items: Array<{ name: string; price?: string }> } | null = null

  for (const line of lines) {
    if (line.startsWith('•') || line.startsWith('-')) {
      const cleanLine = line.replace(/^[•\-]\s*/, '')
      const parts = cleanLine.split(/\s+[—–-]\s+(₦[\d,]+)/)
      if (parts.length >= 2) {
        currentCategory?.items.push({ name: parts[0].trim(), price: parts[1].trim() })
      } else {
        const altMatch = cleanLine.match(/^(.*?)\s*\((₦[\d,]+)\)\s*$/)
        if (altMatch) {
          currentCategory?.items.push({ name: altMatch[1].trim(), price: altMatch[2].trim() })
        } else {
          currentCategory?.items.push({ name: cleanLine })
        }
      }
    } else if (
      line.includes('FLOOR') ||
      line.includes('BATHROOM') ||
      line.includes('KITCHEN') ||
      line.includes('CHEMICALS') ||
      line.includes('SANITIZ') ||
      line.startsWith('🧹') ||
      line.startsWith('🚿') ||
      line.startsWith('🍳') ||
      line.startsWith('✨')
    ) {
      currentCategory = { title: line, items: [] }
      categories.push(currentCategory)
    } else if (
      line.toLowerCase().includes('total') ||
      line.toLowerCase().includes('retail value') ||
      line.toLowerCase().includes('package price') ||
      line.toLowerCase().includes('savings')
    ) {
      // Handled in dedicated value banner
    } else if (categories.length === 0) {
      introLines.push(line)
    }
  }

  const totalItemCount = categories.reduce((sum, c) => sum + c.items.length, 0)
  const compareAt = offering.maxPrice || 104000
  const packagePrice = offering.price || 84000
  const savings = compareAt > packagePrice ? compareAt - packagePrice : 0
  const discountPct = compareAt > packagePrice ? Math.round((savings / compareAt) * 100) : 0

  return (
    <div className="offering-detail__overview-wrap">
      {introLines.length > 0 && (
        <p className="offering-detail__description" style={{ marginBottom: 14 }}>
          {introLines.join('\n\n')}
        </p>
      )}

      {/* High-Impact Value Breakdown Banner */}
      <div className="offering-detail__value-banner">
        <div className="offering-detail__value-stat">
          <span className="offering-detail__value-stat-label">Package Size</span>
          <span className="offering-detail__value-stat-num">{totalItemCount || 23} Pieces</span>
        </div>

        {compareAt != null && compareAt > packagePrice && (
          <div className="offering-detail__value-stat">
            <span className="offering-detail__value-stat-label">Individual Retail</span>
            <span className="offering-detail__value-stat-num offering-detail__value-stat-num--strike">
              {formatCurrencyValue(compareAt, offering.currency)}
            </span>
          </div>
        )}

        <div className="offering-detail__value-stat">
          <span className="offering-detail__value-stat-label">Bundle Deal</span>
          <span className="offering-detail__value-stat-num offering-detail__value-stat-num--highlight">
            {formatCurrencyValue(packagePrice, offering.currency)}
          </span>
        </div>

        {savings > 0 && (
          <div className="offering-detail__value-badge">
            Save {formatCurrencyValue(savings, offering.currency)} ({discountPct}% OFF)
          </div>
        )}
      </div>

      {/* Categorized Included Items */}
      {categories.map((cat, cIdx) => (
        <div key={cIdx} className="offering-detail__package-cat">
          <div className="offering-detail__package-cat-header">
            <span className="offering-detail__package-cat-title">{cat.title}</span>
            <span className="offering-detail__package-cat-count">{cat.items.length} items</span>
          </div>
          <div className="offering-detail__package-cat-items">
            {cat.items.map((item, iIdx) => (
              <div key={iIdx} className="offering-detail__package-item-card">
                <div className="offering-detail__package-item-left">
                  <CheckCircle2 size={16} className="offering-detail__package-item-check" />
                  <span className="offering-detail__package-item-name">{item.name}</span>
                </div>
                {item.price && (
                  <span className="offering-detail__package-item-price">{item.price}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export const OfferingDetailScreen: React.FC<OfferingDetailScreenProps> = ({
  identifier: propIdentifier,
}) => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const identifier = React.useMemo(() => {
    if (propIdentifier && propIdentifier !== 'placeholder') {
      return propIdentifier
    }
    const fromSearch = searchParams?.get('id') || searchParams?.get('offering')
    if (fromSearch) return fromSearch
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/dashboard/lifestyle/')
      if (parts[1]) {
        const seg = parts[1].split(/[/?#]/)[0]
        if (seg && seg !== 'placeholder') return seg
      }
    }
    return propIdentifier || ''
  }, [propIdentifier, searchParams])
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState(false)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [deliveryLocation, setDeliveryLocation] = useState<UserDeliveryLocation>(() =>
    getStoredDeliveryLocation(user?.properties?.[0]?.address),
  )
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false)
  const [isInquiryOpen, setIsInquiryOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [inquiryCategory, setInquiryCategory] = useState('GENERAL')
  const [inquiryMessage, setInquiryMessage] = useState('')
  const [inquirySent, setInquirySent] = useState(false)
  const createInquiryMutation = useCreateCommerceInquiry()

  useEffect(() => {
    if (user?.properties?.[0]?.address) {
      setDeliveryLocation(getStoredDeliveryLocation(user.properties[0].address))
    }
  }, [user])

  useEffect(() => {
    let isMounted = true
    fetchDeliveryZones()
      .then((zones) => {
        if (!isMounted || !zones || zones.length === 0) return
        setDeliveryLocation((prev) => {
          const matched = zones.find((z) => z.tag === prev.zoneTag)
          if (matched) {
            const updated: UserDeliveryLocation = {
              ...prev,
              isDelivering: matched.isDelivering,
              pauseReason: matched.pauseReason,
              zoneName: matched.name,
              deliveryFeeKobo: matched.deliveryFeeKobo,
            }
            saveStoredDeliveryLocation(updated)
            return updated
          }

          // Default to the first delivery location configured in the system
          const first = zones[0]
          if (first) {
            const updated: UserDeliveryLocation = {
              address: first.areasCovered?.split(',')?.[0]?.trim() || first.name,
              label: first.name,
              zoneTag: first.tag,
              zoneName: first.name,
              state: first.state,
              isDelivering: first.isDelivering,
              pauseReason: first.pauseReason,
              deliveryFeeKobo: first.deliveryFeeKobo,
            }
            saveStoredDeliveryLocation(updated)
            return updated
          }
          return prev
        })
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    setMounted(true)
    instantScrollToTop()
  }, [identifier])

  const {
    data: detailOffering,
    isLoading: isDetailLoading,
    isError,
    refetch,
  } = useGoalOfferingDetail(identifier)

  const { data: cachedOfferings = [], isLoading: isOfferingsLoading } =
    usePublicOfferings()

  const carouselRef = React.useRef<HTMLDivElement>(null)

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const fallbackOffering = React.useMemo(() => {
    return cachedOfferings.find(
      (o) =>
        o.uuid === identifier ||
        o.slug === identifier ||
        String(o.id) === identifier,
    )
  }, [cachedOfferings, identifier])

  const offering: GoalOffering | undefined = detailOffering || fallbackOffering
  const isLoading = isDetailLoading || (!offering && !isError)

  const deliveryCheck = React.useMemo(() => {
    if (!offering) return { isDeliverable: true }
    return isOfferingDeliverableToLocation(offering, deliveryLocation)
  }, [offering, deliveryLocation])

  const images = React.useMemo(() => {
    if (!offering) return []
    if (offering.media && offering.media.length > 0) {
      return offering.media.map((m) => m.mediaUrl)
    }
    if (offering.imageUrl) {
      return [offering.imageUrl]
    }
    return []
  }, [offering])

  // Similar & Recommended Products / Packages
  const similarItems = React.useMemo(() => {
    if (!offering || !cachedOfferings || cachedOfferings.length === 0) return []

    // Filter out current item and any of its package components
    const componentIds = new Set(
      (offering.packageItems || []).map((p) => p.componentId ?? p.id).filter(Boolean),
    )

    const candidates = cachedOfferings.filter((item) => {
      if (offering.id && item.id === offering.id) return false
      if (offering.uuid && item.uuid === offering.uuid) return false
      if (offering.slug && item.slug === offering.slug) return false
      if (componentIds.has(item.id)) return false
      if (
        item.uuid &&
        offering.packageItems?.some(
          (p) => p.component?.uuid === item.uuid || p.itemOffering?.uuid === item.uuid,
        )
      ) {
        return false
      }
      return true
    })

    // Extract goals and categories associated with the current offering
    const offeringGoalLinks = offering.goalLinks || offering.goals || []
    const offeringGoalIds = new Set(
      offeringGoalLinks.map((g) => g.goalId).filter(Boolean),
    )
    const offeringCategoryIds = new Set(
      offeringGoalLinks
        .map((gl) => gl.goal?.categoryId || gl.goal?.category?.id)
        .filter((id): id is number => typeof id === 'number'),
    )

    // Score by relevance (strictly items sharing goals or category with the current offering/bundle)
    const scored = candidates
      .map((item) => {
        let score = 0
        if (item.type === offering.type) score += 2

        const itemGoalLinks = item.goalLinks || item.goals || []
        const sharesGoal = itemGoalLinks.some((gl) => offeringGoalIds.has(gl.goalId))

        const sharesCategory =
          offeringCategoryIds.size > 0 &&
          itemGoalLinks.some((gl) => {
            const catId = gl.goal?.categoryId || gl.goal?.category?.id
            return typeof catId === 'number' && offeringCategoryIds.has(catId)
          })

        if (sharesGoal) score += 5
        if (sharesCategory) score += 3

        // Strictly require shared goals or category
        if (!sharesGoal && !sharesCategory) return null

        if (item.vendor?.id && offering.vendor?.id && item.vendor.id === offering.vendor.id) {
          score += 1
        }
        if (item.isFeatured) score += 1
        return { item, score }
      })
      .filter((s): s is { item: GoalOffering; score: number } => s !== null)

    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 6).map((s) => s.item)
  }, [offering, cachedOfferings])

  const handleBack = () => {
    router.push('/dashboard/lifestyle')
  }

  const handleShare = async () => {
    const shareUrl = getPublicWebUrl(`/dashboard/lifestyle/${identifier}`)
    const success = await copyTextToClipboard(shareUrl)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inquiryMessage.trim() || createInquiryMutation.isPending) return
    try {
      const targetUuid = offering?.uuid || String(offering?.id || identifier)
      await createInquiryMutation.mutateAsync({
        offeringUuid: targetUuid,
        category: inquiryCategory,
        message: inquiryMessage.trim(),
      })
      setInquirySent(true)
    } catch (err) {
      console.error('Failed to submit commerce inquiry:', err)
    }
  }

  // Robust cross-platform body scroll lock for Lightbox and Inquiry modals
  useBodyScrollLock(isLightboxOpen || isInquiryOpen)

  useEffect(() => {
    if (!isLightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false)
      if (e.key === 'ArrowRight' && images.length > 1) {
        setSelectedImageIndex((prev) =>
          prev < images.length - 1 ? prev + 1 : 0,
        )
      }
      if (e.key === 'ArrowLeft' && images.length > 1) {
        setSelectedImageIndex((prev) =>
          prev > 0 ? prev - 1 : images.length - 1,
        )
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, images.length])

  useEffect(() => {
    if (!isInquiryOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsInquiryOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isInquiryOpen])

  const cart = useCart()

  const isBundle = Boolean(
    offering && (offering.type === 'BUNDLE' || offering.type === 'PACKAGE'),
  )
  const isLockedPackage = Boolean(offering && offering.type === 'PACKAGE')

  const effectivePackageItems = useMemo(() => {
    if (!offering || !isBundle) return []
    if (offering.packageItems && offering.packageItems.length > 0) {
      return offering.packageItems
    }
    return []
  }, [offering, isBundle])

  const packageItems = effectivePackageItems

  const [selectedComponentIds, setSelectedComponentIds] = useState<Set<number>>(
    () => new Set(),
  )
  const [expandedPackageItemIds, setExpandedPackageItemIds] = useState<Set<number>>(
    () => new Set(),
  )

  const toggleExpandedPackageItem = (compId: number) => {
    setExpandedPackageItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(compId)) {
        next.delete(compId)
      } else {
        next.add(compId)
      }
      return next
    })
  }

  useEffect(() => {
    if (packageItems.length > 0) {
      const ids = packageItems
        .map((p) => p.componentId ?? p.id)
        .filter((id): id is number => typeof id === 'number')
      setSelectedComponentIds(new Set(ids))
    }
  }, [offering?.id, packageItems])

  const toggleComponent = (compId: number) => {
    if (isLockedPackage) return
    setSelectedComponentIds((prev) => {
      const next = new Set(prev)
      if (next.has(compId)) {
        if (next.size <= 1) return prev
        next.delete(compId)
      } else {
        next.add(compId)
      }
      return next
    })
  }

  const selectedPackageItems = useMemo(() => {
    return packageItems.filter((p) => {
      const compId = p.componentId ?? p.id
      return typeof compId === 'number' && selectedComponentIds.has(compId)
    })
  }, [packageItems, selectedComponentIds])

  const isAllComponentsSelected =
    packageItems.length > 0 &&
    selectedPackageItems.length === packageItems.length

  const customBundlePrice = useMemo(() => {
    if (!offering) return 0
    if (packageItems.length === 0) {
      return offering.price ? Number(offering.price) : 0
    }
    if (isAllComponentsSelected && offering.price != null) {
      return Number(offering.price)
    }
    return selectedPackageItems.reduce((acc, p) => {
      const comp = p.component || p.itemOffering
      const itemPrice =
        p.overridePrice != null
          ? Number(p.overridePrice)
          : comp?.price != null
            ? Number(comp.price)
            : Number(offering.price || 0) / Math.max(1, packageItems.length)
      return acc + itemPrice * (p.quantity || 1)
    }, 0)
  }, [offering, packageItems, selectedPackageItems, isAllComponentsSelected])

  const compareAtPrice =
    offering?.compareAtPrice ??
    (offering?.pricingModel === 'FIXED' ? offering?.maxPrice : null)

  const expectedTotalRetail = useMemo(() => {
    if (!offering) return null
    if (packageItems.length > 0) {
      const sum = selectedPackageItems.reduce((acc, p) => {
        const comp = p.component || p.itemOffering
        const orig = comp?.price
          ? Number(comp.price)
          : p.overridePrice
            ? Math.round(Number(p.overridePrice) * 1.15)
            : 0
        return acc + orig * (p.quantity || 1)
      }, 0)

      if (isAllComponentsSelected && compareAtPrice && Number(compareAtPrice) > customBundlePrice) {
        return Math.max(Number(compareAtPrice), sum)
      }
      if (sum > customBundlePrice) return sum
      return null
    }
    if (compareAtPrice && Number(compareAtPrice) > customBundlePrice) {
      return Number(compareAtPrice)
    }
    return null
  }, [offering, compareAtPrice, customBundlePrice, packageItems, selectedPackageItems, isAllComponentsSelected])

  const bundleDiscountPercent = useMemo(() => {
    if (!expectedTotalRetail || expectedTotalRetail <= customBundlePrice) return 0
    return Math.round(
      ((expectedTotalRetail - customBundlePrice) / expectedTotalRetail) * 100,
    )
  }, [expectedTotalRetail, customBundlePrice])

  const customCheckoutItems: CartItem[] = useMemo(() => {
    if (!offering) return []
    if (isLockedPackage) {
      const primaryImg =
        offering.promoCoverImage ||
        offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
        offering.media?.[0]?.mediaUrl ||
        offering.imageUrl ||
        null

      return [
        {
          offeringId: offering.id,
          offeringUuid: offering.uuid || String(offering.id),
          title: offering.title || offering.name || 'Curated Package',
          subtitle: offering.subtitle,
          imageUrl: primaryImg,
          price: Number(offering.price || 0),
          currency: offering.currency || 'NGN',
          quantity: 1,
          vendorName: offering.vendor?.name || 'Upward Partner',
          vendorVerified: offering.vendor?.isVerified || false,
          type: 'PACKAGE',
          deliveryAvailable: offering.deliveryAvailable,
          deliveryCoverageType: offering.deliveryCoverageType,
          deliveryZones: offering.deliveryZones,
          vendorDefaultCoverage: offering.vendor?.defaultDeliveryCoverage,
          vendorDefaultZones: offering.vendor?.defaultDeliveryZones,
        },
      ]
    }
    if (packageItems.length > 0) {
      return selectedPackageItems.map((p) => {
        const comp = (p.component || p.itemOffering || offering) as GoalOffering
        const itemPrice =
          p.overridePrice != null
            ? Number(p.overridePrice)
            : comp.price
              ? Number(comp.price)
              : Number(offering.price || 0) / Math.max(1, packageItems.length)
        const primaryImg =
          comp.imageUrl ||
          comp.media?.find((m) => m.isPrimary)?.mediaUrl ||
          comp.media?.[0]?.mediaUrl ||
          offering.imageUrl ||
          null
        return {
          offeringId: comp.id,
          offeringUuid: comp.uuid || String(comp.id),
          title: comp.title || comp.name || offering.title || 'Package Item',
          subtitle: comp.subtitle,
          imageUrl: primaryImg,
          price: itemPrice,
          currency: comp.currency || offering.currency || 'NGN',
          quantity: p.quantity || 1,
          vendorName: comp.vendor?.name || offering.vendor?.name || 'Upward Partner',
          vendorVerified: comp.vendor?.isVerified || offering.vendor?.isVerified || false,
          type: (comp.type as CartItem['type']) || 'PRODUCT',
          bundleParentTitle: offering.title,
        }
      })
    }
    return []
  }, [offering, packageItems, selectedPackageItems, isLockedPackage])

  const handleAddToCart = () => {
    if (!offering) return
    if (isLockedPackage) {
      cart.addItem(offering, { quantity: 1 })
      cart.openCart()
      return
    }
    if (packageItems.length > 0) {
      const componentsToAdd = selectedPackageItems.map((p) => {
        const comp = (p.component || p.itemOffering || offering) as GoalOffering
        const overridePrice =
          p.overridePrice != null
            ? Number(p.overridePrice)
            : comp.price
              ? Number(comp.price)
              : Number(offering.price || 0) / Math.max(1, packageItems.length)
        return {
          offering: comp,
          overridePrice,
          quantity: p.quantity || 1,
        }
      })
      cart.addBundleItems(offering, componentsToAdd)
    } else {
      cart.addItem(offering, { quantity: 1 })
    }
    cart.openCart()
  }

  if (isLoading) {
    return <OfferingDetailSkeleton onBack={handleBack} />
  }

  if ((isError && !offering) || !offering) {
    return (
      <div className="offering-detail">
        <header className="offering-detail__header">
          <button
            type="button"
            className="offering-detail__back-btn"
            onClick={handleBack}
            aria-label="Back to Lifestyle"
          >
            <ArrowLeft size={18} />
          </button>
        </header>
        <div className="offering-detail__container">
          <div className="lifestyle-discovery__error-card">
            <AlertCircle size={28} className="lifestyle-discovery__error-icon" />
            <h2 className="lifestyle-discovery__empty-title">
              Item Unavailable
            </h2>
            <p className="lifestyle-discovery__empty-desc">
              This item could not be loaded or is no longer available.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="lifestyle-discovery__retry-btn"
                onClick={() => refetch()}
              >
                Try Again
              </button>
              <button
                type="button"
                className="lifestyle-discovery__empty-btn"
                onClick={handleBack}
              >
                Back to Explore
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const TypeIcon = getOfferingTypeIcon(offering.type)
  const title = offering.title || offering.name || 'Untitled Item'

  const activeImage = images[selectedImageIndex] || null
  const showActiveImage =
    Boolean(activeImage) && !failedImages[selectedImageIndex]

  const rawGoalLinks = offering.goalLinks || offering.goals || []
  const linkedGoals = rawGoalLinks
    .map((g) => getGoalTitle(g.goal))
    .filter(Boolean)

  const vendor = offering.vendor
  const vendorVerified = isVendorVerified(vendor)
  const vendorEmail = vendor?.email || vendor?.contactEmail || null
  const vendorPhone = vendor?.phone || vendor?.contactPhone || null
  const vendorWebsite = getSafeExternalUrl(vendor?.website)


  const hasDiscount =
    compareAtPrice != null &&
    offering.price != null &&
    compareAtPrice > offering.price
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice! - offering.price!) / compareAtPrice!) * 100)
    : 0
  const savingsAmount = hasDiscount
    ? compareAtPrice! - offering.price!
    : 0

  if (isBundle) {
    return (
      <div className="offering-detail" data-hide-bottom-nav="true">
        {/* Navigation Bar */}
        <header className="offering-detail__header">
          <div className="offering-detail__header-inner">
            <button
              type="button"
              className="offering-detail__back-btn"
              onClick={handleBack}
              aria-label="Back to Lifestyle"
            >
              <ArrowLeft size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="bundle-showcase__cart-trigger"
                onClick={cart.openCart}
              >
                <ShoppingCart size={15} />
                <span>Cart</span>
                {cart.totalCount > 0 && (
                  <span className="bundle-showcase__cart-badge">
                    {cart.totalCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className="offering-detail__share-btn"
                onClick={handleShare}
              >
                {copied ? <Check size={15} /> : <Share2 size={15} />}
                <span>{copied ? 'Copied' : 'Share'}</span>
              </button>
            </div>
          </div>
        </header>

        <main className="offering-detail__container bundle-showcase">
          {/* Clean Editorial Hero Banner */}
          <section className="bundle-showcase__hero">
            {offering.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={offering.imageUrl}
                alt={title}
                className="bundle-showcase__hero-img"
              />
            )}
            <div className="bundle-showcase__hero-info">
              <h1 className="bundle-showcase__title">{title}</h1>
              {offering.subtitle && (
                <p className="bundle-showcase__subtitle">{offering.subtitle}</p>
              )}
              {offering.description && offering.description !== offering.subtitle && (
                <p className="bundle-showcase__desc">{offering.description}</p>
              )}
              <div className="bundle-showcase__pricing-row">
                <span className="bundle-showcase__price-val">
                  {formatNgn(customBundlePrice)}
                </span>
                {expectedTotalRetail && expectedTotalRetail > customBundlePrice && (
                  <span className="bundle-showcase__price-original">
                    {formatNgn(expectedTotalRetail)}
                  </span>
                )}
                {bundleDiscountPercent > 0 && (
                  <div
                    className="bundle-showcase__burst-badge"
                    aria-label={`${bundleDiscountPercent}% OFF`}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      className="bundle-showcase__burst-svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M50.0 2.0 L57.6 11.7 L68.4 5.7 L71.7 17.6 L83.9 16.1 L82.4 28.3 L94.3 31.6 L88.3 42.4 L98.0 50.0 L88.3 57.6 L94.3 68.4 L82.4 71.7 L83.9 83.9 L71.7 82.4 L68.4 94.3 L57.6 88.3 L50.0 98.0 L42.4 88.3 L31.6 94.3 L28.3 82.4 L16.1 83.9 L17.6 71.7 L5.7 68.4 L11.7 57.6 L2.0 50.0 L11.7 42.4 L5.7 31.6 L17.6 28.3 L16.1 16.1 L28.3 17.6 L31.6 5.7 L42.4 11.7 Z"
                        fill="#dc2626"
                      />
                    </svg>
                    <div className="bundle-showcase__burst-text">
                      <span className="bundle-showcase__burst-pct">
                        {bundleDiscountPercent}%
                      </span>
                      <span className="bundle-showcase__burst-off">OFF</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bundle-showcase__top-actions">
                <button
                  type="button"
                  className="bundle-showcase__top-add-btn"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart size={15} strokeWidth={2.3} />
                  <span>
                    {isLockedPackage
                      ? 'Add Package to Cart'
                      : isAllComponentsSelected
                        ? 'Add to Cart'
                        : `Add (${selectedPackageItems.length}) to Cart`}
                  </span>
                </button>
                <button
                  type="button"
                  className="bundle-showcase__top-checkout-btn"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  <span>Checkout</span>
                </button>
              </div>
            </div>
          </section>

          {/* Included Items Section */}
          <section className="bundle-showcase__items-section">
            <div className="bundle-showcase__items-header">
              <div>
                <h2 className="bundle-showcase__items-title">
                  {isLockedPackage
                    ? `What’s included (${packageItems.length} items)`
                    : `What’s included (${selectedPackageItems.length} of ${packageItems.length})`}
                </h2>
                <p className="bundle-showcase__items-desc">
                  {isLockedPackage
                    ? `All ${packageItems.length} verified items are included in this complete package. Tap any item to view full details.`
                    : 'Tap any item to include or remove it from your set. Total updates in real time.'}
                </p>
              </div>
            </div>

            <div className="bundle-showcase__items-list">
              {packageItems.map((pkgItem, idx) => {
                const comp = pkgItem.component || pkgItem.itemOffering
                const compId = (pkgItem.componentId ?? pkgItem.id) as number
                const isSelected = typeof compId === 'number' && selectedComponentIds.has(compId)
                const isExpanded =
                  isLockedPackage &&
                  typeof compId === 'number' &&
                  expandedPackageItemIds.has(compId)
                const itemTitle =
                  comp?.title || comp?.name || `Component ${idx + 1}`
                const itemPrice =
                  pkgItem.overridePrice != null
                    ? Number(pkgItem.overridePrice)
                    : comp?.price != null
                      ? Number(comp.price)
                      : null
                const originalPrice =
                  comp?.price != null ? Number(comp.price) : null
                const primaryCompImage =
                  comp?.imageUrl ||
                  comp?.media?.find((m: any) => m.isPrimary)?.mediaUrl ||
                  comp?.media?.[0]?.mediaUrl ||
                  offering.imageUrl ||
                  null

                const handleCardActivate = () => {
                  if (isLockedPackage) {
                    if (comp?.description) toggleExpandedPackageItem(compId)
                  } else {
                    toggleComponent(compId)
                  }
                }

                return (
                  <div
                    key={pkgItem.id || idx}
                    className={`bundle-showcase__item-card ${
                      isSelected
                        ? 'bundle-showcase__item-card--selected'
                        : 'bundle-showcase__item-card--deselected'
                    } ${isLockedPackage ? 'bundle-showcase__item-card--locked' : ''} ${
                      isExpanded ? 'bundle-showcase__item-card--expanded' : ''
                    }`}
                    onClick={handleCardActivate}
                    role={isLockedPackage ? 'button' : 'checkbox'}
                    aria-checked={isLockedPackage ? undefined : isSelected}
                    aria-expanded={isLockedPackage ? isExpanded : undefined}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        handleCardActivate()
                      }
                    }}
                  >
                    {!isLockedPackage && (
                      <div
                        className={`bundle-showcase__checkbox ${
                          isSelected ? 'bundle-showcase__checkbox--checked' : ''
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    )}

                    {primaryCompImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={primaryCompImage}
                        alt={itemTitle}
                        className="bundle-showcase__item-thumb"
                      />
                    )}

                    <div className="bundle-showcase__item-info">
                      <div className="bundle-showcase__item-title-row">
                        <span className="bundle-showcase__item-name">
                          {itemTitle}
                        </span>
                        {pkgItem.quantity > 1 && (
                          <span className="bundle-showcase__item-qty">
                            ×{pkgItem.quantity}
                          </span>
                        )}
                      </div>
                      {comp?.description && (
                        <p
                          className={`bundle-showcase__item-desc ${
                            isExpanded ? 'bundle-showcase__item-desc--expanded' : ''
                          }`}
                        >
                          {comp.description}
                        </p>
                      )}
                    </div>

                    {isLockedPackage && comp?.description && (
                      <span className="bundle-showcase__item-chevron" aria-hidden="true">
                        <ChevronDown size={16} strokeWidth={2.2} />
                      </span>
                    )}

                    {/* Hide individual item prices for packages */}
                    {!isLockedPackage && (
                      <div className="bundle-showcase__item-pricing">
                        {itemPrice != null && (
                          <span className="bundle-showcase__item-price">
                            {formatNgn(itemPrice * (pkgItem.quantity || 1))}
                          </span>
                        )}
                        {originalPrice != null &&
                          originalPrice > (itemPrice || 0) && (
                            <span className="bundle-showcase__item-original">
                              {formatNgn(
                                originalPrice * (pkgItem.quantity || 1),
                              )}
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>



          {/* Similar Items Carousel */}
          {(similarItems.length > 0 || isOfferingsLoading) && (
            <section
              className="offering-detail__similar-section"
              style={{ marginTop: 24, paddingBottom: 24 }}
            >
              <div className="offering-detail__similar-header-row">
                <div>
                  <h2 className="offering-detail__similar-title">
                    Similar Products & Packages
                  </h2>
                </div>
              </div>
              <div className="offering-detail__carousel-track">
                {similarItems.map((item) => (
                  <div
                    key={item.id}
                    className="offering-detail__carousel-item offering-detail__carousel-slide"
                  >
                    <OfferingCard
                      item={{ offering: item }}
                      userLocation={deliveryLocation}
                      onClick={(clicked) => {
                        const targetId =
                          clicked.uuid || clicked.slug || clicked.id
                        router.push(`/dashboard/lifestyle?id=${targetId}`)
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Multi-Item Checkout Modal */}
        {isCheckoutOpen && (
          <CommerceCheckoutModal
            offering={offering}
            cartItems={customCheckoutItems}
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            deliveryLocation={deliveryLocation}
            onLocationChange={(loc) => setDeliveryLocation(loc)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="offering-detail" data-hide-bottom-nav="true">
      {/* Sticky Navigation Bar */}
      <header className="offering-detail__header">
        <div className="offering-detail__header-inner">
          <button
            type="button"
            className="offering-detail__back-btn"
            onClick={handleBack}
            aria-label="Back to Lifestyle"
          >
            <ArrowLeft size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="bundle-showcase__cart-trigger"
              onClick={cart.openCart}
            >
              <ShoppingCart size={15} />
              <span>Cart</span>
              {cart.totalCount > 0 && (
                <span className="bundle-showcase__cart-badge">
                  {cart.totalCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className="offering-detail__share-btn"
              onClick={handleShare}
            >
              {copied ? <Check size={15} /> : <Share2 size={15} />}
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="offering-detail__container">
        <div className="offering-detail__layout">
          {/* Left / Main Column */}
          <div className="offering-detail__main">
            {/* Media Gallery */}
            <div className="offering-detail__gallery">
              <div
                className={`offering-detail__hero-media ${showActiveImage ? 'offering-detail__hero-media--clickable' : ''}`}
                onClick={() => {
                  if (showActiveImage) setIsLightboxOpen(true)
                }}
                tabIndex={showActiveImage ? 0 : undefined}
                role={showActiveImage ? 'button' : undefined}
                aria-label={showActiveImage ? 'Click to enlarge and pan image' : undefined}
                onKeyDown={(e) => {
                  if (showActiveImage && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    setIsLightboxOpen(true)
                  }
                }}
              >
                {showActiveImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeImage!}
                    alt={title}
                    className="offering-detail__hero-img"
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [selectedImageIndex]: true,
                      }))
                    }
                  />
                ) : (
                  <div className="offering-detail__hero-placeholder">
                    <TypeIcon size={48} strokeWidth={1.5} />
                  </div>
                )}

                <span
                  className={`offering-card__type-badge offering-card__type-badge--${offering.type.toLowerCase()}`}
                >
                  <TypeIcon size={12} strokeWidth={2.3} />
                  <span>{offering.type}</span>
                </span>

                {showActiveImage && (
                  <button
                    type="button"
                    className="offering-detail__expand-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsLightboxOpen(true)
                    }}
                    aria-label="View full photo"
                  >
                    <Maximize2 size={13} />
                    <span>View full</span>
                  </button>
                )}
              </div>

              {images.length > 1 && (
                <div className="offering-detail__thumbs">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`offering-detail__thumb ${
                        selectedImageIndex === idx
                          ? 'offering-detail__thumb--active'
                          : ''
                      }`}
                      onClick={() => setSelectedImageIndex(idx)}
                    >
                      {!failedImages[idx] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={`${title} thumbnail ${idx + 1}`}
                          onError={() =>
                            setFailedImages((prev) => ({ ...prev, [idx]: true }))
                          }
                        />
                      ) : (
                        <TypeIcon size={16} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Summary Card */}
            <section className="offering-detail__card">
              <div className="offering-detail__title-row">
                <h1 className="offering-detail__title">{title}</h1>
                {offering.subtitle && (
                  <p className="offering-detail__subtitle">{offering.subtitle}</p>
                )}
              </div>

              <div className="offering-detail__price-banner">
                <div className="offering-detail__price-col">
                  <span className="offering-detail__price-label">Price</span>
                  <div className="offering-detail__price-row">
                    <span className="offering-detail__price-value">
                      {formatOfferingPrice(offering)}
                    </span>
                    {hasDiscount && (
                      <span className="offering-detail__compare-price">
                        {formatCurrencyValue(compareAtPrice, offering.currency)}
                      </span>
                    )}
                    {hasDiscount && (
                      <span className="offering-detail__discount-badge">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>
                  {hasDiscount && (
                    <span className="offering-detail__savings-text">
                      You save {formatCurrencyValue(savingsAmount, offering.currency)}
                    </span>
                  )}
                </div>
                {offering.pricingModel && (
                  <span className="offering-detail__pricing-pill">
                    {offering.pricingModel.toLowerCase().replace('_', ' ')}
                  </span>
                )}
              </div>

              {offering.description && (
                <div className="offering-detail__description-block">
                  <h2 className="offering-detail__section-label">Overview & Included Items</h2>
                  {renderStructuredOverview(offering.description, offering)}
                </div>
              )}

              {linkedGoals.length > 0 && (
                <div className="offering-detail__goals-block">
                  <span className="offering-detail__section-label">
                    Relevant Goals
                  </span>
                  <div className="offering-detail__goal-chips">
                    {linkedGoals.map((goalName, idx) => (
                      <span key={idx} className="offering-detail__goal-chip">
                        {goalName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right / Merchant & Action Column */}
          <aside className="offering-detail__aside">
            <section className="offering-detail__card offering-detail__vendor-card">
              <h2 className="offering-detail__section-label">
                Merchant & Fulfillment
              </h2>

              {vendor ? (
                <div className="offering-detail__vendor-header">
                  <div className="offering-detail__vendor-avatar">
                    <Building2 size={22} />
                  </div>
                  <div className="offering-detail__vendor-info">
                    <div className="offering-detail__vendor-name-row">
                      <span className="offering-detail__vendor-name">
                        {vendor.name}
                      </span>
                      {vendorVerified && (
                        <ShieldCheck
                          size={15}
                          className="offering-detail__vendor-verified"
                          aria-label="Verified Merchant"
                        />
                      )}
                    </div>
                    <div className="offering-detail__vendor-meta">
                      {vendorVerified && <span>Verified Upward Partner</span>}
                      {vendor.rating != null && (
                        <span className="offering-detail__vendor-rating">
                          <Star size={12} fill="currentColor" />
                          {vendor.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="offering-detail__perk-desc" style={{ marginBottom: 12 }}>
                  Fulfilled by an Upward-verified partner merchant.
                </p>
              )}

              {/* Clean, Unified Fulfillment & Coverage Row */}
              <div
                className={`offering-detail__fulfillment-row ${
                  !deliveryCheck.isDeliverable
                    ? 'offering-detail__fulfillment-row--warn'
                    : ''
                }`}
                onClick={() => setIsLocationPickerOpen(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setIsLocationPickerOpen(true)
                  }
                }}
              >
                <div
                  className={`offering-detail__fulfillment-icon ${
                    !deliveryCheck.isDeliverable
                      ? 'offering-detail__fulfillment-icon--warn'
                      : ''
                  }`}
                >
                  <MapPin size={17} />
                </div>

                <div className="offering-detail__fulfillment-body">
                  <div className="offering-detail__fulfillment-head">
                    <span className="offering-detail__fulfillment-dest">
                      {offering.type === 'SERVICE' ? 'Service in' : 'Delivery to'}{' '}
                      <strong>{formatShortLocation(deliveryLocation)}</strong>
                    </span>
                    {deliveryCheck.isDeliverable ? (
                      <span className="offering-detail__fulfillment-badge offering-detail__fulfillment-badge--ok">
                        Eligible
                      </span>
                    ) : (
                      <span className="offering-detail__fulfillment-badge offering-detail__fulfillment-badge--warn">
                        Outside Area
                      </span>
                    )}
                  </div>

                  <div className="offering-detail__fulfillment-note">
                    {deliveryCheck.isDeliverable ? (
                      <span>
                        {offering.type === 'SERVICE'
                          ? 'On-site service visit • Flexible scheduling'
                          : offering.leadTimeDays === 0
                            ? 'Same-day delivery turnaround'
                            : `${offering.leadTimeDays || 1}-day doorstep delivery`}
                      </span>
                    ) : (
                      <span className="offering-detail__fulfillment-reason">
                        {deliveryCheck.reason ||
                          `${offering.vendor?.name || 'Merchant'} does not service this zone.`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="offering-detail__fulfillment-action">
                  <span>Change</span>
                  <ChevronRight size={13} />
                </div>
              </div>

              {/* Seamless Zone Chooser Modal */}
              <DeliveryLocationBar
                location={deliveryLocation}
                onLocationChange={(loc) => setDeliveryLocation(loc)}
                offering={offering}
                variant="none"
                isOpen={isLocationPickerOpen}
                onOpenChange={setIsLocationPickerOpen}
              />

              <div className="offering-detail__cta-stack">
                {offering.type === 'SERVICE' ||
                offering.pricingModel === 'QUOTE_REQUIRED' ||
                !offering.price ? (
                  <>
                    <button
                      type="button"
                      className="offering-detail__primary-cta"
                      onClick={() => {
                        setInquiryCategory('PRICING')
                        setIsInquiryOpen(true)
                        setInquirySent(false)
                      }}
                    >
                      <MessageSquare size={16} />
                      <span>Request a Custom Quote</span>
                    </button>
                    <button
                      type="button"
                      className="offering-detail__secondary-cta"
                      onClick={() => {
                        setInquiryCategory('GENERAL')
                        setIsInquiryOpen(true)
                        setInquirySent(false)
                      }}
                    >
                      <span>Ask Upward Support</span>
                    </button>
                  </>
                ) : deliveryCheck.isDeliverable ? (
                  <>
                    <button
                      type="button"
                      className="offering-detail__primary-cta"
                      onClick={() => setIsCheckoutOpen(true)}
                    >
                      <span>
                        {packageItems.length > 0
                          ? `Order Selected (${selectedPackageItems.length}) • ${formatNgn(customBundlePrice)}`
                          : 'Order Now'}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="offering-detail__cart-cta"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart size={16} />
                      <span>
                        {packageItems.length > 0
                          ? `Add ${selectedPackageItems.length} Items to Cart`
                          : 'Add to Cart'}
                      </span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="offering-detail__primary-cta"
                    onClick={() => setIsLocationPickerOpen(true)}
                  >
                    <MapPin size={16} />
                    <span>Select Covered Location to Order</span>
                  </button>
                )}

                <button
                  type="button"
                  className="offering-detail__secondary-cta"
                  onClick={() => {
                    setIsInquiryOpen(true)
                    setInquirySent(false)
                  }}
                >
                  <MessageSquare size={16} />
                  <span>Ask Upward Support</span>
                </button>
              </div>
            </section>
          </aside>
        </div>

        {/* Similar / Recommended Packages & Products — Horizontal Carousel */}
        {(similarItems.length > 0 || isOfferingsLoading) && (
          <section className="offering-detail__similar-section">
            <div className="offering-detail__similar-header-row">
              <div>
                <h2 className="offering-detail__similar-title">
                  Similar Products & Packages
                </h2>
                <p className="offering-detail__similar-desc">
                  Curated alternatives and bundles tailored for your living space
                </p>
              </div>

              {similarItems.length > 1 && (
                <div className="offering-detail__carousel-nav">
                  <button
                    type="button"
                    className="offering-detail__carousel-arrow"
                    onClick={() => scrollCarousel('left')}
                    aria-label="Previous items"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="offering-detail__carousel-arrow"
                    onClick={() => scrollCarousel('right')}
                    aria-label="Next items"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="offering-detail__carousel-track" ref={carouselRef}>
              {isOfferingsLoading && similarItems.length === 0 ? (
                [1, 2, 3].map((n) => (
                  <div key={n} className="offering-detail__carousel-item">
                    <div className="offering-card offering-card--skeleton">
                      <div className="offering-card__media-skeleton" />
                      <div className="offering-card__body-skeleton" />
                    </div>
                  </div>
                ))
              ) : (
                similarItems.map((item) => (
                  <div key={item.id} className="offering-detail__carousel-item">
                    <OfferingCard
                      item={{ offering: item, isGoalMatch: true }}
                      userLocation={deliveryLocation}
                      onClick={(clicked) => {
                        const nextId =
                          clicked.uuid || clicked.slug || String(clicked.id)
                        router.push(`/dashboard/lifestyle?id=${encodeURIComponent(nextId)}`, { scroll: false })
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* Fullscreen Fluid Image Lightbox */}
      {mounted &&
        isLightboxOpen &&
        showActiveImage &&
        createPortal(
          <div
            className="offering-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="Full-size image view"
            onClick={() => setIsLightboxOpen(false)}
          >
            <div className="offering-lightbox__backdrop" />

            <header
              className="offering-lightbox__header"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="offering-lightbox__info">
                <span className="offering-lightbox__title">{title}</span>
                {images.length > 1 && (
                  <span className="offering-lightbox__counter">
                    {selectedImageIndex + 1} of {images.length}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="offering-lightbox__close-btn"
                onClick={() => setIsLightboxOpen(false)}
                aria-label="Close photo view"
              >
                <X size={20} />
              </button>
            </header>

            <div
              className="offering-lightbox__body"
              onClick={() => setIsLightboxOpen(false)}
            >
              {images.length > 1 && (
                <button
                  type="button"
                  className="offering-lightbox__arrow offering-lightbox__arrow--prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) =>
                      prev > 0 ? prev - 1 : images.length - 1,
                    )
                  }}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              <div
                className="offering-lightbox__content"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="offering-lightbox__scrollable">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeImage!}
                    alt={title}
                    className="offering-lightbox__full-img"
                  />
                </div>
                <div className="offering-lightbox__hint">
                  <span>Pan or scroll to view whole photo</span>
                  <span className="offering-lightbox__hint-dot">•</span>
                  <span>Tap outside to close</span>
                </div>
              </div>

              {images.length > 1 && (
                <button
                  type="button"
                  className="offering-lightbox__arrow offering-lightbox__arrow--next"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedImageIndex((prev) =>
                      prev < images.length - 1 ? prev + 1 : 0,
                    )
                  }}
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}

      {/* Upward Support & Quote Inquiry Modal */}
      <BottomSheetModal
        isOpen={isInquiryOpen}
        onClose={() => setIsInquiryOpen(false)}
        title={
          offering.type === 'SERVICE' || inquiryCategory === 'PRICING'
            ? 'Request a Custom Quote'
            : 'Ask Upward Support'
        }
        subtitle={
          offering.type === 'SERVICE' || inquiryCategory === 'PRICING'
            ? `Verified service quote for ${title}`
            : `Inquiry regarding ${title}`
        }
        maxWidth="500px"
      >
        {inquirySent ? (
          <div className="inquiry-sheet__success">
            <div className="inquiry-sheet__success-icon">
              <Check size={24} strokeWidth={2.5} />
            </div>
            <h4 className="inquiry-sheet__success-title">
              {offering.type === 'SERVICE' || inquiryCategory === 'PRICING'
                ? 'Quote Request Received'
                : 'Inquiry Received'}
            </h4>
            <p className="inquiry-sheet__success-desc">
              {offering.type === 'SERVICE' || inquiryCategory === 'PRICING'
                ? 'We’ve logged your service request with Upward Operations and notified our verified partner. We will coordinate your scope and provide a custom quote for payment.'
                : 'We’ve logged your request with the Upward Support team and sent a confirmation email. We will update you via email and app notification.'}
            </p>
            <button
              type="button"
              className="inquiry-form__btn inquiry-form__btn--submit"
              style={{ width: '100%' }}
              onClick={() => setIsInquiryOpen(false)}
            >
              Done
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitInquiry}
            className="inquiry-form"
          >
            {createInquiryMutation.isError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#dc2626',
                  fontSize: '12.5px',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>
                  {createInquiryMutation.error?.message ||
                    'Failed to submit inquiry. Please try again.'}
                </span>
              </div>
            )}

            <div className="inquiry-form__field">
              <label className="inquiry-form__label">Inquiry Topic</label>
              <select
                value={inquiryCategory}
                onChange={(e) => setInquiryCategory(e.target.value)}
                className="inquiry-form__select"
              >
                <option value="PRICING">Pricing & Custom Service Quote</option>
                <option value="DELIVERY">Delivery Area & Scheduling Inquiry</option>
                <option value="CUSTOMIZATION">Customization / Scope Request</option>
                <option value="GENERAL">General Product / Service Question</option>
              </select>
            </div>

            <div className="inquiry-form__field">
              <label className="inquiry-form__label">
                {offering.type === 'SERVICE' || inquiryCategory === 'PRICING'
                  ? 'Service Requirements & Scope'
                  : 'Your Message'}
              </label>
              <textarea
                placeholder={
                  offering.type === 'SERVICE' || inquiryCategory === 'PRICING'
                    ? 'Please describe your apartment size/rooms, preferred service date/time, and any specific requirements for our verified team...'
                    : 'Ask any question about this item, specifications, or delivery...'
                }
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                className="inquiry-form__textarea"
                rows={4}
                required
                autoFocus
              />
            </div>

            <div className="inquiry-form__notice">
              <ShieldCheck size={16} className="inquiry-form__notice-icon" />
              <span>
                Upward coordinates directly with the merchant partner and replies to your registered account email.
              </span>
            </div>

            <div className="inquiry-form__actions">
              <button
                type="button"
                className="inquiry-form__btn inquiry-form__btn--cancel"
                onClick={() => setIsInquiryOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inquiry-form__btn inquiry-form__btn--submit"
                disabled={
                  !inquiryMessage.trim() || createInquiryMutation.isPending
                }
              >
                {createInquiryMutation.isPending ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Send Inquiry</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </BottomSheetModal>

      {/* Commerce Checkout & Paystack Modal */}
      {offering && (
        <CommerceCheckoutModal
          offering={offering}
          cartItems={packageItems.length > 0 ? customCheckoutItems : undefined}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          deliveryLocation={deliveryLocation}
          onLocationChange={(loc) => setDeliveryLocation(loc)}
        />
      )}
    </div>
  )
}
