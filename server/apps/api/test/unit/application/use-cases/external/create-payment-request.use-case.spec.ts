import { BadRequestException, NotFoundException } from '@nestjs/common'
import {
  CreateExternalPaymentRequestUseCase,
  ExternalPaymentRequestPayload,
} from '@application/use-cases/external/create-payment-request.use-case'
import { SingleInviteUseCase, InviteRequest } from '@application/use-cases/external/single-invite.use-case'
import { UserRepository } from '@domains/users/user.repository'
import { PropertyRepository } from '@domains/companies/property.repository'
import {
  IPaymentRequestRepository,
  IPaymentGateway,
  PaystackSubaccount,
} from '@domains/payments/payment.repository'
import { NotificationRepository } from '@domains/notifications/notification.repository'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  uuid: 'user-uuid-001',
  email: 'tenant@example.com',
  firstName: 'Ada',
  lastName: 'Obi',
  passwordHash: 'hashed-password',
  isFromInvite: false,
  isFromWaitlist: false,
  emailHash: 'hash',
  firstNameHash: 'hash',
  lastNameHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeProperty = (overrides: Partial<any> = {}) => ({
  id: 30,
  uuid: 'property-uuid-001',
  userId: 1,
  companyId: 10,
  managerId: 20,
  locationId: 40,
  rentAmount: 500000,
  currency: 'NGN',
  rentEndDate: new Date('2026-12-31'),
  company: { name: 'Acme Properties' },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makePaymentRequest = (overrides: Partial<any> = {}) => ({
  id: 100,
  uuid: 'pay-req-uuid-001',
  userId: 1,
  userPropertyId: 30,
  amount: 500000,
  currency: 'NGN',
  description: 'Monthly rent for January',
  dueDate: new Date('2026-02-01'),
  status: 'PENDING',
  reference: 'EXT_abc123_1234567890',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeSubaccount = (overrides: Partial<any> = {}): PaystackSubaccount => ({
  id: 5,
  uuid: 'sub-uuid-001',
  accountNumber: '2001234567',
  bankCode: '058',
  subaccountCode: 'ACCT_xxxxxxxxx',
  businessName: 'Acme Properties',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeNotification = (overrides: Partial<any> = {}) => ({
  id: 1,
  uuid: 'notif-uuid-001',
  userId: 1,
  title: 'New Payment Request',
  message: 'You have a new payment request',
  type: 'PAYMENT',
  url: '/pay/pay-req-uuid-001',
  isRead: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const validInviteRequest = (): InviteRequest => ({
  company: { name: 'Acme Properties', address: '123 VI' },
  invite: {
    user: { email: 'tenant@example.com', firstName: 'Ada', lastName: 'Obi' },
    property: {
      location: { country: 'Nigeria', state: 'Lagos', area: 'Lekki' },
      rent: { rentAmount: 500000, rentStartDate: '2026-01-01', rentEndDate: '2026-12-31' },
      manager: { firstName: 'Grace', lastName: 'Adams', email: 'grace@acme.com' },
    },
  },
})

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('CreateExternalPaymentRequestUseCase', () => {
  let useCase: CreateExternalPaymentRequestUseCase
  let singleInviteUseCase: jest.Mocked<Pick<SingleInviteUseCase, 'setupInviteContext'>>
  let userRepository: jest.Mocked<UserRepository>
  let propertyRepository: jest.Mocked<PropertyRepository>
  let paymentRequestRepository: jest.Mocked<IPaymentRequestRepository>
  let notificationRepository: jest.Mocked<NotificationRepository>
  let paymentGateway: jest.Mocked<IPaymentGateway>

  const validBankDetails = {
    bankCode: '058',
    accountNumber: '2001234567',
  }

  beforeEach(() => {
    singleInviteUseCase = {
      setupInviteContext: jest.fn(),
    }

    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    propertyRepository = {
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    paymentRequestRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndStatus: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    } as any

    notificationRepository = {
      createNotification: jest.fn(),
      createAnnouncement: jest.fn(),
      findActiveAnnouncement: jest.fn(),
      findAllAnnouncements: jest.fn(),
      deactivateAllAnnouncements: jest.fn(),
      getAnnouncementState: jest.fn(),
      upsertAnnouncementState: jest.fn(),
      findUserNotifications: jest.fn(),
      markNotificationAsRead: jest.fn(),
      countUnreadNotifications: jest.fn(),
    } as any

    paymentGateway = {
      getBanks: jest.fn(),
      verifyAccountNumber: jest.fn(),
      verifyTransaction: jest.fn(),
      initializeTransaction: jest.fn(),
      findOrCreateSubaccount: jest.fn(),
    } as any

    useCase = new CreateExternalPaymentRequestUseCase(
      singleInviteUseCase as any,
      userRepository,
      propertyRepository,
      paymentRequestRepository,
      notificationRepository,
      paymentGateway,
    )
  })

  // ─── Property Resolution ──────────────────────────────────────────────────

  describe('Property resolution', () => {
    it('should resolve property by userPropertyUuid when provided', async () => {
      propertyRepository.findByUuid.mockResolvedValue(makeProperty())
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())
      userRepository.findById.mockResolvedValue(makeUser())
      notificationRepository.createNotification.mockResolvedValue(makeNotification())

      const payload: ExternalPaymentRequestPayload = {
        userPropertyUuid: 'property-uuid-001',
        dueDate: '2026-02-01',
        ...validBankDetails,
      }

      await useCase.execute(payload, 99)

      expect(propertyRepository.findByUuid).toHaveBeenCalledWith('property-uuid-001')
      expect(singleInviteUseCase.setupInviteContext).not.toHaveBeenCalled()
    })

    it('should throw NotFoundException if userPropertyUuid provided but not found', async () => {
      propertyRepository.findByUuid.mockResolvedValue(null)

      const payload: ExternalPaymentRequestPayload = {
        userPropertyUuid: 'non-existent-uuid',
        dueDate: '2026-02-01',
        ...validBankDetails,
      }

      await expect(useCase.execute(payload, 99)).rejects.toThrow(NotFoundException)
    })

    it('should resolve property via invite when invite data is provided', async () => {
      const mockContext = {
        user: makeUser(),
        company: { id: 10, uuid: 'company-uuid-001', name: 'Acme' },
        manager: { id: 20, uuid: 'mgr-uuid', email: 'mgr@acme.com' },
        property: makeProperty(),
        location: { id: 40, uuid: 'loc-uuid', country: 'Nigeria' },
      }
      singleInviteUseCase.setupInviteContext.mockResolvedValue(mockContext as any)
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())
      userRepository.findById.mockResolvedValue(makeUser())
      notificationRepository.createNotification.mockResolvedValue(makeNotification())

      const payload: ExternalPaymentRequestPayload = {
        invite: validInviteRequest(),
        dueDate: '2026-02-01',
        ...validBankDetails,
      }

      await useCase.execute(payload, 99)

      expect(singleInviteUseCase.setupInviteContext).toHaveBeenCalledWith(
        validInviteRequest(),
        99,
      )
    })

    it('should throw BadRequestException when neither userPropertyUuid nor invite is provided', async () => {
      const payload: ExternalPaymentRequestPayload = {
        dueDate: '2026-02-01',
        ...validBankDetails,
      }

      await expect(useCase.execute(payload, 99)).rejects.toThrow(BadRequestException)
    })
  })

  // ─── Amount and Currency ──────────────────────────────────────────────────

  describe('Amount and currency fallback', () => {
    beforeEach(() => {
      propertyRepository.findByUuid.mockResolvedValue(makeProperty())
      userRepository.findById.mockResolvedValue(makeUser())
      notificationRepository.createNotification.mockResolvedValue(makeNotification())
    })

    it('should use payload.amount when explicitly provided', async () => {
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest({ amount: 750000 }))

      await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', amount: 750000, dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      expect(paymentRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 750000 }),
      )
    })

    it('should fall back to property.rentAmount when payload.amount not provided', async () => {
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())

      await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      expect(paymentRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 500000 }),
      )
    })

    it('should use payload.currency when explicitly provided', async () => {
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest({ currency: 'USD' }))

      await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', currency: 'USD', dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      expect(paymentRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'USD' }),
      )
    })

    it('should fall back to property.currency when payload.currency not provided', async () => {
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())

      await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      expect(paymentRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'NGN' }),
      )
    })
  })

  // ─── Subaccount (Bank Routing) ────────────────────────────────────────────

  describe('Subaccount creation', () => {
    beforeEach(() => {
      propertyRepository.findByUuid.mockResolvedValue(makeProperty())
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())
      userRepository.findById.mockResolvedValue(makeUser())
      notificationRepository.createNotification.mockResolvedValue(makeNotification())
    })

    it('should call findOrCreateSubaccount when bankCode and accountNumber are provided', async () => {
      paymentGateway.findOrCreateSubaccount.mockResolvedValue(makeSubaccount())

      await useCase.execute(
        {
          userPropertyUuid: 'property-uuid-001',
          bankCode: '058',
          accountNumber: '2001234567',
          dueDate: '2026-02-01',
        },
        99,
      )

      expect(paymentGateway.findOrCreateSubaccount).toHaveBeenCalledWith({
        businessName: 'Acme Properties',
        bankCode: '058',
        accountNumber: '2001234567',
      })
    })

    it('should set subaccountId on payment request when subaccount is found', async () => {
      paymentGateway.findOrCreateSubaccount.mockResolvedValue(makeSubaccount({ id: 5 }))

      await useCase.execute(
        {
          userPropertyUuid: 'property-uuid-001',
          bankCode: '058',
          accountNumber: '2001234567',
          dueDate: '2026-02-01',
        },
        99,
      )

      expect(paymentRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ subaccountId: 5 }),
      )
    })

    it('should throw BadRequestException when bankCode or accountNumber is missing', async () => {
      await expect(useCase.execute(
        { userPropertyUuid: 'property-uuid-001', accountNumber: '2001234567', dueDate: '2026-02-01' },
        99,
      )).rejects.toThrow(BadRequestException)

      await expect(useCase.execute(
        { userPropertyUuid: 'property-uuid-001', bankCode: '058', dueDate: '2026-02-01' },
        99,
      )).rejects.toThrow(BadRequestException)
    })
  })

  // ─── Payment Request Creation ──────────────────────────────────────────────

  describe('Payment request creation', () => {
    beforeEach(() => {
      propertyRepository.findByUuid.mockResolvedValue(makeProperty())
      userRepository.findById.mockResolvedValue(makeUser())
      notificationRepository.createNotification.mockResolvedValue(makeNotification())
    })

    it('should create a payment request with PENDING status', async () => {
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())

      await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      expect(paymentRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING' }),
      )
    })

    it('should generate a reference starting with "EXT_"', async () => {
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())

      await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      const created = paymentRequestRepository.create.mock.calls[0]![0]
      expect(created.reference).toMatch(/^EXT_/)
    })
  })

  // ─── Notification Logic ───────────────────────────────────────────────────

  describe('Notifications', () => {
    beforeEach(() => {
      propertyRepository.findByUuid.mockResolvedValue(makeProperty())
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())
    })

    it('should send notification to activated (non-INVITED) users', async () => {
      userRepository.findById.mockResolvedValue(makeUser({ passwordHash: 'bcrypt-hash' }))
      notificationRepository.createNotification.mockResolvedValue(makeNotification())

      await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      expect(notificationRepository.createNotification).toHaveBeenCalled()
    })

    it('should NOT send notification to INVITED (not-yet-activated) users', async () => {
      userRepository.findById.mockResolvedValue(makeUser({ passwordHash: 'INVITED' }))

      await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      expect(notificationRepository.createNotification).not.toHaveBeenCalled()
    })
  })

  // ─── Return Value ──────────────────────────────────────────────────────────

  describe('Return value', () => {
    it('should return paymentUuid and paymentLink', async () => {
      propertyRepository.findByUuid.mockResolvedValue(makeProperty())
      paymentRequestRepository.create.mockResolvedValue(makePaymentRequest())
      userRepository.findById.mockResolvedValue(makeUser())
      notificationRepository.createNotification.mockResolvedValue(makeNotification())

      const result = await useCase.execute(
        { userPropertyUuid: 'property-uuid-001', dueDate: '2026-02-01', ...validBankDetails },
        99,
      )

      expect(result).toMatchObject({
        paymentUuid: 'pay-req-uuid-001',
      })
    })
  })
})
