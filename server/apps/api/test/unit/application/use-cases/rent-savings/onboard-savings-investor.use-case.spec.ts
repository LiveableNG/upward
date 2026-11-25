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
      upward_user_property: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      upward_rent_vault: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 10 }),
      },
      upward_rent_savings_score: {
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

  const validBaseDto = {
    bvn: '22222222222',
    nin: '11122233344',
    means_of_id_type: 'NIN' as const,
    means_of_id_doc_key: 'users/user-uuid-42/arm-kyc/id_card/nin-slip.jpg',
    means_of_id_mime_type: 'image/jpeg',
    means_of_id_file_name: 'nin-slip.jpg',
    residential_address_number: '14',
    residential_street: 'Admiralty Way, Lekki Phase 1',
    residential_town: 'Lekki',
    residential_state: 'Lagos',
    utility_bill_doc_key: 'users/user-uuid-42/arm-kyc/utility_bill/ekedc-bill.pdf',
    utility_bill_mime_type: 'application/pdf',
    utility_bill_file_name: 'ekedc-bill.pdf',
    consent_accepted: true,
    mothers_maiden_name: 'Adewale',
    occupation: 'Engineer',
    source_of_funds: 'Salary' as const,
    income_range: '1M-5M',
    next_of_kin_name: 'Amaka Okonkwo',
    next_of_kin_relationship: 'Spouse',
    next_of_kin_phone: '08099887766',
    target_amount: 2500000,
    rent_due_date: '2027-10-15',
  }

  it('should reject invalid BVN length', async () => {
    await expect(
      useCase.execute(42, {
        ...validBaseDto,
        bvn: '12345',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should reject missing or invalid NIN even when BVN is valid', async () => {
    await expect(
      useCase.execute(42, {
        ...validBaseDto,
        nin: '12345',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should reject when T&C and ARM Consent Mandate is not accepted', async () => {
    await expect(
      useCase.execute(42, {
        ...validBaseDto,
        consent_accepted: false,
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should reject KYC documents belonging to a different user (IDOR protection)', async () => {
    await expect(
      useCase.execute(42, {
        ...validBaseDto,
        utility_bill_doc_key: 'users/other-user-uuid/arm-kyc/utility_bill/stolen.pdf',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should successfully verify BVN and NIN via KYC provider and dispatch real KYC docs to ARM', async () => {
    const result = await useCase.execute(42, {
      ...validBaseDto,
      settlement_bank_code: '058',
      settlement_account_number: '0123456789',
      settlement_account_name: 'Chinedu Okonkwo',
    })

    expect(result.status).toBe('success')
    expect(result.data.is_verified).toBe(true)
    expect(result.data.has_completed_arm_kyc).toBe(true)
    expect(result.data.masked_nin).toBe('*******3344')
    expect(result.data.provider).toBe('MONNIFY')

    // Verify BOTH BVN and NIN were verified via provider
    expect(kycProvider.verify).toHaveBeenCalledWith('BVN', '22222222222', expect.any(Object))
    expect(kycProvider.verify).toHaveBeenCalledWith('NIN', '11122233344', expect.any(Object))

    // Verify user update
    expect(userRepo.update).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        isIdentityVerified: true,
        gender: 'Male',
        dateOfBirth: '1992-04-18',
      }),
    )

    // Verify ARM dispatch with real NIN, real address, and uploaded doc metadata
    expect(armProvider.onboardInvestor).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'chinedu@example.com',
        kycDetails: expect.objectContaining({
          bvn: '22222222222',
          nin: '11122233344',
          meansOfIdentification: 'NIN',
          idNumber: '11122233344',
        }),
        address: expect.objectContaining({
          addressNumber: '14',
          streetName: 'Admiralty Way, Lekki Phase 1',
          town: 'Lekki',
          residentialStateCode: 'Lagos',
        }),
        documents: expect.objectContaining({
          passport: '/9j/4AAQSkZJRg...',
          bvn_passport: '/9j/4AAQSkZJRg...',
          id_card: expect.objectContaining({
            s3Key: 'users/user-uuid-42/arm-kyc/id_card/nin-slip.jpg',
            mimeType: 'image/jpeg',
            fileName: 'nin-slip.jpg',
          }),
          utility_bill: expect.objectContaining({
            s3Key: 'users/user-uuid-42/arm-kyc/utility_bill/ekedc-bill.pdf',
            mimeType: 'application/pdf',
            fileName: 'ekedc-bill.pdf',
          }),
        }),
      }),
    )
  })

  it('should successfully verify without settlement bank details', async () => {
    const result = await useCase.execute(42, {
      ...validBaseDto,
    })

    expect(result.status).toBe('success')
    expect(result.data.is_verified).toBe(true)
    expect(prisma.upward_user_bank_details.upsert).not.toHaveBeenCalled()
    expect(armProvider.onboardInvestor).toHaveBeenCalledWith(
      expect.objectContaining({
        customerEmail: 'chinedu@example.com',
        bankDetails: undefined,
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
        ...validBaseDto,
        settlement_bank_code: '058',
        settlement_account_number: '0123456789',
        settlement_account_name: 'Chinedu Okonkwo',
      }),
    ).rejects.toThrow(BadRequestException)
  })
})
