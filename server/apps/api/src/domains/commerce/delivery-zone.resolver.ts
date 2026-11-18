export type DeliveryZoneTag =
  | 'LAGOS_ISLAND'
  | 'LAGOS_MAINLAND'
  | 'ABUJA_METRO'
  | 'PORT_HARCOURT'
  | 'IBADAN_METRO'
  | 'NATIONWIDE'
  | 'OTHER'

export class DeliveryZoneResolver {
  static resolveZoneFromAddress(address?: string | null): DeliveryZoneTag {
    if (!address) return 'LAGOS_ISLAND'
    const normalized = address.toLowerCase()

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

    if (
      normalized.includes('ibadan') ||
      normalized.includes('bodija') ||
      normalized.includes('jericho') ||
      normalized.includes('oluyole') ||
      normalized.includes('agodi') ||
      normalized.includes('dugbe') ||
      normalized.includes('ring road') ||
      normalized.includes('samonda') ||
      normalized.includes('oyo')
    ) {
      return 'IBADAN_METRO'
    }

    if (
      normalized.includes('port harcourt') ||
      normalized.includes('trans amadi') ||
      normalized.includes('peter odili') ||
      normalized.includes('woji') ||
      normalized.includes('rivers')
    ) {
      return 'PORT_HARCOURT'
    }

    return 'OTHER'
  }

  static validateOfferingDelivery(
    offering: {
      title: string
      type: string
      deliveryAvailable?: boolean
      deliveryCoverageType?: string
      deliveryZones?: string[]
      vendor?: {
        name?: string
        defaultDeliveryCoverage?: string
        defaultDeliveryZones?: string[]
      } | null
    },
    address: string,
  ): { isDeliverable: boolean; reason?: string } {
    const isService = offering.type === 'SERVICE'

    // Physical goods explicitly marked as in-store pickup only
    if (!isService && offering.deliveryAvailable === false) {
      return {
        isDeliverable: false,
        reason: `Item '${offering.title}' is available for in-store pickup only.`,
      }
    }

    // Inherit coverage settings from vendor if offering does not define custom zones
    const hasCustomOfferingZones =
      Array.isArray(offering.deliveryZones) && offering.deliveryZones.length > 0

    const effectiveZones: string[] = hasCustomOfferingZones
      ? (offering.deliveryZones || [])
      : (offering.vendor?.defaultDeliveryZones || [])

    const effectiveCoverageType = hasCustomOfferingZones
      ? (offering.deliveryCoverageType || 'REGIONAL_ZONES')
      : (offering.vendor?.defaultDeliveryCoverage || offering.deliveryCoverageType || 'NATIONWIDE')

    if (
      effectiveCoverageType === 'NATIONWIDE' ||
      effectiveZones.length === 0
    ) {
      return { isDeliverable: true }
    }

    const coverageZones = effectiveZones.map((z) => z.toUpperCase().trim())
    if (
      coverageZones.includes('NATIONWIDE') ||
      coverageZones.includes('ALL')
    ) {
      return { isDeliverable: true }
    }

    const recipientZone = this.resolveZoneFromAddress(address)
    if (coverageZones.includes(recipientZone)) {
      return { isDeliverable: true }
    }

    const supportedList = coverageZones.map((z) => z.replace(/_/g, ' ')).join(', ')
    return {
      isDeliverable: false,
      reason: isService
        ? `Service '${offering.title}' is not available in ${recipientZone.replace(/_/g, ' ')}. Supported service areas: ${supportedList}.`
        : `Offering '${offering.title}' cannot be delivered to ${recipientZone.replace(/_/g, ' ')}. Supported delivery zones: ${supportedList}.`,
    }
  }
}
