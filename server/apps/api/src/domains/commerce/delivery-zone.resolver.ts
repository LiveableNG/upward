export type DeliveryZoneTag =
  | 'LAGOS_ISLAND'
  | 'LAGOS_MAINLAND'
  | 'ABUJA_METRO'
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

    return 'OTHER'
  }

  static validateOfferingDelivery(
    offering: {
      title: string
      type: string
      deliveryAvailable?: boolean
      deliveryCoverageType?: string
      deliveryZones?: string[]
    },
    address: string,
  ): { isDeliverable: boolean; reason?: string } {
    if (offering.type === 'SERVICE') {
      return { isDeliverable: true }
    }

    if (offering.deliveryAvailable === false) {
      return {
        isDeliverable: false,
        reason: `Item '${offering.title}' is available for in-store pickup only.`,
      }
    }

    if (
      !offering.deliveryCoverageType ||
      offering.deliveryCoverageType === 'NATIONWIDE' ||
      !offering.deliveryZones ||
      offering.deliveryZones.length === 0
    ) {
      return { isDeliverable: true }
    }

    const coverageZones = offering.deliveryZones.map((z) => z.toUpperCase())
    if (coverageZones.includes('NATIONWIDE') || coverageZones.includes('ALL')) {
      return { isDeliverable: true }
    }

    const recipientZone = this.resolveZoneFromAddress(address)
    if (coverageZones.includes(recipientZone)) {
      return { isDeliverable: true }
    }

    return {
      isDeliverable: false,
      reason: `Offering '${offering.title}' cannot be delivered to ${recipientZone.replace('_', ' ')}. Supported delivery zones: ${coverageZones.join(', ')}.`,
    }
  }
}
