import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AdminGetCommerceOrdersUseCase } from '@application/commerce/use-cases/admin/admin-get-commerce-orders.use-case'
import { AdminGetCommerceOrderDetailUseCase } from '@application/commerce/use-cases/admin/admin-get-commerce-order-detail.use-case'
import { AdminUpdateSubOrderFulfilmentUseCase } from '@application/commerce/use-cases/admin/admin-update-sub-order-fulfilment.use-case'
import { TenantConfirmSubOrderReceiptUseCase } from '@application/commerce/use-cases/tenant-confirm-sub-order-receipt.use-case'
import { GetTenantOrderDetailUseCase } from '@application/commerce/use-cases/get-tenant-order-detail.use-case'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrder,
  CommerceOrderRepository,
  CommerceVendorSuborder,
} from '@domains/commerce/commerce-order.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '@domains/users/user.repository'
import { AdminFulfilmentTransitionAction } from '@application/commerce/dto/admin-commerce.dto'

describe('Phase 6B.4: Admin-Managed Fulfilment APIs & Milestone Dispatch', () => {
  let adminGetOrdersUseCase: AdminGetCommerceOrdersUseCase
  let adminGetOrderDetailUseCase: AdminGetCommerceOrderDetailUseCase
  let adminUpdateFulfilmentUseCase: AdminUpdateSubOrderFulfilmentUseCase
  let tenantConfirmReceiptUseCase: TenantConfirmSubOrderReceiptUseCase
  let tenantGetOrderDetailUseCase: GetTenantOrderDetailUseCase
  let mockOrderRepo: jest.Mocked<CommerceOrderRepository>
  let mockUserRepo: Partial<jest.Mocked<UserRepository>>

  const mockUser = {
    id: 1,
    uuid: 'user-uuid-1',
    email: 'tenant@upward.ng',
    firstName: 'Amara',
    lastName: 'Okafor',
    phone: '+2348012345678',
  }

  const mockVendor = {
    id: 10,
    uuid: 'vendor-uuid-10',
    name: 'Swift Haul Logistics',
    slug: 'swift-haul',
    email: 'ops@swifthaul.ng',
    phone: '+2348099998888',
  }

  const mockProductSubOrder: CommerceVendorSuborder = {
    id: 100,
    uuid: 'suborder-prod-uuid',
    orderId: 50,
    vendorId: 10,
    subOrderNumber: 'SUB-202611-PROD-001',
    customerStatus: 'PROCESSING',
    operationalStatus: 'AWAITING_VENDOR_CONFIRMATION',
    subtotalKobo: BigInt(5000000),
    deliveryFeeKobo: BigInt(500000),
    allocatedDiscountKobo: BigInt(0),
    platformFeeKobo: BigInt(500000),
    vendorPayoutKobo: BigInt(5000000),
    vendor: mockVendor,
    items: [
      {
        id: 1,
        uuid: 'item-prod-1',
        subOrderId: 100,
        offeringId: 101,
        offeringType: 'PRODUCT',
        quantity: 2,
        unitPriceKobo: BigInt(2500000),
        totalPriceKobo: BigInt(5000000),
        snapshotData: {
          offeringTitle: 'Ergonomic Office Chair',
          sku: 'EOC-01',
        },
      },
    ],
    fulfilmentEvents: [
      {
        id: 1,
        uuid: 'ev-1',
        subOrderId: 100,
        status: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        description: 'Payment verified and order submitted to vendor',
        isCustomerVisible: true,
        actorType: 'SYSTEM',
        createdAt: new Date('2026-11-05T08:00:00Z'),
      },
    ],
    payableRecord: {
      id: 200,
      uuid: 'payable-uuid-1',
      subOrderId: 100,
      vendorId: 10,
      status: 'PENDING_FULFILMENT',
      grossAmountKobo: BigInt(5500000),
      commissionKobo: BigInt(500000),
      netPayableKobo: BigInt(5000000),
      bankCode: '058',
      accountNumber: '0123456789',
      accountName: 'Swift Haul Logistics Ltd',
    },
    createdAt: new Date('2026-11-05T08:00:00Z'),
    updatedAt: new Date('2026-11-05T08:00:00Z'),
  }

  const mockServiceSubOrder: CommerceVendorSuborder = {
    id: 101,
    uuid: 'suborder-serv-uuid',
    orderId: 50,
    vendorId: 10,
    subOrderNumber: 'SUB-202611-SERV-002',
    customerStatus: 'PROCESSING',
    operationalStatus: 'AWAITING_VENDOR_CONFIRMATION',
    subtotalKobo: BigInt(3000000),
    deliveryFeeKobo: BigInt(0),
    allocatedDiscountKobo: BigInt(0),
    platformFeeKobo: BigInt(300000),
    vendorPayoutKobo: BigInt(2700000),
    vendor: mockVendor,
    items: [
      {
        id: 2,
        uuid: 'item-serv-2',
        subOrderId: 101,
        offeringId: 102,
        offeringType: 'SERVICE',
        quantity: 1,
        unitPriceKobo: BigInt(3000000),
        totalPriceKobo: BigInt(3000000),
        snapshotData: {
          offeringTitle: 'Deep Cleaning Service',
          serviceType: 'RESIDENTIAL',
        },
      },
    ],
    fulfilmentEvents: [
      {
        id: 2,
        uuid: 'ev-2',
        subOrderId: 101,
        status: 'ORDER_CONFIRMED',
        title: 'Order Confirmed',
        description: 'Payment verified and order submitted to service team',
        isCustomerVisible: true,
        actorType: 'SYSTEM',
        createdAt: new Date('2026-11-05T08:00:00Z'),
      },
    ],
    payableRecord: {
      id: 201,
      uuid: 'payable-uuid-2',
      subOrderId: 101,
      vendorId: 10,
      status: 'PENDING_FULFILMENT',
      grossAmountKobo: BigInt(3000000),
      commissionKobo: BigInt(300000),
      netPayableKobo: BigInt(2700000),
      bankCode: '058',
      accountNumber: '0123456789',
      accountName: 'Swift Haul Logistics Ltd',
    },
    createdAt: new Date('2026-11-05T08:00:00Z'),
    updatedAt: new Date('2026-11-05T08:00:00Z'),
  }

  const mockMasterOrder: CommerceOrder = {
    id: 50,
    uuid: 'order-master-uuid',
    orderNumber: 'ORD-202611-0001',
    userId: 1,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    currency: 'NGN',
    itemsSubtotalKobo: BigInt(8000000),
    deliveryFeeKobo: BigInt(500000),
    taxKobo: BigInt(0),
    discountKobo: BigInt(0),
    totalAmountKobo: BigInt(8500000),
    paymentReference: 'PAY_REF_12345',
    paidAt: new Date('2026-11-05T08:05:00Z'),
    recipientName: 'Amara Okafor',
    recipientPhone: '+2348012345678',
    deliveryAddress: 'Block 4, Flat 2, Lekki Phase 1, Lagos',
    user: mockUser,
    subOrders: [mockProductSubOrder, mockServiceSubOrder],
    paymentAttempts: [
      {
        id: 1,
        uuid: 'pa-uuid-1',
        orderId: 50,
        reference: 'PAY_REF_12345',
        amountKobo: BigInt(8500000),
        currency: 'NGN',
        status: 'SUCCESSFUL',
        createdAt: new Date('2026-11-05T08:05:00Z'),
      },
    ],
    auditLogs: [],
    createdAt: new Date('2026-11-05T08:00:00Z'),
    updatedAt: new Date('2026-11-05T08:05:00Z'),
  }

  beforeEach(async () => {
    mockOrderRepo = {
      findAdminOrders: jest.fn(),
      findOrderByUuid: jest.fn(),
      findOrderById: jest.fn(),
      findSubOrderByUuid: jest.fn(),
      executeSubOrderFulfilmentTransition: jest.fn(),
      recordAuditLog: jest.fn(),
      createOrder: jest.fn(),
      findOrderByNumber: jest.fn(),
      findOrderByPaymentReference: jest.fn(),
      findOrderByIdempotencyKey: jest.fn(),
      findOrdersByUserId: jest.fn(),
      updateOrderStatus: jest.fn(),
      findSubOrderById: jest.fn(),
      findSubOrdersByVendorId: jest.fn(),
      updateSubOrderStatus: jest.fn(),
      addFulfilmentEvent: jest.fn(),
      recordPaymentAttempt: jest.fn(),
      findPaymentAttemptByReference: jest.fn(),
      updatePaymentAttemptStatus: jest.fn(),
      findActivePaymentAttempt: jest.fn(),
      confirmOrderPayment: jest.fn(),
      releaseInventory: jest.fn(),
    }

    mockUserRepo = {
      findById: jest.fn().mockImplementation(async (id: number) => ({
        id,
        uuid: `user-uuid-${id}`,
        email: `tenant-${id}@upward.ng`,
        firstName: 'Amara',
        lastName: 'Okafor',
      } as any)),
      findByUuid: jest.fn().mockImplementation(async (uuid: string) => ({
        id: 1,
        uuid,
        email: 'tenant@upward.ng',
        firstName: 'Amara',
        lastName: 'Okafor',
      } as any)),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGetCommerceOrdersUseCase,
        AdminGetCommerceOrderDetailUseCase,
        AdminUpdateSubOrderFulfilmentUseCase,
        TenantConfirmSubOrderReceiptUseCase,
        GetTenantOrderDetailUseCase,
        {
          provide: COMMERCE_ORDER_REPOSITORY,
          useValue: mockOrderRepo,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepo,
        },
      ],
    }).compile()

    adminGetOrdersUseCase = module.get<AdminGetCommerceOrdersUseCase>(AdminGetCommerceOrdersUseCase)
    adminGetOrderDetailUseCase = module.get<AdminGetCommerceOrderDetailUseCase>(AdminGetCommerceOrderDetailUseCase)
    adminUpdateFulfilmentUseCase = module.get<AdminUpdateSubOrderFulfilmentUseCase>(AdminUpdateSubOrderFulfilmentUseCase)
    tenantConfirmReceiptUseCase = module.get<TenantConfirmSubOrderReceiptUseCase>(TenantConfirmSubOrderReceiptUseCase)
    tenantGetOrderDetailUseCase = module.get<GetTenantOrderDetailUseCase>(GetTenantOrderDetailUseCase)
  })

  describe('Admin Order Query APIs', () => {
    it('should list commerce orders with filtering and formatted kobo amounts', async () => {
      mockOrderRepo.findAdminOrders.mockResolvedValue({
        items: [mockMasterOrder],
        total: 1,
      })

      const res = await adminGetOrdersUseCase.execute({
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        search: 'Amara',
        skip: 0,
        take: 20,
      })

      expect(res.total).toBe(1)
      expect(res.items).toHaveLength(1)
      const order = res.items[0]!
      expect(order.orderNumber).toBe('ORD-202611-0001')
      expect(order.totalAmountKobo).toBe('8500000')
      expect(order.customer.email).toBe('tenant@upward.ng')
      expect(order.subOrdersCount).toBe(2)
      expect(order.subOrders[0]!.subOrderNumber).toBe('SUB-202611-PROD-001')
    })

    it('should return complete detail for admin with snapshots, payment attempts, and payable records', async () => {
      mockOrderRepo.findOrderByUuid.mockResolvedValue(mockMasterOrder)

      const res = await adminGetOrderDetailUseCase.execute('order-master-uuid')

      expect(res.uuid).toBe('order-master-uuid')
      expect(res.customer.phone).toBe('+2348012345678')
      expect(res.subOrders).toHaveLength(2)

      const prodSub = res.subOrders[0]!
      expect(prodSub.items[0]!.snapshotData).toEqual({
        offeringTitle: 'Ergonomic Office Chair',
        sku: 'EOC-01',
      })
      expect(prodSub.payableRecord).toBeDefined()
      expect(prodSub.payableRecord?.status).toBe('PENDING_FULFILMENT')
      expect(prodSub.payableRecord?.netPayableKobo).toBe('5000000')
    })

    it('should throw NotFoundException if admin requests non-existent order', async () => {
      mockOrderRepo.findOrderByUuid.mockResolvedValue(null)

      await expect(adminGetOrderDetailUseCase.execute('unknown-uuid')).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('Product Sub-Order Fulfilment Lifecycle', () => {
    it('allows dispatch even when carrierName and trackingNumber are omitted', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockProductSubOrder,
        order: mockMasterOrder,
      })

      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue({
        ...mockProductSubOrder,
        customerStatus: 'DISPATCHED',
        operationalStatus: 'CARRIER_DISPATCHED',
      })

      const res = await adminUpdateFulfilmentUseCase.execute('suborder-prod-uuid', 'admin-uuid-1', {
        action: AdminFulfilmentTransitionAction.DISPATCH,
      })

      expect(res.customerStatus).toBe('DISPATCHED')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalled()
    })

    it('should reject dispatch on unpaid master order', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockProductSubOrder,
        order: { ...mockMasterOrder, paymentStatus: 'UNPAID' },
      })

      await expect(
        adminUpdateFulfilmentUseCase.execute('suborder-prod-uuid', 'admin-uuid-1', {
          action: AdminFulfilmentTransitionAction.DISPATCH,
          carrierName: 'GIG Logistics',
          trackingNumber: 'GIG-999-LAGOS',
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('should dispatch product with carrier, creating customer-visible event', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockProductSubOrder,
        order: mockMasterOrder,
      })

      const dispatchedSubOrder: CommerceVendorSuborder = {
        ...mockProductSubOrder,
        customerStatus: 'DISPATCHED',
        operationalStatus: 'CARRIER_DISPATCHED',
        carrierName: 'GIG Logistics',
        trackingNumber: 'GIG-999-LAGOS',
        trackingUrl: 'https://giglogistics.com/track/GIG-999-LAGOS',
        fulfilmentEvents: [
          ...mockProductSubOrder.fulfilmentEvents!,
          {
            id: 10,
            uuid: 'ev-dispatch',
            subOrderId: 100,
            status: 'DISPATCHED',
            title: 'Package Dispatched',
            description: 'Package dispatched via GIG Logistics. Tracking number: GIG-999-LAGOS',
            carrierName: 'GIG Logistics',
            trackingNumber: 'GIG-999-LAGOS',
            isCustomerVisible: true,
            actorType: 'ADMIN',
            actorId: 'admin-uuid-1',
            createdAt: new Date(),
          },
        ],
      }

      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue(dispatchedSubOrder)

      const result = await adminUpdateFulfilmentUseCase.execute('suborder-prod-uuid', 'admin-uuid-1', {
        action: AdminFulfilmentTransitionAction.DISPATCH,
        carrierName: 'GIG Logistics',
        trackingNumber: 'GIG-999-LAGOS',
        trackingUrl: 'https://giglogistics.com/track/GIG-999-LAGOS',
      })

      expect(result.customerStatus).toBe('DISPATCHED')
      expect(result.operationalStatus).toBe('CARRIER_DISPATCHED')
      expect(result.carrierName).toBe('GIG Logistics')
      expect(result.trackingNumber).toBe('GIG-999-LAGOS')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          subOrderId: 100,
          customerStatus: 'DISPATCHED',
          operationalStatus: 'CARRIER_DISPATCHED',
          event: expect.objectContaining({
            status: 'DISPATCHED',
            title: 'Package Dispatched',
            carrierName: 'GIG Logistics',
            trackingNumber: 'GIG-999-LAGOS',
            isCustomerVisible: true,
          }),
        }),
      )
    })

    it('should advance to OUT_FOR_DELIVERY from DISPATCHED', async () => {
      const dispatchedState: CommerceVendorSuborder = {
        ...mockProductSubOrder,
        customerStatus: 'DISPATCHED',
        operationalStatus: 'CARRIER_DISPATCHED',
        carrierName: 'GIG Logistics',
        trackingNumber: 'GIG-999-LAGOS',
        order: mockMasterOrder,
      }
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue(dispatchedState)

      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue({
        ...dispatchedState,
        customerStatus: 'OUT_FOR_DELIVERY',
      })

      const res = await adminUpdateFulfilmentUseCase.execute('suborder-prod-uuid', 'admin-uuid-1', {
        action: AdminFulfilmentTransitionAction.OUT_FOR_DELIVERY,
      })

      expect(res.customerStatus).toBe('OUT_FOR_DELIVERY')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          customerStatus: 'OUT_FOR_DELIVERY',
        }),
      )
    })

    it('should deliver product, setting 48h cooling period and transitioning payable to IN_COOLING_PERIOD', async () => {
      const outForDeliveryState: CommerceVendorSuborder = {
        ...mockProductSubOrder,
        customerStatus: 'OUT_FOR_DELIVERY',
        operationalStatus: 'CARRIER_DISPATCHED',
        order: mockMasterOrder,
      }
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue(outForDeliveryState)

      const deliveredSubOrder: CommerceVendorSuborder = {
        ...outForDeliveryState,
        customerStatus: 'DELIVERED',
        operationalStatus: 'DELIVERED_PENDING_INSPECTION',
        deliveredAt: new Date(),
        coolingPeriodEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        payableRecord: {
          ...mockProductSubOrder.payableRecord,
          status: 'IN_COOLING_PERIOD',
        },
      }
      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue(deliveredSubOrder)

      const res = await adminUpdateFulfilmentUseCase.execute('suborder-prod-uuid', 'admin-uuid-1', {
        action: AdminFulfilmentTransitionAction.DELIVER,
      })

      expect(res.customerStatus).toBe('DELIVERED')
      expect(res.operationalStatus).toBe('DELIVERED_PENDING_INSPECTION')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          customerStatus: 'DELIVERED',
          operationalStatus: 'DELIVERED_PENDING_INSPECTION',
          payableStatusUpdate: { status: 'IN_COOLING_PERIOD' },
          dispatchData: expect.objectContaining({
            deliveredAt: expect.any(Date),
            coolingPeriodEndsAt: expect.any(Date),
          }),
        }),
      )
    })
  })

  describe('Service Sub-Order Fulfilment Lifecycle', () => {
    it('should schedule service with appointment date', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockServiceSubOrder,
        order: mockMasterOrder,
      })

      const scheduledSubOrder: CommerceVendorSuborder = {
        ...mockServiceSubOrder,
        customerStatus: 'SERVICE_SCHEDULED',
        serviceScheduledAt: new Date('2026-11-10T10:00:00Z'),
        serviceWindowNotes: 'Morning window 10am - 1pm',
      }
      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue(scheduledSubOrder)

      const res = await adminUpdateFulfilmentUseCase.execute('suborder-serv-uuid', 'admin-uuid-1', {
        action: AdminFulfilmentTransitionAction.SCHEDULE_SERVICE,
        serviceScheduledAt: '2026-11-10T10:00:00Z',
        serviceWindowNotes: 'Morning window 10am - 1pm',
      })

      expect(res.customerStatus).toBe('SERVICE_SCHEDULED')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          customerStatus: 'SERVICE_SCHEDULED',
          dispatchData: expect.objectContaining({
            serviceScheduledAt: new Date('2026-11-10T10:00:00Z'),
            serviceWindowNotes: 'Morning window 10am - 1pm',
          }),
        }),
      )
    })

    it('should assign technician with operational note (internal admin event)', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockServiceSubOrder,
        order: mockMasterOrder,
      })

      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue({
        ...mockServiceSubOrder,
        operationalStatus: 'TECHNICIAN_ASSIGNED',
        technicianName: 'Emeka Nwosu',
        technicianPhone: '+2348077776666',
      })

      const res = await adminUpdateFulfilmentUseCase.execute('suborder-serv-uuid', 'admin-uuid-1', {
        action: AdminFulfilmentTransitionAction.ASSIGN_TECHNICIAN,
        technicianName: 'Emeka Nwosu',
        technicianPhone: '+2348077776666',
        isCustomerVisible: false,
      })

      expect(res.operationalStatus).toBe('TECHNICIAN_ASSIGNED')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          operationalStatus: 'TECHNICIAN_ASSIGNED',
          event: expect.objectContaining({
            title: 'Technician Assigned',
            isCustomerVisible: false,
          }),
        }),
      )
    })

    it('should complete service, set cooling period, and transition payable to IN_COOLING_PERIOD', async () => {
      const scheduledState: CommerceVendorSuborder = {
        ...mockServiceSubOrder,
        customerStatus: 'SERVICE_SCHEDULED',
        order: mockMasterOrder,
      }
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue(scheduledState)

      const completedState: CommerceVendorSuborder = {
        ...scheduledState,
        customerStatus: 'SERVICE_COMPLETED',
        operationalStatus: 'DELIVERED_PENDING_INSPECTION',
        deliveredAt: new Date(),
        coolingPeriodEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      }
      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue(completedState)

      const res = await adminUpdateFulfilmentUseCase.execute('suborder-serv-uuid', 'admin-uuid-1', {
        action: AdminFulfilmentTransitionAction.COMPLETE_SERVICE,
      })

      expect(res.customerStatus).toBe('SERVICE_COMPLETED')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          customerStatus: 'SERVICE_COMPLETED',
          payableStatusUpdate: { status: 'IN_COOLING_PERIOD' },
        }),
      )
    })
  })

  describe('Cross-Type Rejection & Financial Boundary Preservation', () => {
    it('should reject carrier dispatch on a service sub-order', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockServiceSubOrder,
        order: mockMasterOrder,
      })

      await expect(
        adminUpdateFulfilmentUseCase.execute('suborder-serv-uuid', 'admin-uuid-1', {
          action: AdminFulfilmentTransitionAction.DISPATCH,
          carrierName: 'DHL Express',
          trackingNumber: 'DHL-12345',
        }),
      ).rejects.toThrow('Cannot dispatch carrier for a service sub-order')
    })

    it('should reject service scheduling on a physical product sub-order', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockProductSubOrder,
        order: mockMasterOrder,
      })

      await expect(
        adminUpdateFulfilmentUseCase.execute('suborder-prod-uuid', 'admin-uuid-1', {
          action: AdminFulfilmentTransitionAction.SCHEDULE_SERVICE,
          serviceScheduledAt: '2026-11-10T10:00:00Z',
        }),
      ).rejects.toThrow('Cannot schedule service appointment on a product sub-order')
    })

    it('fulfilment transition must NEVER mark payable as PAID_OUT or initiate transfers', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockProductSubOrder,
        customerStatus: 'OUT_FOR_DELIVERY',
        order: mockMasterOrder,
      })

      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue({
        ...mockProductSubOrder,
        customerStatus: 'DELIVERED',
      })

      await adminUpdateFulfilmentUseCase.execute('suborder-prod-uuid', 'admin-uuid-1', {
        action: AdminFulfilmentTransitionAction.DELIVER,
      })

      // Invariant: Status must be IN_COOLING_PERIOD, never PAID_OUT or PAYOUT_SUBMITTED
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          payableStatusUpdate: { status: 'IN_COOLING_PERIOD' },
        }),
      )
    })
  })

  describe('Tenant Customer Receipt Confirmation', () => {
    it('should reject receipt confirmation if caller is not the owner of the order', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockProductSubOrder,
        order: mockMasterOrder, // userId: 1
      })

      // Attempt by user 999
      await expect(
        tenantConfirmReceiptUseCase.execute(999, 'suborder-prod-uuid'),
      ).rejects.toThrow(NotFoundException)
    })

    it('should reject receipt confirmation if sub-order is not DELIVERED or SERVICE_COMPLETED', async () => {
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue({
        ...mockProductSubOrder,
        customerStatus: 'PROCESSING',
        order: mockMasterOrder,
      })

      await expect(
        tenantConfirmReceiptUseCase.execute(1, 'suborder-prod-uuid'),
      ).rejects.toThrow('Sub-order must be in DELIVERED or SERVICE_COMPLETED status')
    })

    it('should confirm receipt when DELIVERED, transition payable to ELIGIBLE_FOR_PAYOUT, and close fulfilment', async () => {
      const deliveredSubOrder: CommerceVendorSuborder = {
        ...mockProductSubOrder,
        customerStatus: 'DELIVERED',
        order: mockMasterOrder,
      }
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue(deliveredSubOrder)

      const confirmedSubOrder: CommerceVendorSuborder = {
        ...deliveredSubOrder,
        customerStatus: 'RECEIVED_CONFIRMED',
        operationalStatus: 'FULFILMENT_CLOSED',
        tenantConfirmedAt: new Date(),
      }
      mockOrderRepo.executeSubOrderFulfilmentTransition.mockResolvedValue(confirmedSubOrder)
      mockOrderRepo.findOrderById.mockResolvedValue({
        ...mockMasterOrder,
        status: 'COMPLETED',
      })

      const res = await tenantConfirmReceiptUseCase.execute(1, 'suborder-prod-uuid')

      expect(res.success).toBe(true)
      expect(res.customerStatus).toBe('RECEIVED_CONFIRMED')
      expect(res.orderStatus).toBe('COMPLETED')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).toHaveBeenCalledWith(
        expect.objectContaining({
          customerStatus: 'RECEIVED_CONFIRMED',
          operationalStatus: 'FULFILMENT_CLOSED',
          payableStatusUpdate: expect.objectContaining({
            status: 'ELIGIBLE_FOR_PAYOUT',
            eligibleAt: expect.any(Date),
          }),
          checkAllSubOrdersCompleted: true,
          event: expect.objectContaining({
            status: 'RECEIVED_CONFIRMED',
            actorType: 'TENANT',
            isCustomerVisible: true,
          }),
        }),
      )
    })

    it('should return idempotent success if sub-order is already confirmed', async () => {
      const alreadyConfirmed: CommerceVendorSuborder = {
        ...mockProductSubOrder,
        customerStatus: 'RECEIVED_CONFIRMED',
        tenantConfirmedAt: new Date('2026-11-05T09:00:00Z'),
        order: mockMasterOrder,
      }
      mockOrderRepo.findSubOrderByUuid.mockResolvedValue(alreadyConfirmed)

      const res = await tenantConfirmReceiptUseCase.execute(1, 'suborder-prod-uuid')

      expect(res.success).toBe(true)
      expect(res.message).toContain('already been confirmed')
      expect(mockOrderRepo.executeSubOrderFulfilmentTransition).not.toHaveBeenCalled()
    })
  })

  describe('Customer Visibility & Data Sanitization', () => {
    it('should hide internal operational notes and non-visible events from tenant order detail', async () => {
      const subOrderWithInternalEvents: CommerceVendorSuborder = {
        ...mockProductSubOrder,
        adminOperationalNotes: 'Vendor packaging damaged on arrival; carrier repacked box.',
        fulfilmentEvents: [
          {
            id: 1,
            uuid: 'ev-visible',
            subOrderId: 100,
            status: 'ORDER_CONFIRMED',
            title: 'Order Confirmed',
            description: 'Order confirmed with vendor',
            isCustomerVisible: true,
            actorType: 'SYSTEM',
            createdAt: new Date(),
          },
          {
            id: 2,
            uuid: 'ev-internal',
            subOrderId: 100,
            status: 'PROCESSING',
            title: 'Internal Carrier Flag',
            description: 'Courier warehouse queue backlog: 2 hour delay',
            isCustomerVisible: false,
            actorType: 'ADMIN',
            createdAt: new Date(),
          },
        ],
      }

      mockOrderRepo.findOrderByUuid.mockResolvedValue({
        ...mockMasterOrder,
        subOrders: [subOrderWithInternalEvents],
      })

      const tenantView = await tenantGetOrderDetailUseCase.execute(1, 'order-master-uuid')

      const subOrder = tenantView.subOrders[0]!
      // Only the visible event should be exposed
      expect(subOrder.fulfilmentEvents).toHaveLength(1)
      expect(subOrder.fulfilmentEvents[0]!.uuid).toBe('ev-visible')
      // Internal admin operational notes should NOT exist on tenant DTO
      expect((subOrder as any).adminOperationalNotes).toBeUndefined()
      // Vendor payout should NOT exist on tenant DTO
      expect((subOrder as any).vendorPayoutKobo).toBeUndefined()
    })
  })
})
