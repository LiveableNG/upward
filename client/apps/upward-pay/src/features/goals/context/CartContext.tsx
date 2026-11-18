'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react'
import type { GoalOffering } from '../types/goals.types'

export interface CartItem {
  offeringId: number
  offeringUuid: string
  title: string
  subtitle?: string | null
  imageUrl?: string | null
  price: number // In NGN
  originalPrice?: number | null
  currency: string
  quantity: number
  vendorId?: number | null
  vendorName?: string | null
  vendorVerified?: boolean
  type: 'PRODUCT' | 'SERVICE' | 'BUNDLE' | 'PACKAGE'
  leadTimeDays?: number | null
  bundleParentTitle?: string | null
  deliveryAvailable?: boolean
  deliveryCoverageType?: string
  deliveryZones?: string[]
  vendorDefaultCoverage?: string
  vendorDefaultZones?: string[]
}

interface CartContextValue {
  items: CartItem[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  addItem: (
    offering: GoalOffering,
    options?: {
      quantity?: number
      bundleParentTitle?: string
      overridePrice?: number
    },
  ) => void
  addBundleItems: (
    bundleOffering: GoalOffering,
    selectedComponents: Array<{
      offering: GoalOffering
      overridePrice?: number
      quantity?: number
    }>,
  ) => void
  removeItem: (offeringId: number) => void
  updateQuantity: (offeringId: number, delta: number) => void
  setQuantity: (offeringId: number, quantity: number) => void
  clearCart: () => void
  totalCount: number
  subtotal: number
}

const CART_STORAGE_KEY = 'upward_lifestyle_cart_v1'

const CartContext = createContext<CartContextValue | undefined>(undefined)

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage once on client
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
    } catch {
      // Ignore parse/storage errors
    } finally {
      setHydrated(true)
    }
  }, [])

  // Persist to localStorage whenever cart items change
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Storage quota or private mode protection
    }
  }, [items, hydrated])

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const toggleCart = useCallback(() => setIsOpen((prev) => !prev), [])

  const addItem = useCallback(
    (
      offering: GoalOffering,
      options?: {
        quantity?: number
        bundleParentTitle?: string
        overridePrice?: number
      },
    ) => {
      // Services requiring quotes should never enter the physical shopping cart
      if (
        offering.type === 'SERVICE' &&
        (offering.pricingModel === 'QUOTE_REQUIRED' || !offering.price)
      ) {
        return
      }

      const qtyToAdd = options?.quantity ?? 1
      const price =
        options?.overridePrice ??
        offering.price ??
        offering.minPrice ??
        offering.maxPrice ??
        0
      const primaryImage =
        offering.promoCoverImage ||
        offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
        offering.media?.[0]?.mediaUrl ||
        offering.imageUrl ||
        null

      setItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.offeringId === offering.id)
        if (existingIdx >= 0) {
          // Services and Packages have fixed quantity 1
          if (offering.type === 'SERVICE' || offering.type === 'PACKAGE') {
            return prev
          }
          const updated = [...prev]
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + qtyToAdd,
          }
          return updated
        }

        const newItem: CartItem = {
          offeringId: offering.id,
          offeringUuid: offering.uuid || String(offering.id),
          title: offering.title || offering.name || 'Curated Item',
          subtitle: offering.subtitle,
          imageUrl: primaryImage,
          price,
          originalPrice: offering.compareAtPrice ?? offering.maxPrice ?? null,
          currency: offering.currency || 'NGN',
          quantity: qtyToAdd,
          vendorId: offering.vendor?.id ?? null,
          vendorName: offering.vendor?.name ?? 'Upward Partner',
          vendorVerified: offering.vendor?.isVerified ?? false,
          type: (offering.type as CartItem['type']) || 'PRODUCT',
          leadTimeDays: offering.leadTimeDays,
          bundleParentTitle: options?.bundleParentTitle ?? null,
          deliveryAvailable: offering.deliveryAvailable,
          deliveryCoverageType: offering.deliveryCoverageType,
          deliveryZones: offering.deliveryZones,
          vendorDefaultCoverage: offering.vendor?.defaultDeliveryCoverage,
          vendorDefaultZones: offering.vendor?.defaultDeliveryZones,
        }
        return [...prev, newItem]
      })

      // Open drawer automatically so user gets immediate visual confirmation
      setIsOpen(true)
    },
    [],
  )

  const addBundleItems = useCallback(
    (
      bundleOffering: GoalOffering,
      selectedComponents: Array<{
        offering: GoalOffering
        overridePrice?: number
        quantity?: number
      }>,
    ) => {
      const bundleTitle =
        bundleOffering.promoTitle ||
        bundleOffering.title ||
        bundleOffering.name ||
        'Featured Bundle'

      setItems((prev) => {
        let updated = [...prev]
        for (const comp of selectedComponents) {
          const { offering, overridePrice, quantity = 1 } = comp
          const price =
            overridePrice ??
            offering.price ??
            offering.minPrice ??
            offering.maxPrice ??
            0
          const primaryImage =
            offering.promoCoverImage ||
            offering.media?.find((m) => m.isPrimary)?.mediaUrl ||
            offering.media?.[0]?.mediaUrl ||
            offering.imageUrl ||
            null

          const existingIdx = updated.findIndex((i) => i.offeringId === offering.id)
          if (existingIdx >= 0) {
            updated[existingIdx] = {
              ...updated[existingIdx],
              quantity: updated[existingIdx].quantity + quantity,
              bundleParentTitle: bundleTitle,
            }
          } else {
            updated.push({
              offeringId: offering.id,
              offeringUuid: offering.uuid || String(offering.id),
              title: offering.title || offering.name || 'Curated Item',
              subtitle: offering.subtitle,
              imageUrl: primaryImage,
              price,
              originalPrice: offering.compareAtPrice ?? offering.maxPrice ?? null,
              currency: offering.currency || 'NGN',
              quantity,
              vendorId: offering.vendor?.id ?? null,
              vendorName: offering.vendor?.name ?? 'Upward Partner',
              vendorVerified: offering.vendor?.isVerified ?? false,
              type: (offering.type as CartItem['type']) || 'PRODUCT',
              leadTimeDays: offering.leadTimeDays,
              bundleParentTitle: bundleTitle,
              deliveryAvailable: offering.deliveryAvailable,
              deliveryCoverageType: offering.deliveryCoverageType,
              deliveryZones: offering.deliveryZones,
              vendorDefaultCoverage: offering.vendor?.defaultDeliveryCoverage,
              vendorDefaultZones: offering.vendor?.defaultDeliveryZones,
            })
          }
        }
        return updated
      })

      setIsOpen(true)
    },
    [],
  )

  const removeItem = useCallback((offeringId: number) => {
    setItems((prev) => prev.filter((i) => i.offeringId !== offeringId))
  }, [])

  const updateQuantity = useCallback((offeringId: number, delta: number) => {
    setItems((prev) => {
      return prev
        .map((item) => {
          if (item.offeringId === offeringId) {
            if ((item.type === 'SERVICE' || item.type === 'PACKAGE') && delta > 0) {
              return item
            }
            const nextQty = item.quantity + delta
            return nextQty > 0 ? { ...item, quantity: nextQty } : null
          }
          return item
        })
        .filter((item): item is CartItem => item !== null)
    })
  }, [])

  const setQuantity = useCallback((offeringId: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.offeringId !== offeringId))
      return
    }
    setItems((prev) =>
      prev.map((item) =>
        item.offeringId === offeringId ? { ...item, quantity } : item,
      ),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [items])

  const value = useMemo(
    () => ({
      items,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      addBundleItems,
      removeItem,
      updateQuantity,
      setQuantity,
      clearCart,
      totalCount,
      subtotal,
    }),
    [
      items,
      isOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      addBundleItems,
      removeItem,
      updateQuantity,
      setQuantity,
      clearCart,
      totalCount,
      subtotal,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
