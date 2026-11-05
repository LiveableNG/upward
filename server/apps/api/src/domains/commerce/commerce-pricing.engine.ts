export interface PriceableOfferingComponent {
  componentId: number
  componentUuid?: string
  componentTitle: string
  quantity: number
  overridePrice?: number | null
  vendorId?: number | null
}

export interface PriceableOffering {
  id: number
  uuid: string
  vendorId?: number | null
  type: string // 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'BUNDLE'
  pricingModel: string // 'FIXED' | 'RANGE' | 'STARTING_AT' | 'QUOTE_REQUIRED'
  title: string
  subtitle?: string | null
  description?: string | null
  currency: string
  price?: number | null
  inStock: boolean
  stockCount?: number | null
  deliveryAvailable: boolean
  leadTimeDays?: number | null
  status: string // 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  vendor?: {
    id: number
    uuid: string
    name: string
    slug: string
    logoUrl?: string | null
    email?: string | null
    phone?: string | null
    rating: number
    isActive: boolean
  } | null
  packageItems?: PriceableOfferingComponent[]
}

export interface PriceableItemInput {
  offering: PriceableOffering
  quantity: number
  deliveryFeeKobo?: bigint
}

export interface CalculatedItemSnapshot {
  offeringId: number
  offeringUuid: string
  title: string
  subtitle: string | null
  description: string | null
  type: string
  pricingModel: string
  unitPriceKobo: string
  currency: string
  deliveryAvailable: boolean
  leadTimeDays: number | null
  vendor: {
    id: number
    uuid: string
    name: string
    slug: string
    logoUrl: string | null
    rating: number
  }
  packageItemsSnapshot: Array<{
    componentId: number
    componentUuid?: string
    componentTitle: string
    quantity: number
    overridePrice: number | null
  }>
}

export interface CalculatedSubOrderItem {
  offeringId: number
  offeringType: string
  quantity: number
  unitPriceKobo: bigint
  totalPriceKobo: bigint
  snapshotData: CalculatedItemSnapshot
}

export interface CalculatedVendorSubOrder {
  vendorId: number
  vendor: {
    id: number
    uuid: string
    name: string
    slug: string
    logoUrl: string | null
    email?: string | null
    phone?: string | null
    rating: number
  }
  subtotalKobo: bigint
  deliveryFeeKobo: bigint
  allocatedDiscountKobo: bigint
  platformFeeKobo: bigint // Upward commission
  vendorPayoutKobo: bigint // Net payable to vendor
  items: CalculatedSubOrderItem[]
}

export interface PricingCalculationResult {
  currency: string
  itemsSubtotalKobo: bigint
  deliveryFeeKobo: bigint
  taxKobo: bigint
  discountKobo: bigint
  totalAmountKobo: bigint
  subOrders: CalculatedVendorSubOrder[]
}

export class CommercePricingEngine {
  public static readonly DEFAULT_COMMISSION_BPS = 1000 // 10.00% standard platform commission

  /**
   * Pure calculation engine for pricing, decomposition, and discount allocation.
   * preview and order creation MUST use this exact engine.
   */
  public static calculateOrderPricing(params: {
    items: PriceableItemInput[]
    totalDiscountKobo?: bigint
    commissionBps?: number
    taxKobo?: bigint
  }): PricingCalculationResult {
    const {
      items,
      totalDiscountKobo = 0n,
      commissionBps = CommercePricingEngine.DEFAULT_COMMISSION_BPS,
      taxKobo = 0n,
    } = params

    if (!items || items.length === 0) {
      throw new Error('ORDER_PRICING_EMPTY_ITEMS: At least one item is required for pricing calculation')
    }

    // 1. Validate each offering and build line item pricing
    const vendorMap = new Map<number, CalculatedVendorSubOrder>()

    for (const { offering, quantity, deliveryFeeKobo = 0n } of items) {
      if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
        throw new Error(`ORDER_PRICING_INVALID_QUANTITY: Invalid quantity ${quantity} for offering "${offering.title}"`)
      }

      if (offering.status !== 'PUBLISHED') {
        throw new Error(`ORDER_PRICING_OFFERING_UNPUBLISHED: Offering "${offering.title}" is not published`)
      }

      if (!offering.inStock) {
        throw new Error(`ORDER_PRICING_OFFERING_OUT_OF_STOCK: Offering "${offering.title}" is currently out of stock`)
      }

      if (offering.pricingModel === 'QUOTE_REQUIRED') {
        throw new Error(`ORDER_PRICING_QUOTE_REQUIRED: Offering "${offering.title}" requires a custom quote and cannot be checked out directly`)
      }

      if (offering.price === null || offering.price === undefined || offering.price <= 0) {
        throw new Error(`ORDER_PRICING_INVALID_PRICE: Offering "${offering.title}" has an invalid price configuration`)
      }

      if (!offering.vendorId || !offering.vendor) {
        throw new Error(`ORDER_PRICING_NO_VENDOR: Offering "${offering.title}" is not linked to a valid vendor`)
      }

      if (!offering.vendor.isActive) {
        throw new Error(`ORDER_PRICING_INACTIVE_VENDOR: Vendor "${offering.vendor.name}" is currently inactive`)
      }

      // Single-vendor package enforcement
      if (offering.type === 'PACKAGE' || offering.type === 'BUNDLE') {
        if (offering.packageItems && offering.packageItems.length > 0) {
          for (const comp of offering.packageItems) {
            if (comp.vendorId && comp.vendorId !== offering.vendorId) {
              throw new Error(
                `ORDER_PRICING_MULTI_VENDOR_PACKAGE_VIOLATION: Package "${offering.title}" contains component "${comp.componentTitle}" from vendor ID ${comp.vendorId}, which differs from package vendor ID ${offering.vendorId}`,
              )
            }
          }
        }
      }

      // Convert unit price float to integer kobo
      const unitPriceKobo = BigInt(Math.round(offering.price * 100))
      const totalPriceKobo = unitPriceKobo * BigInt(quantity)

      // Build immutable point-in-time snapshot
      const snapshot: CalculatedItemSnapshot = {
        offeringId: offering.id,
        offeringUuid: offering.uuid,
        title: offering.title,
        subtitle: offering.subtitle ?? null,
        description: offering.description ?? null,
        type: offering.type,
        pricingModel: offering.pricingModel,
        unitPriceKobo: unitPriceKobo.toString(),
        currency: offering.currency || 'NGN',
        deliveryAvailable: offering.deliveryAvailable,
        leadTimeDays: offering.leadTimeDays ?? null,
        vendor: {
          id: offering.vendor.id,
          uuid: offering.vendor.uuid,
          name: offering.vendor.name,
          slug: offering.vendor.slug,
          logoUrl: offering.vendor.logoUrl ?? null,
          rating: offering.vendor.rating,
        },
        packageItemsSnapshot: offering.packageItems?.map((pi) => ({
          componentId: pi.componentId,
          componentUuid: pi.componentUuid,
          componentTitle: pi.componentTitle,
          quantity: pi.quantity,
          overridePrice: pi.overridePrice ?? null,
        })) ?? [],
      }

      const calculatedItem: CalculatedSubOrderItem = {
        offeringId: offering.id,
        offeringType: offering.type,
        quantity,
        unitPriceKobo,
        totalPriceKobo,
        snapshotData: snapshot,
      }

      // Group into Vendor Sub-Order
      const vendorId = offering.vendorId
      let subOrder = vendorMap.get(vendorId)
      if (!subOrder) {
        subOrder = {
          vendorId,
          vendor: {
            id: offering.vendor.id,
            uuid: offering.vendor.uuid,
            name: offering.vendor.name,
            slug: offering.vendor.slug,
            logoUrl: offering.vendor.logoUrl ?? null,
            email: offering.vendor.email ?? null,
            phone: offering.vendor.phone ?? null,
            rating: offering.vendor.rating,
          },
          subtotalKobo: 0n,
          deliveryFeeKobo: 0n,
          allocatedDiscountKobo: 0n,
          platformFeeKobo: 0n,
          vendorPayoutKobo: 0n,
          items: [],
        }
        vendorMap.set(vendorId, subOrder)
      }

      subOrder.items.push(calculatedItem)
      subOrder.subtotalKobo += totalPriceKobo
      if (deliveryFeeKobo > 0n) {
        subOrder.deliveryFeeKobo += deliveryFeeKobo
      }
    }

    const subOrders = Array.from(vendorMap.values())

    // 2. Sum Items Subtotal across all vendor sub-orders
    const itemsSubtotalKobo = subOrders.reduce((acc, sub) => acc + sub.subtotalKobo, 0n)

    // 3. Discount Allocation using Largest Remainder Method
    // Cap discount at total merchandise subtotal
    const effectiveTotalDiscountKobo =
      totalDiscountKobo > itemsSubtotalKobo ? itemsSubtotalKobo : totalDiscountKobo

    if (effectiveTotalDiscountKobo > 0n && itemsSubtotalKobo > 0n) {
      const discountFloat = Number(effectiveTotalDiscountKobo)
      const subtotalFloat = Number(itemsSubtotalKobo)

      let allocatedSum = 0n
      const remainders: Array<{ index: number; remainder: number }> = []

      for (const [i, sub] of subOrders.entries()) {
        const subFloat = Number(sub.subtotalKobo)
        const rawDiscount = (subFloat / subtotalFloat) * discountFloat
        const baseDiscount = BigInt(Math.floor(rawDiscount))
        const rem = rawDiscount - Math.floor(rawDiscount)

        sub.allocatedDiscountKobo = baseDiscount
        allocatedSum += baseDiscount
        remainders.push({ index: i, remainder: rem })
      }

      // Distribute remaining kobo to largest remainders
      let unallocatedKobo = Number(effectiveTotalDiscountKobo - allocatedSum)
      remainders.sort((a, b) => b.remainder - a.remainder || a.index - b.index)

      for (let i = 0; i < unallocatedKobo; i++) {
        const target = remainders[i % remainders.length]
        if (target !== undefined) {
          const subTarget = subOrders[target.index]
          if (subTarget !== undefined) {
            subTarget.allocatedDiscountKobo += 1n
          }
        }
      }

      // Verification of invariant: sum(allocated) === effectiveTotalDiscountKobo
      const verifySum = subOrders.reduce((acc, sub) => acc + sub.allocatedDiscountKobo, 0n)
      if (verifySum !== effectiveTotalDiscountKobo) {
        throw new Error(`ORDER_PRICING_RECONCILIATION_FAILED: Allocated discount (${verifySum}) does not match total discount (${effectiveTotalDiscountKobo})`)
      }
    } else {
      for (const sub of subOrders) {
        sub.allocatedDiscountKobo = 0n
      }
    }

    // 4. Commission & Vendor Net Payable Calculations per Sub-order
    for (const sub of subOrders) {
      const effectiveMerchandise = sub.subtotalKobo - sub.allocatedDiscountKobo
      const commissionKobo = BigInt(
        Math.round((Number(effectiveMerchandise) * commissionBps) / 10000),
      )
      sub.platformFeeKobo = commissionKobo
      sub.vendorPayoutKobo = effectiveMerchandise + sub.deliveryFeeKobo - commissionKobo
    }

    // 5. Grand Totals
    const totalDeliveryFeeKobo = subOrders.reduce((acc, sub) => acc + sub.deliveryFeeKobo, 0n)
    const grandDiscountKobo = effectiveTotalDiscountKobo
    const totalAmountKobo = itemsSubtotalKobo + totalDeliveryFeeKobo + taxKobo - grandDiscountKobo

    return {
      currency: 'NGN',
      itemsSubtotalKobo,
      deliveryFeeKobo: totalDeliveryFeeKobo,
      taxKobo,
      discountKobo: grandDiscountKobo,
      totalAmountKobo,
      subOrders,
    }
  }
}
