import {
  DeliveryZoneResolver,
  DeliveryZoneTag,
} from '../../../../../src/domains/commerce/delivery-zone.resolver'

describe('Phase 1: Location Exclusivity & Delivery Coverage Engine', () => {
  describe('DeliveryZoneResolver.resolveZoneFromAddress', () => {
    it('correctly maps Lagos Island addresses to LAGOS_ISLAND', () => {
      const addresses = [
        '14 Adeleke Street, Victoria Island, Lagos',
        'Plot 8 Admiralty Way, Lekki Phase 1, Lagos',
        '25 Glover Road, Ikoyi, Lagos',
        'Block 3, Oniru Estate, Lagos',
        'Banana Island Estate, Ikoyi',
        '10 Marina Road, Lagos Island',
        'Chevron Drive, Lekki, Lagos',
      ]

      addresses.forEach((addr) => {
        expect(DeliveryZoneResolver.resolveZoneFromAddress(addr)).toBe('LAGOS_ISLAND')
      })
    })

    it('correctly maps Lagos Mainland addresses to LAGOS_MAINLAND', () => {
      const addresses = [
        '12 Allen Avenue, Ikeja, Lagos',
        '45 Bode Thomas, Surulere, Lagos',
        'Commercial Avenue, Yaba, Lagos',
        'Maryland Mall, Maryland, Lagos',
        'Magodo Phase 2, Lagos',
        'Festac Town, 2nd Avenue, Lagos',
      ]

      addresses.forEach((addr) => {
        expect(DeliveryZoneResolver.resolveZoneFromAddress(addr)).toBe('LAGOS_MAINLAND')
      })
    })

    it('correctly maps Abuja addresses to ABUJA_METRO', () => {
      const addresses = [
        'Plot 102 Gana Street, Maitama, Abuja',
        'Asokoro District, Abuja FCT',
        'Wuse 2, Aminu Kano Crescent, Abuja',
        'Jabi Lake Mall, Jabi, Abuja',
      ]

      addresses.forEach((addr) => {
        expect(DeliveryZoneResolver.resolveZoneFromAddress(addr)).toBe('ABUJA_METRO')
      })
    })

    it('defaults unknown or unspecified addresses to OTHER', () => {
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Port Harcourt, Rivers State')).toBe(
        'OTHER',
      )
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Ibadan, Oyo State')).toBe('OTHER')
    })
  })

  describe('DeliveryZoneResolver.validateOfferingDelivery', () => {
    it('always permits service offerings regardless of location', () => {
      const result = DeliveryZoneResolver.validateOfferingDelivery(
        {
          title: 'Deep House Cleaning Service',
          type: 'SERVICE',
          deliveryAvailable: false,
          deliveryCoverageType: 'REGIONAL_ZONES',
          deliveryZones: ['LAGOS_ISLAND'],
        },
        'Port Harcourt, Rivers State',
      )

      expect(result.isDeliverable).toBe(true)
    })

    it('rejects physical goods with deliveryAvailable = false as pickup only', () => {
      const result = DeliveryZoneResolver.validateOfferingDelivery(
        {
          title: 'Artisan Solid Oak Desk',
          type: 'PRODUCT',
          deliveryAvailable: false,
        },
        '14 Adeleke Street, Victoria Island, Lagos',
      )

      expect(result.isDeliverable).toBe(false)
      expect(result.reason).toContain('in-store pickup only')
    })

    it('permits physical offerings configured with NATIONWIDE coverage anywhere', () => {
      const result = DeliveryZoneResolver.validateOfferingDelivery(
        {
          title: 'Ergonomic Chair',
          type: 'PRODUCT',
          deliveryAvailable: true,
          deliveryCoverageType: 'NATIONWIDE',
          deliveryZones: [],
        },
        'Kano City, Kano State',
      )

      expect(result.isDeliverable).toBe(true)
    })

    it('permits physical offerings when recipient address matches configured regional zones', () => {
      const result = DeliveryZoneResolver.validateOfferingDelivery(
        {
          title: 'Relocation Moving Packing Kit',
          type: 'PACKAGE',
          deliveryAvailable: true,
          deliveryCoverageType: 'REGIONAL_ZONES',
          deliveryZones: ['LAGOS_ISLAND'],
        },
        'Plot 12 Admiralty Way, Lekki Phase 1, Lagos',
      )

      expect(result.isDeliverable).toBe(true)
    })

    it('rejects physical offerings when recipient address is outside configured regional zones', () => {
      const result = DeliveryZoneResolver.validateOfferingDelivery(
        {
          title: 'Perishable Artisan Grocery Crate',
          type: 'PACKAGE',
          deliveryAvailable: true,
          deliveryCoverageType: 'REGIONAL_ZONES',
          deliveryZones: ['LAGOS_ISLAND'],
        },
        '12 Allen Avenue, Ikeja, Lagos', // Lagos Mainland address
      )

      expect(result.isDeliverable).toBe(false)
      expect(result.reason).toContain('cannot be delivered to LAGOS MAINLAND')
      expect(result.reason).toContain('Supported delivery zones: LAGOS_ISLAND')
    })
  })
})
