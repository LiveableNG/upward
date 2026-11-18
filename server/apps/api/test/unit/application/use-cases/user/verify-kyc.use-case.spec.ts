import { BadRequestException, NotFoundException } from '@nestjs/common'
import { VerifyKycUseCase } from '@application/use-cases/user/verify-kyc.use-case'
import { UserRepository } from '@domains/users/user.repository'
import { IKycProvider } from '@domains/kyc/kyc-provider.interface'
import { IKycRepository } from '@domains/kyc/kyc.repository'
import { IPaymentGateway } from '@domains/payments/payment.repository'

describe('VerifyKycUseCase', () => {
  let useCase: VerifyKycUseCase
  let userRepository: jest.Mocked<UserRepository>
  let kycProvider: jest.Mocked<IKycProvider>
  let kycRepository: jest.Mocked<IKycRepository>
  let paymentGateway: jest.Mocked<IPaymentGateway>

  const mockUser = {
    id: 1,
    uuid: 'user-uuid-123',
    email: 'user@example.com',
    emailHash: 'hash',
    firstName: 'Chinedu',
    firstNameHash: 'hash',
    lastName: 'Okonkwo',
    lastNameHash: 'hash',
    passwordHash: 'hash',
    isFromWaitlist: false,
    isFromInvite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    dateOfBirth: '1995-05-15',
  }

  beforeEach(() => {
    userRepository = {
      findByUuid: jest.fn().mockResolvedValue(mockUser),
      update: jest.fn().mockResolvedValue({ ...mockUser, isIdentityVerified: true }),
      findByEmail: jest.fn(),
      findByProviderId: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByPhone: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      updatePmTenantEmail: jest.fn(),
    } as any

    kycProvider = {
      verify: jest.fn(),
    }

    kycRepository = {
      create: jest.fn().mockResolvedValue({} as any),
      findByHash: jest.fn().mockResolvedValue(null),
      findVerifiedByHash: jest.fn().mockResolvedValue(null),
      findByUserId: jest.fn().mockResolvedValue([]),
      findLatestVerifiedByUserId: jest.fn().mockResolvedValue(null),
    }

    paymentGateway = {
      getBanks: jest.fn(),
      verifyAccountNumber: jest.fn(),
      verifyTransaction: jest.fn(),
      initializeTransaction: jest.fn(),
      findOrCreateSubaccount: jest.fn(),
      createCustomer: jest.fn().mockResolvedValue('CUS_test123'),
      createDedicatedAccount: jest.fn(),
      initiateTransfer: jest.fn(),
      validateCustomerIdentification: jest
        .fn()
        .mockResolvedValue({ status: true, message: 'Success' }),
    }

    useCase = new VerifyKycUseCase(userRepository, kycProvider, kycRepository, paymentGateway)
  })

  it('should throw BadRequestException for invalid ID length', async () => {
    await expect(
      useCase.execute('user-uuid-123', { type: 'BVN', idNumber: '123' }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should throw NotFoundException if user is not found', async () => {
    userRepository.findByUuid.mockResolvedValueOnce(null)
    await expect(
      useCase.execute('unknown-uuid', { type: 'BVN', idNumber: '11111111111' }),
    ).rejects.toThrow(NotFoundException)
  })

  it('should prevent fraud if ID number is already verified under another account', async () => {
    kycRepository.findVerifiedByHash.mockResolvedValueOnce({
      id: 99,
      uuid: 'rec-uuid',
      userId: 2, // different user
      idType: 'BVN',
      idNumberHash: 'some-hash',
      idNumberMasked: '*******1111',
      provider: 'MOCK',
      status: 'VERIFIED',
    })

    await expect(
      useCase.execute('user-uuid-123', { type: 'BVN', idNumber: '11111111111' }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should verify user successfully with BVN and sync Paystack customer', async () => {
    kycProvider.verify.mockResolvedValueOnce({
      success: true,
      message: 'Verified',
      idType: 'BVN',
      firstName: 'Chinedu',
      lastName: 'Okonkwo',
      dateOfBirth: '1995-05-15',
      provider: 'MOCK',
      providerReference: 'ref-1',
    })

    const result = await useCase.execute('user-uuid-123', { type: 'BVN', idNumber: '11111111111' })

    expect(result.success).toBe(true)
    expect(userRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ isIdentityVerified: true }),
    )
    expect(kycRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'VERIFIED', idType: 'BVN' }),
    )
    expect(paymentGateway.createCustomer).toHaveBeenCalled()
    expect(paymentGateway.validateCustomerIdentification).toHaveBeenCalledWith(
      expect.objectContaining({ customerCode: 'CUS_test123', type: 'bvn', value: '11111111111' }),
    )
  })

  it('should verify user successfully with NIN', async () => {
    kycProvider.verify.mockResolvedValueOnce({
      success: true,
      message: 'Verified',
      idType: 'NIN',
      firstName: 'Chinedu',
      lastName: 'Okonkwo',
      dateOfBirth: '1995-05-15',
      provider: 'MOCK',
      providerReference: 'ref-nin-1',
    })

    const result = await useCase.execute('user-uuid-123', { type: 'NIN', idNumber: '11111111111' })

    expect(result.success).toBe(true)
    expect(userRepository.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ isIdentityVerified: true }),
    )
    expect(kycRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'VERIFIED', idType: 'NIN' }),
    )
  })

  it('should return failure if names do not match', async () => {
    kycProvider.verify.mockResolvedValueOnce({
      success: true,
      message: 'Verified',
      idType: 'BVN',
      firstName: 'Emeka',
      lastName: 'Adeleke',
      dateOfBirth: '1995-05-15',
      provider: 'MOCK',
    })

    const result = await useCase.execute('user-uuid-123', { type: 'BVN', idNumber: '22222222222' })

    expect(result.success).toBe(false)
    expect(result.message).toContain('do not match')
    expect(kycRepository.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILED' }))
    expect(userRepository.update).not.toHaveBeenCalled()
  })
})
