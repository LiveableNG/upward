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

    it('resolves Ibadan / Oyo addresses to IBADAN_METRO', () => {
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Bodija GRA, Ibadan, Oyo State')).toBe('IBADAN_METRO')
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Jericho, Ibadan')).toBe('IBADAN_METRO')
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Oluyole Estate, Oyo State')).toBe('IBADAN_METRO')
    })

    it('resolves Port Harcourt addresses to PORT_HARCOURT', () => {
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Trans Amadi Industrial Layout, Port Harcourt, Rivers State')).toBe('PORT_HARCOURT')
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Peter Odili Road, Port Harcourt')).toBe('PORT_HARCOURT')
    })

    it('defaults unknown or unspecified addresses to OTHER', () => {
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Enugu City, Enugu State')).toBe('OTHER')
      expect(DeliveryZoneResolver.resolveZoneFromAddress('Kano City, Kano State')).toBe('OTHER')
    })
  })

  describe('DeliveryZoneResolver.validateOfferingDelivery', () => {
    it('validates on-site service against vendor coverage (e.g. cleaner covering Mainland, Island & Ibadan)', () => {
      const cleanerOffering = {
        title: 'Deep Apartment Sanitization & Cleaning',
        type: 'SERVICE',
        deliveryAvailable: true,
        vendor: {
          name: 'Pristine Cleaners',
          defaultDeliveryCoverage: 'REGIONAL_ZONES',
          defaultDeliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND', 'IBADAN_METRO'],
        },
      }

      // Mainland tenant
      expect(
        DeliveryZoneResolver.validateOfferingDelivery(cleanerOffering, '12 Allen Avenue, Ikeja, Lagos').isDeliverable,
      ).toBe(true)

      // Island tenant
      expect(
        DeliveryZoneResolver.validateOfferingDelivery(cleanerOffering, 'Admiralty Way, Lekki Phase 1, Lagos').isDeliverable,
      ).toBe(true)

      // Ibadan / Oyo tenant
      expect(
        DeliveryZoneResolver.validateOfferingDelivery(cleanerOffering, 'Bodija GRA, Ibadan, Oyo State').isDeliverable,
      ).toBe(true)

      // Abuja tenant (outside cleaner coverage)
      const abujaCheck = DeliveryZoneResolver.validateOfferingDelivery(
        cleanerOffering,
        'Maitama District, Abuja FCT',
      )
      expect(abujaCheck.isDeliverable).toBe(false)
      expect(abujaCheck.reason).toContain('Service \'Deep Apartment Sanitization & Cleaning\' is not available in ABUJA METRO')
    })

    it('rejects on-site service when vendor only works on the Mainland (e.g. painter)', () => {
      const painterOffering = {
        title: 'Interior Wall Painting & Priming',
        type: 'SERVICE',
        deliveryAvailable: true,
        vendor: {
          name: 'Mainland Artisan Painters',
          defaultDeliveryCoverage: 'REGIONAL_ZONES',
          defaultDeliveryZones: ['LAGOS_MAINLAND'],
        },
      }

      // Mainland tenant - permitted
      expect(
        DeliveryZoneResolver.validateOfferingDelivery(painterOffering, 'Yaba, Lagos Mainland').isDeliverable,
      ).toBe(true)

      // Island / Lekki tenant - rejected
      const lekkiCheck = DeliveryZoneResolver.validateOfferingDelivery(
        painterOffering,
        'Plot 12 Admiralty Way, Lekki Phase 1, Lagos',
      )
      expect(lekkiCheck.isDeliverable).toBe(false)
      expect(lekkiCheck.reason).toContain('Service \'Interior Wall Painting & Priming\' is not available in LAGOS ISLAND')
      expect(lekkiCheck.reason).toContain('Supported service areas: LAGOS MAINLAND')
    })

    it('allows offering custom zones to override vendor defaults', () => {
      const offeringWithOverride = {
        title: 'Specialty Concrete Floor Coating',
        type: 'SERVICE',
        deliveryAvailable: true,
        deliveryCoverageType: 'REGIONAL_ZONES',
        deliveryZones: ['LAGOS_MAINLAND', 'LAGOS_ISLAND'], // override expands to island
        vendor: {
          name: 'Local Mainland Applicators',
          defaultDeliveryCoverage: 'REGIONAL_ZONES',
          defaultDeliveryZones: ['LAGOS_MAINLAND'],
        },
      }

      expect(
        DeliveryZoneResolver.validateOfferingDelivery(offeringWithOverride, 'Victoria Island, Lagos').isDeliverable,
      ).toBe(true)
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
      expect(result.reason).toContain('Supported delivery zones: LAGOS ISLAND')
    })
  })
})
