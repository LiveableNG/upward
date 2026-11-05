import type { GoalOffering } from '../types/goals.types'

export type DeliveryZoneTag =
  | 'LAGOS_ISLAND'
  | 'LAGOS_MAINLAND'
  | 'ABUJA_METRO'
  | 'NATIONWIDE'
  | 'OTHER'

export interface UserDeliveryLocation {
  address: string
  zoneTag: DeliveryZoneTag
  label: string
  isRentalDefault?: boolean
}

export const PRESET_DELIVERY_ZONES: Array<{ tag: DeliveryZoneTag; label: string; description: string }> = [
  {
    tag: 'LAGOS_ISLAND',
    label: 'Lagos Island',
    description: 'Victoria Island, Ikoyi, Lekki Phase 1, Ajah, Oniru',
  },
  {
    tag: 'LAGOS_MAINLAND',
    label: 'Lagos Mainland',
    description: 'Ikeja, Surulere, Yaba, Maryland, Magodo, Ilupeju',
  },
  {
    tag: 'ABUJA_METRO',
    label: 'Abuja Metro',
    description: 'Maitama, Asokoro, Wuse, Garki, Jabi, Gwarinpa',
  },
  {
    tag: 'NATIONWIDE',
    label: 'Nationwide Delivery',
    description: 'All other states and metropolitan areas in Nigeria',
  },
]

/**
 * Derives a zone tag from any raw address string.
 */
export function resolveDeliveryZone(address?: string | null): DeliveryZoneTag {
  if (!address) return 'LAGOS_ISLAND'
  const normalized = address.toLowerCase()

  // Lagos Island check
  if (
    normalized.includes('victoria island') ||
    normalized.includes(' vi ') ||
    normalized.endsWith(' vi') ||
    normalized.includes('ikoyi') ||
    normalized.includes('lekki') ||
    normalized.includes('ajah') ||
    normalized.includes('oniru') ||
    normalized.includes('marina') ||
    normalized.includes('lagos island') ||
    normalized.includes('banana island') ||
    normalized.includes('chevron') ||
    normalized.includes('sangotedo')
  ) {
    return 'LAGOS_ISLAND'
  }

  // Lagos Mainland check
  if (
    normalized.includes('ikeja') ||
    normalized.includes('surulere') ||
    normalized.includes('yaba') ||
    normalized.includes('maryland') ||
    normalized.includes('magodo') ||
    normalized.includes('gbagada') ||
    normalized.includes('ogudu') ||
    normalized.includes('ilupeju') ||
    normalized.includes('festac') ||
    normalized.includes('alausa') ||
    normalized.includes('ojodu') ||
    normalized.includes('mainland') ||
    normalized.includes('anthony') ||
    normalized.includes('shomolu')
  ) {
    return 'LAGOS_MAINLAND'
  }

  // Abuja Metro check
  if (
    normalized.includes('abuja') ||
    normalized.includes('maitama') ||
    normalized.includes('asokoro') ||
    normalized.includes('wuse') ||
    normalized.includes('garki') ||
    normalized.includes('jabi') ||
    normalized.includes('gwarinpa') ||
    normalized.includes('guzape') ||
    normalized.includes('fct')
  ) {
    return 'ABUJA_METRO'
  }

  // Default to nationwide/other
  return 'OTHER'
}

/**
 * Formats a short location title for the persistent header bar.
 */
export function formatShortLocation(location: UserDeliveryLocation): string {
  if (location.label && location.label !== location.address) {
    return location.label
  }
  const parts = location.address.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`
  }
  return location.address || 'Selected Location'
}

/**
 * Checks if a physical offering or package can be delivered to the user's location.
 */
export function isOfferingDeliverableToLocation(
  offering: GoalOffering,
  location: UserDeliveryLocation,
): { isDeliverable: boolean; reason?: string } {
  // Services are appointment or execution based
  if (offering.type === 'SERVICE') {
    return { isDeliverable: true }
  }

  // Explicitly marked as no delivery available
  if (offering.deliveryAvailable === false) {
    return {
      isDeliverable: false,
      reason: 'In-store pickup only. Home delivery unavailable.',
    }
  }

  // If nationwide or no specific zones configured, deliverable everywhere
  if (
    !offering.deliveryCoverageType ||
    offering.deliveryCoverageType === 'NATIONWIDE' ||
    !offering.deliveryZones ||
    offering.deliveryZones.length === 0
  ) {
    return { isDeliverable: true }
  }

  // Regional zones enforcement
  const coverageZones = offering.deliveryZones.map((z) => z.toUpperCase())
  if (coverageZones.includes('NATIONWIDE') || coverageZones.includes('ALL')) {
    return { isDeliverable: true }
  }

  const userZone = location.zoneTag
  if (coverageZones.includes(userZone)) {
    return { isDeliverable: true }
  }

  // Build human-friendly zone names
  const friendlyNames = coverageZones
    .map((z) => {
      const match = PRESET_DELIVERY_ZONES.find((p) => p.tag === z)
      return match ? match.label : z.replace('_', ' ')
    })
    .join(', ')

  return {
    isDeliverable: false,
    reason: `Delivery only available in ${friendlyNames}`,
  }
}

const STORAGE_KEY = 'upward_lifestyle_delivery_loc'

export function getStoredDeliveryLocation(defaultAddress?: string | null): UserDeliveryLocation {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // ignore JSON parse errors
    }
  }

  // Fallback to tenant's verified lease address or default Lagos Island
  const address = defaultAddress?.trim() || 'Victoria Island, Lagos'
  const zoneTag = resolveDeliveryZone(address)
  const zonePreset = PRESET_DELIVERY_ZONES.find((z) => z.tag === zoneTag)

  return {
    address,
    zoneTag,
    label: zonePreset?.label || 'Your Rental Address',
    isRentalDefault: true,
  }
}

export function saveStoredDeliveryLocation(loc: UserDeliveryLocation): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
    } catch {
      // ignore
    }
  }
}
