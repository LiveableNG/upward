import { Test, TestingModule } from '@nestjs/testing'
import {
  CommercePricingEngine,
  PriceableItemInput,
  PriceableOffering,
  CalculatedVendorSubOrder,
} from '@domains/commerce/commerce-pricing.engine'
import { PreviewCommerceOrderUseCase } from '@application/commerce/use-cases/preview-commerce-order.use-case'
import { CreateCommerceOrderUseCase } from '@application/commerce/use-cases/create-commerce-order.use-case'
import { GetTenantOrdersUseCase } from '@application/commerce/use-cases/get-tenant-orders.use-case'
import { GetTenantOrderDetailUseCase } from '@application/commerce/use-cases/get-tenant-order-detail.use-case'
import { CancelExpiredCommerceOrdersUseCase } from '@application/commerce/use-cases/cancel-expired-commerce-orders.use-case'
import { InitializeCommercePaymentUseCase } from '@application/commerce/use-cases/initialize-commerce-payment.use-case'
import { ConfirmCommercePaymentUseCase } from '@application/commerce/use-cases/confirm-commerce-payment.use-case'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrder,
  CommerceOrderRepository,
} from '@domains/commerce/commerce-order.repository'
import {
  COMMERCE_DELIVERY_ZONE_REPOSITORY,
  CommerceDeliveryZoneRepository,
} from '@domains/commerce/commerce-delivery-zone.repository'
import {
  OFFERING_REPOSITORY,
  Offering,
  OfferingRepository,
} from '@domains/goals/offering.repository'
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '@domains/payments/payment.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '@domains/users/user.repository'
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common'

describe('Phase 6B.2: Commerce Order & Pricing Engine', () => {
  describe('CommercePricingEngine', () => {
    const mockVendorA = {
      id: 1,
      uuid: 'vendor-uuid-1',
      name: 'SwiftMove Logistics',
      slug: 'swiftmove',
      logoUrl: 'https://swiftmove.com/logo.png',
      phone: '+2348011111111',
      email: 'vendor1@test.com',
      rating: 4.8,
      isActive: true,
    }

    const mockVendorB = {
      id: 2,
      uuid: 'vendor-uuid-2',
      name: 'Sparkle Cleaners',
      slug: 'sparkle',
      logoUrl: 'https://sparkle.com/logo.png',
      phone: '+2348022222222',
      email: 'vendor2@test.com',
      rating: 4.9,
      isActive: true,
    }

    const productA: PriceableOffering = {
      id: 101,
      uuid: 'offering-uuid-101',
      vendorId: 1,
      type: 'PRODUCT',
      pricingModel: 'FIXED',
      title: 'Moving Boxes (Pack of 10)',
      currency: 'NGN',
      price: 15000, // 15,000 NGN = 1,500,000 kobo
      inStock: true,
      stockCount: 50,
      deliveryAvailable: true,
      status: 'PUBLISHED',
      vendor: mockVendorA,
    }

    const serviceB: PriceableOffering = {
      id: 102,
      uuid: 'offering-uuid-102',
      vendorId: 2,
      type: 'SERVICE',
      pricingModel: 'FIXED',
      title: 'Full Deep Cleaning',
      currency: 'NGN',
      price: 45000, // 45,000 NGN = 4,500,000 kobo
      inStock: true,
      stockCount: null,
      deliveryAvailable: true,
      status: 'PUBLISHED',
      vendor: mockVendorB,
    }

    it('calculates integer kobo prices accurately without floating point errors', () => {
      const items: PriceableItemInput[] = [
        { offering: productA, quantity: 2 }, // 2 * 1,500,000 = 3,000,000 kobo
      ]

      const result = CommercePricingEngine.calculateOrderPricing({ items })

      expect(result.itemsSubtotalKobo).toBe(3000000n)
      expect(result.deliveryFeeKobo).toBe(0n)
      expect(result.discountKobo).toBe(0n)
      expect(result.totalAmountKobo).toBe(3000000n)
      expect(result.subOrders).toHaveLength(1)
      expect(result.subOrders[0]!.vendorId).toBe(1)
      expect(result.subOrders[0]!.subtotalKobo).toBe(3000000n)
      // 10% commission on 3,000,000 kobo = 300,000 kobo
      expect(result.subOrders[0]!.platformFeeKobo).toBe(300000n)
      // Vendor payout = 3,000,000 - 300,000 = 2,700,000 kobo
      expect(result.subOrders[0]!.vendorPayoutKobo).toBe(2700000n)
    })

    it('decomposes multi-vendor cart into separate vendor sub-orders', () => {
      const items: PriceableItemInput[] = [
        { offering: productA, quantity: 1, deliveryFeeKobo: 250000n }, // Vendor 1: 1,500,000 kobo + 250,000 delivery
        { offering: serviceB, quantity: 1, deliveryFeeKobo: 0n },      // Vendor 2: 4,500,000 kobo
      ]

      const result = CommercePricingEngine.calculateOrderPricing({ items })

      expect(result.itemsSubtotalKobo).toBe(6000000n)
      expect(result.deliveryFeeKobo).toBe(250000n)
      expect(result.totalAmountKobo).toBe(6250000n)
      expect(result.subOrders).toHaveLength(2)

      const subA = result.subOrders.find((s: CalculatedVendorSubOrder) => s.vendorId === 1)!
      const subB = result.subOrders.find((s: CalculatedVendorSubOrder) => s.vendorId === 2)!

      expect(subA.subtotalKobo).toBe(1500000n)
      expect(subA.deliveryFeeKobo).toBe(250000n)
      expect(subB.subtotalKobo).toBe(4500000n)
      expect(subB.deliveryFeeKobo).toBe(0n)
    })

    it('distributes platform discounts using the Largest Remainder Method with exact kobo reconciliation', () => {
      // Vendor 1: 3,000,000 kobo (33.333...%)
      // Vendor 2: 6,000,000 kobo (66.666...%)
      // Total merchandise: 9,000,000 kobo
      // Total discount: 1,000,000 kobo (10,000 NGN)
      // Raw share:
      // Sub A: 333,333.333... kobo -> base 333,333, remainder 0.333...
      // Sub B: 666,666.666... kobo -> base 666,666, remainder 0.666...
      // Sum base = 999,999 kobo. Unallocated = 1 kobo.
      // Sub B has larger remainder (0.666 > 0.333), receives the +1 kobo.
      // Final: Sub A = 333,333; Sub B = 666,667. Exactly 1,000,000 kobo!
      const offeringDoublePrice: PriceableOffering = {
        ...productA,
        id: 103,
        price: 30000, // 3,000,000 kobo
        vendorId: 1,
        vendor: mockVendorA,
      }
      const offeringQuadPrice: PriceableOffering = {
        ...serviceB,
        id: 104,
        price: 60000, // 6,000,000 kobo
        vendorId: 2,
        vendor: mockVendorB,
      }

      const items: PriceableItemInput[] = [
        { offering: offeringDoublePrice, quantity: 1 },
        { offering: offeringQuadPrice, quantity: 1 },
      ]

      const result = CommercePricingEngine.calculateOrderPricing({
        items,
        totalDiscountKobo: 1000000n,
      })

      const subA = result.subOrders.find((s: CalculatedVendorSubOrder) => s.vendorId === 1)!
      const subB = result.subOrders.find((s: CalculatedVendorSubOrder) => s.vendorId === 2)!

      expect(subA.allocatedDiscountKobo).toBe(333333n)
      expect(subB.allocatedDiscountKobo).toBe(666667n)
      expect(subA.allocatedDiscountKobo + subB.allocatedDiscountKobo).toBe(1000000n)
      expect(result.discountKobo).toBe(1000000n)
      expect(result.totalAmountKobo).toBe(8000000n) // 9,000,000 - 1,000,000
    })

    it('enforces single-vendor package rule and rejects packages with components from different vendors', () => {
      const invalidMultiVendorPackage: PriceableOffering = {
        id: 201,
        uuid: 'pkg-multi-vendor',
        vendorId: 1,
        type: 'PACKAGE',
        pricingModel: 'FIXED',
        title: 'Home Move & Clean Bundle',
        currency: 'NGN',
        price: 50000,
        inStock: true,
        deliveryAvailable: true,
        status: 'PUBLISHED',
        vendor: mockVendorA,
        packageItems: [
          {
            componentId: 101,
            componentTitle: 'Boxes',
            quantity: 5,
            vendorId: 1, // Matches package vendor
          },
          {
            componentId: 102,
            componentTitle: 'Cleaning Service',
            quantity: 1,
            vendorId: 2, // VIOLATION: different vendor!
          },
        ],
      }

      expect(() => {
        CommercePricingEngine.calculateOrderPricing({
          items: [{ offering: invalidMultiVendorPackage, quantity: 1 }],
        })
      }).toThrow('ORDER_PRICING_MULTI_VENDOR_PACKAGE_VIOLATION')
    })

    it('allows valid packages where all components belong to the package vendor', () => {
      const validPackage: PriceableOffering = {
        id: 202,
        uuid: 'pkg-single-vendor',
        vendorId: 1,
        type: 'PACKAGE',
        pricingModel: 'FIXED',
        title: 'Relocation Complete Kit',
        currency: 'NGN',
        price: 50000,
        inStock: true,
        deliveryAvailable: true,
        status: 'PUBLISHED',
        vendor: mockVendorA,
        packageItems: [
          {
            componentId: 101,
            componentTitle: 'Boxes',
            quantity: 5,
            vendorId: 1,
          },
          {
            componentId: 103,
            componentTitle: 'Tape Rolls',
            quantity: 2,
            vendorId: 1,
          },
        ],
      }

      const result = CommercePricingEngine.calculateOrderPricing({
        items: [{ offering: validPackage, quantity: 1 }],
      })

      expect(result.subOrders).toHaveLength(1)
      expect(result.subOrders[0]!.vendorId).toBe(1)
      expect(result.subOrders[0]!.items[0]!.snapshotData.packageItemsSnapshot).toHaveLength(2)
    })

    it('rejects unpublished, out of stock, quote-required, or zero-quantity offerings', () => {
      expect(() => {
        CommercePricingEngine.calculateOrderPricing({
          items: [{ offering: { ...productA, status: 'DRAFT' }, quantity: 1 }],
        })
      }).toThrow('ORDER_PRICING_OFFERING_UNPUBLISHED')

      expect(() => {
        CommercePricingEngine.calculateOrderPricing({
          items: [{ offering: { ...productA, inStock: false }, quantity: 1 }],
        })
      }).toThrow('ORDER_PRICING_OFFERING_OUT_OF_STOCK')

      expect(() => {
        CommercePricingEngine.calculateOrderPricing({
          items: [{ offering: { ...productA, pricingModel: 'QUOTE_REQUIRED' }, quantity: 1 }],
        })
      }).toThrow('ORDER_PRICING_QUOTE_REQUIRED')

      expect(() => {
        CommercePricingEngine.calculateOrderPricing({
          items: [{ offering: productA, quantity: 0 }],
        })
      }).toThrow('ORDER_PRICING_INVALID_QUANTITY')
    })
  })

  describe('Use Cases: Preview, Create, Tenant Isolation & Concurrency', () => {
    let previewUseCase: PreviewCommerceOrderUseCase
    let createUseCase: CreateCommerceOrderUseCase
    let getTenantOrdersUseCase: GetTenantOrdersUseCase
    let getTenantOrderDetailUseCase: GetTenantOrderDetailUseCase
    let cancelExpiredUseCase: CancelExpiredCommerceOrdersUseCase
    let initializePaymentUseCase: InitializeCommercePaymentUseCase
    let confirmPaymentUseCase: ConfirmCommercePaymentUseCase

    let mockOfferingRepo: Partial<jest.Mocked<OfferingRepository>>
    let mockOrderRepo: Partial<jest.Mocked<CommerceOrderRepository>>
    let mockGateway: Partial<jest.Mocked<IPaymentGateway>>
    let mockUserRepo: Partial<jest.Mocked<UserRepository>>
    let mockDeliveryZoneRepo: Partial<jest.Mocked<CommerceDeliveryZoneRepository>>

    const sampleOffering: Offering = {
      id: 10,
      uuid: 'offering-uuid-10',
      vendorId: 5,
      type: 'PRODUCT',
      pricingModel: 'FIXED',
      title: 'Premium Ergonomic Office Chair',
      currency: 'NGN',
      price: 120000,
      inStock: true,
      stockCount: 15,
      deliveryAvailable: true,
      leadTimeDays: 3,
      status: 'PUBLISHED',
      isFeatured: true,
      vendor: {
        id: 5,
        uuid: 'vendor-uuid-5',
        name: 'WorkSpace Pro Ltd',
        slug: 'workspace-pro',
        logoUrl: 'https://workspace.ng/logo.png',
        phone: '+2348033333333',
        email: 'sales@workspace.ng',
        rating: 4.9,
        isActive: true,
      },
    }

    beforeEach(async () => {
      mockOfferingRepo = {
        findOfferingById: jest.fn().mockImplementation(async (id: number) => {
          if (id === 10) return sampleOffering
          return null
        }),
      }

      mockOrderRepo = {
        findOrderByPaymentReference: jest.fn().mockResolvedValue(null),
        findOrderByIdempotencyKey: jest.fn().mockResolvedValue(null),
        findOrderByUuid: jest.fn(),
        findOrdersByUserId: jest.fn(),
        findOrderById: jest.fn(),
        createOrder: jest.fn(),
        updateOrderStatus: jest.fn().mockResolvedValue({} as any),
        releaseInventory: jest.fn().mockResolvedValue(undefined),
        recordPaymentAttempt: jest.fn().mockResolvedValue({} as any),
        updatePaymentAttemptStatus: jest.fn().mockResolvedValue({} as any),
        findPaymentAttemptByReference: jest.fn().mockResolvedValue(null),
        findActivePaymentAttempt: jest.fn().mockResolvedValue(null),
        confirmOrderPayment: jest.fn().mockResolvedValue({} as any),
        recordAuditLog: jest.fn().mockResolvedValue({} as any),
      }

      mockGateway = {
        initializeTransaction: jest.fn().mockResolvedValue({
          authorizationUrl: 'https://checkout.paystack.com/test_token',
          accessCode: 'test_access_code',
          reference: 'UPW_ORD_PAY_test',
        }),
        verifyTransaction: jest.fn(),
      }

      mockUserRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 99,
          email: 'chidi@example.com',
          name: 'Chidi Mokeme',
        } as any),
      }

      mockDeliveryZoneRepo = {
        findByTag: jest.fn().mockResolvedValue(null),
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        findByUuid: jest.fn().mockResolvedValue(null),
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PreviewCommerceOrderUseCase,
          CreateCommerceOrderUseCase,
          GetTenantOrdersUseCase,
          GetTenantOrderDetailUseCase,
          CancelExpiredCommerceOrdersUseCase,
          InitializeCommercePaymentUseCase,
          ConfirmCommercePaymentUseCase,
          { provide: OFFERING_REPOSITORY, useValue: mockOfferingRepo },
          { provide: COMMERCE_ORDER_REPOSITORY, useValue: mockOrderRepo },
          { provide: PAYMENT_GATEWAY, useValue: mockGateway },
          { provide: USER_REPOSITORY, useValue: mockUserRepo },
          { provide: COMMERCE_DELIVERY_ZONE_REPOSITORY, useValue: mockDeliveryZoneRepo },
        ],
      }).compile()

      previewUseCase = module.get<PreviewCommerceOrderUseCase>(PreviewCommerceOrderUseCase)
      createUseCase = module.get<CreateCommerceOrderUseCase>(CreateCommerceOrderUseCase)
      getTenantOrdersUseCase = module.get<GetTenantOrdersUseCase>(GetTenantOrdersUseCase)
      getTenantOrderDetailUseCase = module.get<GetTenantOrderDetailUseCase>(GetTenantOrderDetailUseCase)
      cancelExpiredUseCase = module.get<CancelExpiredCommerceOrdersUseCase>(CancelExpiredCommerceOrdersUseCase)
      initializePaymentUseCase = module.get<InitializeCommercePaymentUseCase>(InitializeCommercePaymentUseCase)
      confirmPaymentUseCase = module.get<ConfirmCommercePaymentUseCase>(ConfirmCommercePaymentUseCase)
    })

    it('previewCommerceOrderUseCase returns price breakdown without persisting an order or mutating stock', async () => {
      const preview = await previewUseCase.execute({
        items: [{ offeringId: 10, quantity: 2 }],
      })

      expect(preview.itemsSubtotalKobo).toBe('24000000') // 2 * 120,000 * 100
      expect(preview.totalAmountKobo).toBe('24000000')
      expect(preview.subOrders).toHaveLength(1)
      expect(preview.subOrders[0]!.vendorName).toBe('WorkSpace Pro Ltd')
      expect(mockOrderRepo.createOrder).not.toHaveBeenCalled()
    })

    it('createCommerceOrderUseCase atomically creates order, reserves inventory and returns PENDING/UNPAID state', async () => {
      const mockCreatedOrder: CommerceOrder = {
        id: 77,
        uuid: 'ord-uuid-77',
        orderNumber: 'UPW-ORD-202611-ABC123',
        userId: 99,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        currency: 'NGN',
        itemsSubtotalKobo: 24000000n,
        deliveryFeeKobo: 0n,
        taxKobo: 0n,
        discountKobo: 0n,
        totalAmountKobo: 24000000n,
        paymentReference: 'UPW_ORD_test-idem-key',
        recipientName: 'Chidi Mokeme',
        recipientPhone: '+2348099999999',
        deliveryAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
        subOrders: [
          {
            id: 1,
            uuid: 'sub-uuid-1',
            orderId: 77,
            vendorId: 5,
            subOrderNumber: 'UPW-ORD-202611-ABC123-V1',
            customerStatus: 'ORDER_CONFIRMED',
            operationalStatus: 'AWAITING_VENDOR_CONFIRMATION',
            subtotalKobo: 24000000n,
            deliveryFeeKobo: 0n,
            allocatedDiscountKobo: 0n,
            platformFeeKobo: 2400000n,
            vendorPayoutKobo: 21600000n,
            vendor: sampleOffering.vendor,
            items: [
              {
                id: 1,
                uuid: 'item-uuid-1',
                subOrderId: 1,
                offeringId: 10,
                offeringType: 'PRODUCT',
                quantity: 2,
                unitPriceKobo: 12000000n,
                totalPriceKobo: 24000000n,
                snapshotData: {
                  offeringId: 10,
                  title: 'Premium Ergonomic Office Chair',
                  vendor: { id: 5, name: 'WorkSpace Pro Ltd' },
                },
              },
            ],
            fulfilmentEvents: [
              {
                uuid: 'event-uuid-1',
                subOrderId: 1,
                status: 'ORDER_CONFIRMED',
                title: 'Order Placed',
                description: 'Order placed by customer and awaiting payment verification.',
                isCustomerVisible: true,
                actorType: 'TENANT',
                createdAt: new Date(),
              },
            ],
          },
        ],
      }

      ;(mockOrderRepo.createOrder as jest.Mock).mockResolvedValue(mockCreatedOrder)

      const result = await createUseCase.execute(99, {
        recipientName: 'Chidi Mokeme',
        recipientPhone: '+2348099999999',
        deliveryAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
        items: [{ offeringId: 10, quantity: 2 }],
        idempotencyKey: 'test-idem-key',
      })

      expect(result.order.orderNumber).toBe('UPW-ORD-202611-ABC123')
      expect(result.order.status).toBe('PENDING')
      expect(result.order.paymentStatus).toBe('UNPAID')
      expect(result.paymentRequired).toBe(true)
      expect(mockOrderRepo.createOrder).toHaveBeenCalledTimes(1)
    })

    it('idempotency: repeating order creation with same idempotency key returns existing order without duplicating', async () => {
      const existingOrder: CommerceOrder = {
        id: 77,
        uuid: 'ord-uuid-77',
        orderNumber: 'UPW-ORD-202611-ABC123',
        userId: 99,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        currency: 'NGN',
        itemsSubtotalKobo: 24000000n,
        deliveryFeeKobo: 0n,
        taxKobo: 0n,
        discountKobo: 0n,
        totalAmountKobo: 24000000n,
        paymentReference: 'UPW_ORD_dup-key',
        recipientName: 'Chidi Mokeme',
        recipientPhone: '+2348099999999',
        deliveryAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
        subOrders: [],
      }

      ;(mockOrderRepo.findOrderByIdempotencyKey as jest.Mock).mockResolvedValue(existingOrder)

      const result = await createUseCase.execute(99, {
        recipientName: 'Chidi Mokeme',
        recipientPhone: '+2348099999999',
        deliveryAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
        items: [{ offeringId: 10, quantity: 2 }],
        idempotencyKey: 'dup-key',
      })

      expect(result.message).toContain('idempotent response')
      expect(result.order.uuid).toBe('ord-uuid-77')
      expect(mockOrderRepo.createOrder).not.toHaveBeenCalled()
    })

    it('idempotency: rejects if another tenant attempts to use the same idempotency key', async () => {
      const existingOrder: CommerceOrder = {
        id: 77,
        uuid: 'ord-uuid-77',
        orderNumber: 'UPW-ORD-202611-ABC123',
        userId: 88, // Owned by user 88!
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        currency: 'NGN',
        itemsSubtotalKobo: 24000000n,
        deliveryFeeKobo: 0n,
        taxKobo: 0n,
        discountKobo: 0n,
        totalAmountKobo: 24000000n,
        paymentReference: 'UPW_ORD_hijack-key',
        recipientName: 'Other User',
        recipientPhone: '+2348000000000',
        deliveryAddress: 'Somewhere else',
      }

      ;(mockOrderRepo.findOrderByIdempotencyKey as jest.Mock).mockResolvedValue(existingOrder)

      await expect(
        createUseCase.execute(99, { // User 99 tries to use user 88's key
          recipientName: 'Chidi Mokeme',
          recipientPhone: '+2348099999999',
          deliveryAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
          items: [{ offeringId: 10, quantity: 2 }],
          idempotencyKey: 'hijack-key',
        }),
      ).rejects.toThrow(ConflictException)
    })

    it('tenant isolation: prevents Tenant A from retrieving Tenant B order detail', async () => {
      const tenantBOrder: CommerceOrder = {
        id: 88,
        uuid: 'tenant-b-order-uuid',
        orderNumber: 'UPW-ORD-202611-B',
        userId: 200, // Belongs to User 200
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        currency: 'NGN',
        itemsSubtotalKobo: 1000000n,
        deliveryFeeKobo: 0n,
        taxKobo: 0n,
        discountKobo: 0n,
        totalAmountKobo: 1000000n,
        recipientName: 'Tenant B',
        recipientPhone: '+2348022222222',
        deliveryAddress: 'Tenant B Address',
      }

      ;(mockOrderRepo.findOrderByUuid as jest.Mock).mockResolvedValue(tenantBOrder)

      // User 100 attempts to read User 200's order
      await expect(
        getTenantOrderDetailUseCase.execute(100, 'tenant-b-order-uuid'),
      ).rejects.toThrow(NotFoundException)
    })

    it('data leakage guardrail: tenant detail response excludes internal notes, commissions, and payables', async () => {
      const orderWithInternalData: CommerceOrder = {
        id: 99,
        uuid: 'tenant-a-order-uuid',
        orderNumber: 'UPW-ORD-202611-A',
        userId: 100,
        status: 'PROCESSING',
        paymentStatus: 'PAID',
        currency: 'NGN',
        itemsSubtotalKobo: 12000000n,
        deliveryFeeKobo: 0n,
        taxKobo: 0n,
        discountKobo: 0n,
        totalAmountKobo: 12000000n,
        recipientName: 'Tenant A',
        recipientPhone: '+2348011111111',
        deliveryAddress: 'Tenant A Address',
        subOrders: [
          {
            id: 1,
            uuid: 'sub-uuid-1',
            orderId: 99,
            vendorId: 5,
            subOrderNumber: 'UPW-ORD-202611-A-V1',
            customerStatus: 'PROCESSING',
            operationalStatus: 'VENDOR_CONFIRMED',
            subtotalKobo: 12000000n,
            deliveryFeeKobo: 0n,
            allocatedDiscountKobo: 0n,
            platformFeeKobo: 1200000n, // INTERNAL
            vendorPayoutKobo: 10800000n, // INTERNAL
            adminOperationalNotes: 'Secret internal admin note about vendor delay', // INTERNAL
            vendor: sampleOffering.vendor,
            items: [
              {
                id: 1,
                uuid: 'item-uuid-1',
                subOrderId: 1,
                offeringId: 10,
                offeringType: 'PRODUCT',
                quantity: 1,
                unitPriceKobo: 12000000n,
                totalPriceKobo: 12000000n,
                snapshotData: { title: 'Office Chair' },
              },
            ],
            fulfilmentEvents: [
              {
                uuid: 'ev-visible',
                subOrderId: 1,
                status: 'PROCESSING',
                title: 'Preparing Dispatch',
                description: 'Supplier is packing items.',
                isCustomerVisible: true,
                actorType: 'ADMIN',
                createdAt: new Date(),
              },
              {
                uuid: 'ev-hidden',
                subOrderId: 1,
                status: 'PROCESSING',
                title: 'Internal Supplier Call',
                description: 'Called supplier warehouse to verify stock.',
                isCustomerVisible: false, // INTERNAL
                actorType: 'ADMIN',
                createdAt: new Date(),
              },
            ],
          },
        ],
      }

      ;(mockOrderRepo.findOrderByUuid as jest.Mock).mockResolvedValue(orderWithInternalData)

      const result = await getTenantOrderDetailUseCase.execute(100, 'tenant-a-order-uuid')

      const sub = result.subOrders[0]! as any
      // Internal fields must be stripped:
      expect(sub.platformFeeKobo).toBeUndefined()
      expect(sub.vendorPayoutKobo).toBeUndefined()
      expect(sub.adminOperationalNotes).toBeUndefined()
      expect(sub.operationalStatus).toBeUndefined()
      // Only customer visible fulfilment events should be returned:
      expect(sub.fulfilmentEvents).toHaveLength(1)
      expect(sub.fulfilmentEvents[0]!.uuid).toBe('ev-visible')
    })

    it('cancelExpiredCommerceOrdersUseCase releases reserved inventory for unpaid expired orders', async () => {
      const expiredOrder: CommerceOrder = {
        id: 55,
        uuid: 'ord-expired',
        orderNumber: 'UPW-ORD-202611-EXP',
        userId: 100,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        currency: 'NGN',
        itemsSubtotalKobo: 1000000n,
        deliveryFeeKobo: 0n,
        taxKobo: 0n,
        discountKobo: 0n,
        totalAmountKobo: 1000000n,
        recipientName: 'Tenant',
        recipientPhone: '+2348000000000',
        deliveryAddress: 'Address',
      }

      ;(mockOrderRepo.findOrderById as jest.Mock).mockResolvedValue(expiredOrder)

      await cancelExpiredUseCase.execute(55, 'Timeout 30 minutes')

      expect(mockOrderRepo.releaseInventory).toHaveBeenCalledWith(55, 'Timeout 30 minutes')
      expect(mockOrderRepo.updateOrderStatus).toHaveBeenCalledWith(55, 'CANCELLED')
      expect(mockOrderRepo.recordAuditLog).toHaveBeenCalledWith(
        55,
        expect.objectContaining({
          event: 'ORDER_EXPIRED_CANCELLED',
          toState: 'CANCELLED',
        }),
      )
    })

    describe('Phase 6B.3: Paystack Payment & Webhook Idempotency', () => {
      const eligibleOrder: CommerceOrder = {
        id: 77,
        uuid: 'ord-eligible-uuid',
        orderNumber: 'UPW-ORD-202611-ABC123',
        userId: 99,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        currency: 'NGN',
        itemsSubtotalKobo: 24000000n,
        deliveryFeeKobo: 0n,
        taxKobo: 0n,
        discountKobo: 0n,
        totalAmountKobo: 24000000n,
        recipientName: 'Chidi Mokeme',
        recipientPhone: '+2348099999999',
        deliveryAddress: '15 Admiralty Way, Lekki Phase 1, Lagos',
        subOrders: [
          {
            id: 1,
            uuid: 'sub-1',
            orderId: 77,
            vendorId: 5,
            subOrderNumber: 'UPW-ORD-202611-ABC123-V1',
            customerStatus: 'ORDER_CONFIRMED',
            operationalStatus: 'AWAITING_VENDOR_CONFIRMATION',
            subtotalKobo: 24000000n,
            deliveryFeeKobo: 0n,
            allocatedDiscountKobo: 0n,
            platformFeeKobo: 2400000n,
            vendorPayoutKobo: 21600000n,
            vendor: sampleOffering.vendor,
          },
        ],
      }

      it('initializePaymentUseCase initializes Paystack checkout with 100% funds to Upward and persists payment attempt', async () => {
        ;(mockOrderRepo.findOrderByUuid as jest.Mock).mockResolvedValue(eligibleOrder)

        const result = await initializePaymentUseCase.execute({
          userId: 99,
          orderUuid: 'ord-eligible-uuid',
          ipAddress: '127.0.0.1',
        })

        expect(result.authorizationUrl).toBe('https://checkout.paystack.com/test_token')
        expect(result.accessCode).toBe('test_access_code')
        expect(result.reference).toMatch(/^UPW_ORD_PAY_/)
        expect(result.amountKobo).toBe('24000000')

        // Verify attempt persisted in DB first
        expect(mockOrderRepo.recordPaymentAttempt).toHaveBeenCalledWith(
          77,
          expect.objectContaining({
            status: 'INITIATED',
            amountKobo: 24000000n,
            currency: 'NGN',
          }),
        )

        // Verify Paystack initialized with exact amount in Naira (240,000 NGN) and 100% Upward corporate account
        expect(mockGateway.initializeTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'chidi@example.com',
            amount: 240000,
            metadata: expect.objectContaining({
              paymentKind: 'COMMERCE_ORDER',
              orderUuid: 'ord-eligible-uuid',
            }),
          }),
        )
        expect((mockGateway.initializeTransaction as jest.Mock).mock.calls[0][0].subaccount).toBeUndefined()
      })

      it('initializePaymentUseCase rejects payment initialization for cancelled or already paid orders', async () => {
        const cancelledOrder: CommerceOrder = {
          ...eligibleOrder,
          status: 'CANCELLED',
        }
        ;(mockOrderRepo.findOrderByUuid as jest.Mock).mockResolvedValue(cancelledOrder)

        await expect(
          initializePaymentUseCase.execute({
            userId: 99,
            orderUuid: 'ord-eligible-uuid',
          }),
        ).rejects.toThrow(BadRequestException)

        const paidOrder: CommerceOrder = {
          ...eligibleOrder,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        }
        ;(mockOrderRepo.findOrderByUuid as jest.Mock).mockResolvedValue(paidOrder)

        await expect(
          initializePaymentUseCase.execute({
            userId: 99,
            orderUuid: 'ord-eligible-uuid',
          }),
        ).rejects.toThrow(BadRequestException)
      })

      it('confirmPaymentUseCase rejects amount mismatch between gateway and persisted payment attempt', async () => {
        const mockAttempt = {
          id: 1,
          uuid: 'att-1',
          orderId: 77,
          reference: 'UPW_ORD_PAY_valid_ref',
          amountKobo: 24000000n, // Expected 24,000,000 kobo
          currency: 'NGN',
          status: 'INITIATED',
          order: eligibleOrder,
        }
        ;(mockOrderRepo.findPaymentAttemptByReference as jest.Mock).mockResolvedValue(mockAttempt)

        await expect(
          confirmPaymentUseCase.execute({
            reference: 'UPW_ORD_PAY_valid_ref',
            amount: 10000000, // Underpayment: only 10,000,000 kobo!
            currency: 'NGN',
            status: 'success',
          }),
        ).rejects.toThrow(BadRequestException)

        expect(mockOrderRepo.updatePaymentAttemptStatus).toHaveBeenCalledWith(
          'UPW_ORD_PAY_valid_ref',
          'AMOUNT_MISMATCH',
          expect.any(String),
        )
      })

      it('confirmPaymentUseCase is idempotent under repeated webhook delivery for already confirmed orders', async () => {
        const alreadyPaidOrder: CommerceOrder = {
          ...eligibleOrder,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
        }
        const mockAttempt = {
          id: 1,
          uuid: 'att-1',
          orderId: 77,
          reference: 'UPW_ORD_PAY_valid_ref',
          amountKobo: 24000000n,
          currency: 'NGN',
          status: 'SUCCESSFUL',
          order: alreadyPaidOrder,
        }
        ;(mockOrderRepo.findPaymentAttemptByReference as jest.Mock).mockResolvedValue(mockAttempt)

        const result = await confirmPaymentUseCase.execute({
          reference: 'UPW_ORD_PAY_valid_ref',
          amount: 24000000,
          currency: 'NGN',
          status: 'success',
        })

        expect(result.success).toBe(true)
        expect(result.message).toContain('already confirmed')
        expect(mockOrderRepo.confirmOrderPayment).not.toHaveBeenCalled()
      })

      it('confirmPaymentUseCase prevents normal confirmation on cancelled/expired orders and records audit for manual refund', async () => {
        const cancelledOrder: CommerceOrder = {
          ...eligibleOrder,
          status: 'CANCELLED',
        }
        const mockAttempt = {
          id: 1,
          uuid: 'att-1',
          orderId: 77,
          reference: 'UPW_ORD_PAY_late_ref',
          amountKobo: 24000000n,
          currency: 'NGN',
          status: 'INITIATED',
          order: cancelledOrder,
        }
        ;(mockOrderRepo.findPaymentAttemptByReference as jest.Mock).mockResolvedValue(mockAttempt)

        const result = await confirmPaymentUseCase.execute({
          reference: 'UPW_ORD_PAY_late_ref',
          amount: 24000000,
          currency: 'NGN',
          status: 'success',
        })

        expect(result.success).toBe(false)
        expect(result.reason).toContain('cancelled prior to payment receipt')
        expect(mockOrderRepo.confirmOrderPayment).not.toHaveBeenCalled()
        expect(mockOrderRepo.updatePaymentAttemptStatus).toHaveBeenCalledWith(
          'UPW_ORD_PAY_late_ref',
          'PAID_AFTER_CANCELLATION',
          expect.any(String),
        )
        expect(mockOrderRepo.recordAuditLog).toHaveBeenCalledWith(
          77,
          expect.objectContaining({
            event: 'PAYMENT_RECEIVED_AFTER_EXPIRATION',
          }),
        )
      })

      it('confirmPaymentUseCase atomically confirms order and creates vendor payable records in PENDING_FULFILMENT', async () => {
        const mockAttempt = {
          id: 1,
          uuid: 'att-1',
          orderId: 77,
          reference: 'UPW_ORD_PAY_success_ref',
          amountKobo: 24000000n,
          currency: 'NGN',
          status: 'INITIATED',
          order: eligibleOrder,
        }
        ;(mockOrderRepo.findPaymentAttemptByReference as jest.Mock).mockResolvedValue(mockAttempt)

        const result = await confirmPaymentUseCase.execute({
          reference: 'UPW_ORD_PAY_success_ref',
          amount: 24000000,
          currency: 'NGN',
          status: 'success',
          channel: 'card',
          paid_at: new Date().toISOString(),
        })

        expect(result.success).toBe(true)
        expect(result.message).toContain('Payment confirmed successfully')
        expect(mockOrderRepo.confirmOrderPayment).toHaveBeenCalledWith(
          expect.objectContaining({
            orderId: 77,
            paymentReference: 'UPW_ORD_PAY_success_ref',
            channel: 'card',
          }),
        )
      })
    })
  })
})
