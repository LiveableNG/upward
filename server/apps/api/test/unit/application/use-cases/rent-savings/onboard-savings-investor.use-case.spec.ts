import { BadRequestException } from '@nestjs/common'
import { OnboardSavingsInvestorUseCase } from '@application/use-cases/rent-savings/onboard-savings-investor.use-case'
import { UserRepository } from '@domains/users/user.repository'
import { IKycProvider } from '@domains/kyc/kyc-provider.interface'
import { IKycRepository } from '@domains/kyc/kyc.repository'
import { IPaymentGateway } from '@domains/payments/payment.repository'
import { IAssetManagementProvider } from '@domains/rent-savings/asset-management.provider'
import { EncryptionService } from '../../../../../src/shared/infrastructure/common/encryption.service'
import { PrismaService } from '../../../../../src/shared/infrastructure/prisma/prisma.service'

describe('OnboardSavingsInvestorUseCase', () => {
  let useCase: OnboardSavingsInvestorUseCase
  let userRepo: jest.Mocked<UserRepository>
  let kycProvider: jest.Mocked<IKycProvider>
  let kycRepo: jest.Mocked<IKycRepository>
  let paymentGateway: jest.Mocked<IPaymentGateway>
  let armProvider: jest.Mocked<IAssetManagementProvider>
  let encryptionService: EncryptionService
  let prisma: any

  const mockUser = {
    id: 42,
    uuid: 'user-uuid-42',
    email: 'chinedu@example.com',
    emailHash: 'hash',
    firstName: 'Chinedu',
    firstNameHash: 'hash',
    lastName: 'Okonkwo',
    lastNameHash: 'hash',
    phone: '08012345678',
    passwordHash: 'hash',
    isIdentityVerified: false,
    isFromWaitlist: false,
    isFromInvite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    userRepo = {
      findById: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue({ ...mockUser, isIdentityVerified: true }),
    } as any

    kycProvider = {
      verify: jest.fn().mockResolvedValue({
        success: true,
        provider: 'MONNIFY',
        firstName: 'Chinedu',
        lastName: 'Okonkwo',
        dateOfBirth: '1992-04-18',
        gender: 'Male',
        photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        data: {
          firstName: 'Chinedu',
          lastName: 'Okonkwo',
          dateOfBirth: '1992-04-18',
          gender: 'Male',
          image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        },
      }),
    } as any

    kycRepo = {
      create: jest.fn(),
      findByHash: jest.fn().mockResolvedValue(null),
      findVerifiedByHash: jest.fn().mockResolvedValue(null),
      findByUserId: jest.fn().mockResolvedValue([]),
      findLatestVerifiedByUserId: jest.fn().mockResolvedValue(null),
    }

    paymentGateway = {
      getBanks: jest.fn(),
      verifyAccountNumber: jest.fn(),
      createDedicatedVirtualAccount: jest.fn(),
      chargeAuthorization: jest.fn(),
      checkTransactionStatus: jest.fn(),
      createCustomer: jest.fn().mockResolvedValue({ customerCode: 'CUST_123' }),
    } as any

    armProvider = {
      providerName: 'ARM',
      getYieldMetrics: jest.fn(),
      onboardInvestor: jest.fn().mockResolvedValue({
        success: true,
        status: 'Submitted',
        customerId: 'ARM-CUST-999',
        customerMembershipId: 'ARM-MEM-888',
        crmAccountNumber: 'ARM-CRM-777',
      }),
      subscribe: jest.fn(),
      redeem: jest.fn(),
      getPortfolio: jest.fn(),
    }

    encryptionService = new EncryptionService()

    prisma = {
      upward_kyc_verification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1, uuid: 'kyc-uuid' }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      upward_user_bank_details: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    } as any

    useCase = new OnboardSavingsInvestorUseCase(
      prisma,
      encryptionService,
      userRepo,
      kycProvider,
      kycRepo,
      paymentGateway,
      armProvider,
    )
  })

  it('should reject invalid BVN length', async () => {
    await expect(
      useCase.execute(42, {
        bvn: '12345',
        mothers_maiden_name: 'Adewale',
        occupation: 'Engineer',
        source_of_funds: 'Salary',
        next_of_kin_name: 'Amaka Okonkwo',
        next_of_kin_relationship: 'Spouse',
        next_of_kin_phone: '08099887766',
        settlement_bank_code: '058',
        settlement_account_number: '0123456789',
        settlement_account_name: 'Chinedu Okonkwo',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should successfully verify with Monnify and dispatch full Bitmask 63 to ARM', async () => {
    const result = await useCase.execute(42, {
      bvn: '22222222222',
      mothers_maiden_name: 'Adewale',
      occupation: 'Engineer',
      source_of_funds: 'Salary',
      income_range: '1M-5M',
      next_of_kin_name: 'Amaka Okonkwo',
      next_of_kin_relationship: 'Spouse',
      next_of_kin_phone: '08099887766',
      settlement_bank_code: '058',
      settlement_account_number: '0123456789',
      settlement_account_name: 'Chinedu Okonkwo',
    })

    expect(result.status).toBe('success')
    expect(result.data.is_verified).toBe(true)
    expect(result.data.provider).toBe('MONNIFY')

    // Verify user update
    expect(userRepo.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        isIdentityVerified: true,
        gender: 'Male',
        dateOfBirth: '1992-04-18',
      }),
    )

    // Verify ARM dispatch with documents extracted from Monnify photo
    expect(armProvider.onboardInvestor).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'chinedu@example.com',
        documents: expect.objectContaining({
          passport: '/9j/4AAQSkZJRg...',
          bvn_passport: '/9j/4AAQSkZJRg...',
        }),
      }),
    )
  })

  it('should reject if BVN has already been registered and verified by another user', async () => {
    kycRepo.findVerifiedByHash.mockResolvedValueOnce({
      id: 99,
      userId: 100, // different user
      idType: 'BVN',
      status: 'VERIFIED',
    } as any)

    await expect(
      useCase.execute(42, {
        bvn: '22222222222',
        mothers_maiden_name: 'Adewale',
        occupation: 'Engineer',
        source_of_funds: 'Salary',
        next_of_kin_name: 'Amaka Okonkwo',
        next_of_kin_relationship: 'Spouse',
        next_of_kin_phone: '08099887766',
        settlement_bank_code: '058',
        settlement_account_number: '0123456789',
        settlement_account_name: 'Chinedu Okonkwo',
      }),
    ).rejects.toThrow(BadRequestException)
  })
})
