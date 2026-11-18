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
  deliveryFeeKobo?: string | null
  specificAddress?: string
  landmark?: string
  driverNotes?: string
}

// Dynamic database-driven delivery zones: no hardcoded mock fallback zones
export const PRESET_DELIVERY_ZONES: DeliveryZoneItem[] = []

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
  deliveryFeeKobo?: string | null
  isSupported: boolean
} {
  // If no delivery zones have been configured yet:
  if (!configuredZones || configuredZones.length === 0) {
    return {
      zoneTag: 'UNCONFIGURED',
      zoneName: address || 'No Coverage Configured',
      state: 'N/A',
      isDelivering: false,
      pauseReason: "We're currently working towards expanding our coverage to reach your location soon!",
      deliveryFeeKobo: '0',
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
      deliveryFeeKobo: fallback.deliveryFeeKobo,
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
        deliveryFeeKobo: zone.deliveryFeeKobo,
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
            deliveryFeeKobo: zone.deliveryFeeKobo,
            isSupported: true,
          }
        }
      }
    }
  }

  // 3. Match with state from database configured zones
  for (const zone of configuredZones) {
    if (zone.state && zone.state.toLowerCase() !== 'n/a') {
      const stateLower = zone.state.toLowerCase()
      if (normalized.includes(stateLower)) {
        return {
          zoneTag: zone.tag,
          zoneName: zone.name,
          state: zone.state,
          isDelivering: zone.isDelivering,
          pauseReason: zone.pauseReason,
          deliveryFeeKobo: zone.deliveryFeeKobo,
          isSupported: true,
        }
      }
    }
  }

  // If completely uncovered location:
  return {
    zoneTag: 'UNCOVERED',
    zoneName: address || 'Your Location',
    state: 'Unknown',
    isDelivering: false,
    pauseReason: "We're currently working towards expanding our delivery coverage to reach your location soon!",
    deliveryFeeKobo: '0',
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
 * Safely parses kobo (from string, number, or bigint) into Naira without throwing SyntaxError.
 */
export function parseKoboToNgn(koboVal?: string | number | bigint | null): number {
  if (koboVal == null) return 0
  try {
    const str = String(koboVal).split('.')[0].trim()
    if (!str || str === 'NaN' || str === 'undefined' || str === 'null') return 0
    return Number(BigInt(str) / BigInt(100))
  } catch {
    const num = Number(koboVal)
    return isNaN(num) ? 0 : Math.round(num / 100)
  }
}

/**
 * Checks whether an offering or cart item can be fulfilled in a given zone tag.
 */
export function isItemDeliverableToZone(
  item: {
    type?: string
    deliveryAvailable?: boolean
    deliveryCoverageType?: string
    deliveryZones?: string[]
    vendorDefaultCoverage?: string
    vendorDefaultZones?: string[]
    vendor?: {
      defaultDeliveryCoverage?: string
      defaultDeliveryZones?: string[]
    } | null
  },
  zoneTag?: string | null,
): boolean {
  if (!zoneTag || zoneTag === 'UNCONFIGURED' || zoneTag === 'UNCOVERED') {
    return false
  }

  const isService = item.type === 'SERVICE'
  if (!isService && item.deliveryAvailable === false) {
    return false
  }

  const hasCustomZones =
    Array.isArray(item.deliveryZones) && item.deliveryZones.length > 0

  const effectiveZones: string[] = hasCustomZones
    ? (item.deliveryZones || [])
    : (item.vendorDefaultZones || item.vendor?.defaultDeliveryZones || [])

  const effectiveCoverage = hasCustomZones
    ? (item.deliveryCoverageType || 'REGIONAL_ZONES')
    : (item.vendorDefaultCoverage || item.vendor?.defaultDeliveryCoverage || item.deliveryCoverageType || 'NATIONWIDE')

  if (effectiveCoverage === 'NATIONWIDE' || effectiveZones.length === 0) {
    return true
  }

  const coverageZones = effectiveZones.map((z) => z.toUpperCase().trim())
  if (coverageZones.includes('NATIONWIDE') || coverageZones.includes('ALL')) {
    return true
  }

  const tag = zoneTag.toUpperCase().trim()
  return coverageZones.includes(tag)
}

/**
 * Checks whether a specific delivery zone is covered by an offering or vendor.
 */
export function isZoneSupportedByOffering(
  zoneOrTag: string | DeliveryZoneItem,
  offering?: GoalOffering | null,
): boolean {
  if (!offering) return true
  const zoneTag = typeof zoneOrTag === 'string' ? zoneOrTag : zoneOrTag?.tag
  return isItemDeliverableToZone(offering, zoneTag)
}

/**
 * Checks if a physical offering or service can be delivered / serviced at the user's location.
 */
export function isOfferingDeliverableToLocation(
  offering: GoalOffering,
  location?: UserDeliveryLocation | null,
): { isDeliverable: boolean; reason?: string } {
  const isService = offering.type === 'SERVICE'

  const hasCustomOfferingZones =
    Array.isArray(offering.deliveryZones) && offering.deliveryZones.length > 0

  const rawVendorZones =
    offering.vendor?.defaultDeliveryZones ||
    (offering as any).vendorDefaultZones ||
    []

  // Inherit coverage settings from vendor if offering does not define custom zones
  const effectiveZones: string[] =
    (hasCustomOfferingZones
      ? offering.deliveryZones
      : rawVendorZones) || []

  const rawVendorCoverage =
    offering.vendor?.defaultDeliveryCoverage ||
    (offering as any).vendorDefaultCoverage

  const effectiveCoverageType = hasCustomOfferingZones
    ? (offering.deliveryCoverageType || 'REGIONAL_ZONES')
    : (rawVendorCoverage || offering.deliveryCoverageType || 'NATIONWIDE')

  // 1. Explicitly marked as no home delivery / in-store pickup only (physical products only)
  // For services, appointments/visits are governed by the vendor operating zones or nationwide policy
  if (!isService && offering.deliveryAvailable === false) {
    return {
      isDeliverable: false,
      reason: 'In-store pickup only. Home delivery unavailable.',
    }
  }

  // 2. If nationwide or no specific zones configured: available everywhere
  if (
    effectiveCoverageType === 'NATIONWIDE' ||
    effectiveZones.length === 0
  ) {
    return { isDeliverable: true }
  }

  // 3. Regional zones enforcement
  const coverageZones = effectiveZones.map((z) => z.toUpperCase().trim())
  if (
    coverageZones.includes('NATIONWIDE') ||
    coverageZones.includes('ALL')
  ) {
    return { isDeliverable: true }
  }

  // If no user location has been configured yet: show friendly expansion message
  if (!location || !location.zoneTag || location.zoneTag === 'UNCONFIGURED') {
    return {
      isDeliverable: false,
      reason:
        location?.pauseReason ||
        (isService
          ? "We're working towards expanding our service coverage to reach your location soon!"
          : "We're working towards expanding our delivery coverage to reach your location soon!"),
    }
  }

  // 4. Regional zone matching
  const userTag = (location.zoneTag || '').toUpperCase().trim()
  const isMatched = coverageZones.includes(userTag)

  if (isMatched) {
    if (location.isDelivering === false && location.pauseReason) {
      return {
        isDeliverable: false,
        reason: location.pauseReason,
      }
    }
    return { isDeliverable: true }
  }

  // Build friendly, human-readable zone names in clean Title Case
  const friendlyNames = coverageZones
    .map((z) =>
      z
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    )
    .join(', ')

  return {
    isDeliverable: false,
    reason:
      location.zoneTag === 'UNCOVERED'
        ? (isService
            ? `We're working towards expanding service coverage to reach ${formatShortLocation(location)} soon!`
            : `We're working towards expanding delivery coverage to reach ${formatShortLocation(location)} soon!`)
        : (isService
            ? `Service is only available in ${friendlyNames}`
            : `Delivery is only available in ${friendlyNames}`),
  }
}

const STORAGE_KEY = 'upward_lifestyle_delivery_loc'

export function getStoredDeliveryLocation(
  defaultAddress?: string | null,
  configuredZones: DeliveryZoneItem[] = [],
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
          parsed.deliveryFeeKobo = matched.deliveryFeeKobo
        }
        return parsed
      }
    } catch {
      // ignore
    }
  }

  // If no delivery zones have been set up in admin yet:
  if (!configuredZones || configuredZones.length === 0) {
    return {
      address: defaultAddress?.trim() || 'No Delivery Address Set',
      zoneTag: 'UNCONFIGURED',
      zoneName: 'Coverage Pending',
      state: 'N/A',
      isDelivering: false,
      pauseReason: "We're working towards expanding our coverage to reach your location soon!",
      deliveryFeeKobo: '0',
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
    deliveryFeeKobo: zonePreset?.deliveryFeeKobo || resolution.deliveryFeeKobo || '0',
    label: zonePreset?.name || 'Your Rental Address',
    isRentalDefault: Boolean(defaultAddress),
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
