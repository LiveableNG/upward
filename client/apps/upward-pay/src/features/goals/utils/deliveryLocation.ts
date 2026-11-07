import type { GoalOffering } from '../types/goals.types'

export type DeliveryZoneTag =
  | 'LAGOS_ISLAND'
  | 'LAGOS_MAINLAND'
  | 'ABUJA_METRO'
  | 'PORT_HARCOURT'
  | 'NATIONWIDE'
  | 'OTHER'
  | string

export interface DeliveryZoneItem {
  tag: string
  name: string
  state: string
  region?: string | null
  areasCovered?: string | null
  isDelivering: boolean
  deliveryFeeKobo?: string
  estimatedDeliveryDays?: string | null
  pauseReason?: string | null
  sortOrder?: number
}

export interface UserDeliveryLocation {
  address: string
  zoneTag: string
  zoneName?: string
  state?: string
  isDelivering: boolean
  label: string
  isRentalDefault?: boolean
  pauseReason?: string | null
  specificAddress?: string
  landmark?: string
  driverNotes?: string
}

export const PRESET_DELIVERY_ZONES: DeliveryZoneItem[] = [
  {
    tag: 'LAGOS_ISLAND',
    name: 'Lagos Island (Ikoyi / VI / Lekki Phase 1)',
    state: 'Lagos',
    region: 'Island',
    areasCovered: 'Victoria Island, Ikoyi, Lekki Phase 1, Oniru, Marina, Banana Island, Ajah',
    isDelivering: true,
    estimatedDeliveryDays: 'Same-day or next-day delivery',
    sortOrder: 1,
  },
  {
    tag: 'LAGOS_MAINLAND',
    name: 'Lagos Mainland (Ikeja / Surulere / Yaba)',
    state: 'Lagos',
    region: 'Mainland',
    areasCovered: 'Ikeja, Surulere, Yaba, Maryland, Magodo, Gbagada, Ogudu, Ilupeju, Anthony',
    isDelivering: true,
    estimatedDeliveryDays: '1 - 2 business days',
    sortOrder: 2,
  },
  {
    tag: 'ABUJA_METRO',
    name: 'Abuja Metro (Maitama / Wuse II / Asokoro)',
    state: 'FCT Abuja',
    region: 'Metropolis',
    areasCovered: 'Maitama, Asokoro, Wuse 2, Central Business District, Garki, Jabi, Gwarinpa, Guzape',
    isDelivering: true,
    estimatedDeliveryDays: '2 - 3 business days',
    sortOrder: 3,
  },
  {
    tag: 'PORT_HARCOURT',
    name: 'Port Harcourt (GRA Phases 1-3 / Trans-Amadi)',
    state: 'Rivers',
    region: 'South South',
    areasCovered: 'Old GRA, New GRA, Peter Odili, Trans-Amadi, Woji, Rumuola',
    isDelivering: false,
    pauseReason: 'Upcoming launch region — rollout scheduled soon',
    estimatedDeliveryDays: 'Coming Soon',
    sortOrder: 4,
  },
]

/**
 * Derives a matched zone from any raw address or search query against available configured zones.
 */
export function resolveDeliveryZone(
  address?: string | null,
  configuredZones: DeliveryZoneItem[] = [],
): {
  zoneTag: string
  zoneName: string
  state: string
  isDelivering: boolean
  pauseReason?: string | null
  isSupported: boolean
} {
  // If no delivery zones have been set up in admin yet:
  if (!configuredZones || configuredZones.length === 0) {
    return {
      zoneTag: 'UNCONFIGURED',
      zoneName: 'No Coverage Configured',
      state: 'N/A',
      isDelivering: false,
      pauseReason: 'We are working towards expanding our delivery coverage to other locations soon!',
      isSupported: false,
    }
  }

  const fallback = configuredZones[0]
  if (!address || !address.trim()) {
    return {
      zoneTag: fallback.tag,
      zoneName: fallback.name,
      state: fallback.state,
      isDelivering: fallback.isDelivering,
      pauseReason: fallback.pauseReason,
      isSupported: fallback.isDelivering,
    }
  }

  const normalized = address.toLowerCase().trim()

  // 1. Exact or partial match with tag or name
  for (const zone of configuredZones) {
    if (
      zone.tag.toLowerCase() === normalized ||
      zone.name.toLowerCase() === normalized ||
      normalized.includes(zone.name.toLowerCase())
    ) {
      return {
        zoneTag: zone.tag,
        zoneName: zone.name,
        state: zone.state,
        isDelivering: zone.isDelivering,
        pauseReason: zone.pauseReason,
        isSupported: true,
      }
    }
  }

  // 2. Match with covered areas keywords
  for (const zone of configuredZones) {
    if (zone.areasCovered) {
      const areas = zone.areasCovered
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean)
      for (const area of areas) {
        if (normalized.includes(area) || area.includes(normalized)) {
          return {
            zoneTag: zone.tag,
            zoneName: zone.name,
            state: zone.state,
            isDelivering: zone.isDelivering,
            pauseReason: zone.pauseReason,
            isSupported: true,
          }
        }
      }
    }
  }

  // 3. Fallback heuristics for common Nigerian states/cities
  if (
    normalized.includes('victoria island') ||
    normalized.includes(' vi ') ||
    normalized.endsWith(' vi') ||
    normalized.includes('ikoyi') ||
    normalized.includes('lekki') ||
    normalized.includes('ajah') ||
    normalized.includes('oniru') ||
    normalized.includes('banana island')
  ) {
    const lagosIsland = configuredZones.find((z) => z.tag === 'LAGOS_ISLAND') || PRESET_DELIVERY_ZONES[0]
    return {
      zoneTag: lagosIsland.tag,
      zoneName: lagosIsland.name,
      state: lagosIsland.state,
      isDelivering: lagosIsland.isDelivering,
      pauseReason: lagosIsland.pauseReason,
      isSupported: true,
    }
  }

  if (
    normalized.includes('ikeja') ||
    normalized.includes('surulere') ||
    normalized.includes('yaba') ||
    normalized.includes('maryland') ||
    normalized.includes('magodo') ||
    normalized.includes('gbagada') ||
    normalized.includes('ogudu') ||
    normalized.includes('ilupeju') ||
    normalized.includes('festac')
  ) {
    const lagosMainland = configuredZones.find((z) => z.tag === 'LAGOS_MAINLAND') || PRESET_DELIVERY_ZONES[1]
    return {
      zoneTag: lagosMainland.tag,
      zoneName: lagosMainland.name,
      state: lagosMainland.state,
      isDelivering: lagosMainland.isDelivering,
      pauseReason: lagosMainland.pauseReason,
      isSupported: true,
    }
  }

  if (
    normalized.includes('abuja') ||
    normalized.includes('maitama') ||
    normalized.includes('asokoro') ||
    normalized.includes('wuse') ||
    normalized.includes('garki') ||
    normalized.includes('fct')
  ) {
    const abuja = configuredZones.find((z) => z.tag === 'ABUJA_METRO') || PRESET_DELIVERY_ZONES[2]
    return {
      zoneTag: abuja.tag,
      zoneName: abuja.name,
      state: abuja.state,
      isDelivering: abuja.isDelivering,
      pauseReason: abuja.pauseReason,
      isSupported: true,
    }
  }

  if (
    normalized.includes('port harcourt') ||
    normalized.includes('rivers') ||
    normalized.includes('trans amadi')
  ) {
    const ph = configuredZones.find((z) => z.tag === 'PORT_HARCOURT') || PRESET_DELIVERY_ZONES[3]
    return {
      zoneTag: ph.tag,
      zoneName: ph.name,
      state: ph.state,
      isDelivering: ph.isDelivering,
      pauseReason: ph.pauseReason,
      isSupported: true,
    }
  }

  // If completely uncovered location:
  return {
    zoneTag: 'UNCOVERED',
    zoneName: address,
    state: 'Unknown',
    isDelivering: false,
    pauseReason: 'We are working towards expanding our delivery coverage to other locations soon!',
    isSupported: false,
  }
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
  return location.address || location.zoneName || 'Selected Location'
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

  // Location itself is not currently receiving deliveries
  if (location.isDelivering === false) {
    return {
      isDeliverable: false,
      reason:
        location.pauseReason ||
        'Delivery is not currently supported or is suspended for this location.',
    }
  }

  // Explicitly marked as no delivery available
  if (offering.deliveryAvailable === false) {
    return {
      isDeliverable: false,
      reason: 'In-store pickup only. Home delivery unavailable.',
    }
  }

  // If nationwide or no specific zones configured, deliverable everywhere supported
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

  const userZone = location.zoneTag?.toUpperCase()
  if (coverageZones.includes(userZone)) {
    return { isDeliverable: true }
  }

  // Build friendly zone names
  const friendlyNames = coverageZones
    .map((z) => {
      const match = PRESET_DELIVERY_ZONES.find((p) => p.tag === z)
      return match ? match.name : z.replace(/_/g, ' ')
    })
    .join(', ')

  return {
    isDeliverable: false,
    reason: `Delivery only available in ${friendlyNames}`,
  }
}

const STORAGE_KEY = 'upward_lifestyle_delivery_loc'

export function getStoredDeliveryLocation(
  defaultAddress?: string | null,
  configuredZones: DeliveryZoneItem[] = PRESET_DELIVERY_ZONES,
): UserDeliveryLocation {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Ensure isDelivering is reflected accurately from latest configured zones if matching
        const matched = configuredZones.find((z) => z.tag === parsed.zoneTag)
        if (matched) {
          parsed.isDelivering = matched.isDelivering
          parsed.pauseReason = matched.pauseReason
          parsed.zoneName = matched.name
        }
        return parsed
      }
    } catch {
      // ignore
    }
  }

  if (!configuredZones || configuredZones.length === 0) {
    return {
      address: defaultAddress?.trim() || 'No Delivery Address Set',
      zoneTag: 'UNCONFIGURED',
      zoneName: 'No Coverage Configured',
      state: 'N/A',
      isDelivering: false,
      pauseReason: 'We are working towards expanding our delivery coverage to other locations soon!',
      label: 'Coverage Pending',
      isRentalDefault: false,
    }
  }

  // Fallback to tenant's verified lease address or first available zone
  const address = defaultAddress?.trim() || configuredZones[0]?.name || 'Nigeria'
  const resolution = resolveDeliveryZone(address, configuredZones)
  const zonePreset = configuredZones.find((z) => z.tag === resolution.zoneTag)

  return {
    address,
    zoneTag: resolution.zoneTag,
    zoneName: zonePreset?.name || resolution.zoneName,
    state: resolution.state,
    isDelivering: resolution.isDelivering,
    pauseReason: resolution.pauseReason,
    label: zonePreset?.name || 'Your Rental Address',
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
