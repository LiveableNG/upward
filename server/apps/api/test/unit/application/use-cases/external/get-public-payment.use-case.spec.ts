import { NotFoundException } from '@nestjs/common'
import { GetPublicPaymentDetailsUseCase } from '@application/use-cases/external/get-public-payment.use-case'
import { IPaymentRequestRepository, IPaymentLineItemRepository, PAYMENT_LINE_ITEM_REPOSITORY, IPaymentGateway } from '@domains/payments/payment.repository'
import { PropertyRepository } from '@domains/companies/property.repository'
import { UserRepository } from '@domains/users/user.repository'
import { CompanyRepository, ManagerRepository } from '@domains/companies/company.repository'
import { VerificationTokenRepository } from '@domains/auth/verification-token.repository'
import { PaymentConfigurationService } from '@shared/infrastructure/common/payment-config.service'


// ─── Fixtures ────────────────────────────────────────────────────────────────

const makePaymentRequest = (overrides: Partial<any> = {}) => ({
  id: 100,
  uuid: 'pay-req-uuid-001',
  userId: 1,
  userPropertyId: 30,
  amount: 500000,
  currency: 'NGN',
  description: 'January rent',
  lineItemRecords: [],
  dueDate: new Date('2026-02-01'),
  status: 'PENDING',
  subaccount: undefined,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  uuid: 'user-uuid-001',
  email: 'tenant@example.com',
  firstName: 'Ada',
  lastName: 'Obi',
  phone: '08012345678',
  passwordHash: 'bcrypt-hash',
  emailHash: 'hash',
  firstNameHash: 'hash',
  lastNameHash: 'hash',
  isFromWaitlist: false,
  isFromInvite: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeProperty = (overrides: Partial<any> = {}) => ({
  id: 30,
  uuid: 'prop-uuid',
  userId: 1,
  companyId: 10,
  managerId: 20,
  locationId: 40,
  rentAmount: 500000,
  amountPaid: 0,
  amountRemaining: 0,
  currency: 'NGN',
  rentEndDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeCompany = (overrides: Partial<any> = {}) => ({
  id: 10,
  uuid: 'comp-uuid',
  name: 'Acme Properties',
  address: '123 VI',
  ...overrides,
})

const makeManager = (overrides: Partial<any> = {}) => ({
  id: 20,
  uuid: 'mgr-uuid',
  firstName: 'Grace',
  lastName: 'Adeyemi',
  ...overrides,
})

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('GetPublicPaymentDetailsUseCase', () => {
  let useCase: GetPublicPaymentDetailsUseCase
  let paymentRequestRepository: jest.Mocked<IPaymentRequestRepository>
  let propertyRepository: jest.Mocked<PropertyRepository>
  let userRepository: jest.Mocked<UserRepository>
  let companyRepository: jest.Mocked<CompanyRepository>
  let managerRepository: jest.Mocked<ManagerRepository>
  let lineItemRepository: jest.Mocked<IPaymentLineItemRepository>
  let gateway: jest.Mocked<IPaymentGateway>
  let verificationTokenRepository: jest.Mocked<VerificationTokenRepository>
  let paymentConfig: jest.Mocked<PaymentConfigurationService>
  let prisma: jest.Mocked<any>

  beforeEach(() => {
    paymentConfig = {
      getDynamicProcessingRates: jest.fn().mockResolvedValue({
        transactionFee: 2000,
        benefitsFee: 0,
        rentValue: 500000,
      }),
    } as any

    prisma = {
      upward_transaction: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      upward_user_bank_details: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      upward_payment_proof: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as any

    paymentRequestRepository = {
      findByUuid: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserIdAndStatus: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    } as any

    propertyRepository = {
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByUserId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUuid: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    companyRepository = {
      findById: jest.fn(),
    } as any

    managerRepository = {
      findById: jest.fn(),
    } as any

    lineItemRepository = {
      findByPaymentRequestId: jest.fn().mockResolvedValue([]),
    } as any

    gateway = {
      verifyAccountNumber: jest.fn().mockResolvedValue({ accountName: 'Test Recipient' }),
    } as any

    verificationTokenRepository = {
      findByIdentifier: jest.fn(),
      create: jest.fn(),
    } as any

    useCase = new GetPublicPaymentDetailsUseCase(
      paymentRequestRepository,
      lineItemRepository,
      propertyRepository,
      userRepository,
      companyRepository,
      managerRepository,
      gateway,
      verificationTokenRepository,
      paymentConfig,
      prisma,
    )
  })

  describe('execute', () => {
    it('should throw NotFoundException if payment request does not exist', async () => {
      paymentRequestRepository.findByUuid.mockResolvedValue(null)

      await expect(useCase.execute('none')).rejects.toThrow(NotFoundException)
    })

    it('should return nested data for a public payment request', async () => {
      paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest() as any)
      userRepository.findById.mockResolvedValue(makeUser() as any)
      propertyRepository.findById.mockResolvedValue(makeProperty() as any)
      companyRepository.findById.mockResolvedValue(makeCompany() as any)
      managerRepository.findById.mockResolvedValue(makeManager() as any)

      const result = await useCase.execute('pay-req-uuid-001')

      expect(result.payment).toMatchObject({
        uuid: 'pay-req-uuid-001',
        amount: 500000,
        currency: 'NGN',
        status: 'PENDING',
      })
      expect(result.user).toMatchObject({
        firstName: 'Ada',
        lastName: 'Obi',
      })
      expect(result.company.name).toBe('Acme Properties')
      expect(result.manager.firstName).toBe('Grace')
    })

    it('should handle property without a manager', async () => {
      paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest() as any)
      userRepository.findById.mockResolvedValue(makeUser() as any)
      propertyRepository.findById.mockResolvedValue(makeProperty({ managerId: null }) as any)
      companyRepository.findById.mockResolvedValue(makeCompany() as any)

      const result = await useCase.execute('pay-req-uuid-001')

      expect(result.manager).toBeNull()
      expect(managerRepository.findById).not.toHaveBeenCalled()
    })

    it('should include subaccountCode when present in payment request', async () => {
      paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest({
        subaccount: { subaccountCode: 'ACCT_123' },
      }) as any)
      userRepository.findById.mockResolvedValue(makeUser() as any)
      propertyRepository.findById.mockResolvedValue(makeProperty() as any)
      companyRepository.findById.mockResolvedValue(makeCompany() as any)

      const result = await useCase.execute('pay-req-uuid-001')

      expect(result.payment.subaccountCode).toBe('ACCT_123')
    })

    it('should verify account number if subaccount details are present', async () => {
      paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest({
        subaccount: { accountNumber: '1234567890', bankCode: '044' },
      }) as any)
      userRepository.findById.mockResolvedValue(makeUser() as any)
      propertyRepository.findById.mockResolvedValue(makeProperty() as any)
      gateway.verifyAccountNumber.mockResolvedValue({ accountName: 'Verified Name' } as any)

      const result = await useCase.execute('pay-req-uuid-001')

      expect(gateway.verifyAccountNumber).toHaveBeenCalledWith('1234567890', '044')
      expect(result.payment.verifiedRecipientName).toBe('Verified Name')
    })
    
    it('should indicate hasPassword=false for INVITED users', async () => {
      paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest() as any)
      userRepository.findById.mockResolvedValue(makeUser({ passwordHash: 'INVITED' }) as any)
      propertyRepository.findById.mockResolvedValue(makeProperty() as any)
      companyRepository.findById.mockResolvedValue(makeCompany() as any)

      const result = await useCase.execute('pay-req-uuid-001')

      expect(result.hasPassword).toBe(false)
    })

    it('should indicate hasPassword=true for active users', async () => {
      paymentRequestRepository.findByUuid.mockResolvedValue(makePaymentRequest() as any)
      userRepository.findById.mockResolvedValue(makeUser({ passwordHash: '$2b$10$active-hash' }) as any)
      propertyRepository.findById.mockResolvedValue(makeProperty() as any)
      companyRepository.findById.mockResolvedValue(makeCompany() as any)

      const result = await useCase.execute('pay-req-uuid-001')

      expect(result.hasPassword).toBe(true)
    })
  })
})
