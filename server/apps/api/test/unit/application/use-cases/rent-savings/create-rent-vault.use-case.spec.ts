import { BadRequestException, ConflictException } from '@nestjs/common'
import { CreateRentVaultUseCase } from '@application/use-cases/rent-savings/create-rent-vault.use-case'
import { IRentVaultRepository } from '@domains/rent-savings/rent-vault.repository'
import { UserRepository } from '@domains/users/user.repository'

describe('CreateRentVaultUseCase', () => {
  let useCase: CreateRentVaultUseCase
  let rentVaultRepo: jest.Mocked<IRentVaultRepository>
  let userRepo: jest.Mocked<UserRepository>
  let prisma: any

  const mockUserVerified = {
    id: 10,
    uuid: 'user-uuid-10',
    email: 'tenant@upward.africa',
    emailHash: 'hash',
    firstName: 'Amaka',
    firstNameHash: 'hash',
    lastName: 'Eze',
    lastNameHash: 'hash',
    isIdentityVerified: true,
    isFromWaitlist: false,
    isFromInvite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    passwordHash: 'hash',
  }

  beforeEach(() => {
    rentVaultRepo = {
      create: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: 1,
          uuid: 'vault-uuid-001',
          ...dto,
          currentPrincipalKobo: 0n,
          accruedYieldKobo: 0n,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
      findActiveByUserId: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findActiveVaults: jest.fn(),
      findByDvaAccountNumber: jest.fn(),
      findMaturedLockedVaults: jest.fn(),
      update: jest.fn(),
      incrementBalances: jest.fn(),
      createTransaction: jest.fn(),
      findTransactionsByVaultId: jest.fn(),
      findTransactionByReference: jest.fn(),
      upsertSavingsScore: jest.fn().mockResolvedValue({} as any),
      findSavingsScoreByVaultId: jest.fn(),
    }

    userRepo = {
      findById: jest.fn().mockResolvedValue(mockUserVerified),
    } as any

    prisma = {
      upward_kyc_verification: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          userId: 10,
          status: 'VERIFIED',
          armCustomerMembershipId: 'ARM-MEM-555',
          armCrmAccountNumber: 'ARM-CRM-444',
          armSyncStatus: 'Approved',
        }),
      },
    }

    useCase = new CreateRentVaultUseCase(rentVaultRepo, userRepo, prisma)
  })

  it('should block unverified user from creating a rent vault', async () => {
    userRepo.findById.mockResolvedValueOnce({
      ...mockUserVerified,
      isIdentityVerified: false,
    })

    const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    await expect(
      useCase.execute(10, {
        target_amount_kobo: 240000000,
        contractual_due_date: futureDate,
        cadence: 'MONTHLY',
        preferred_funding_method: 'DVA',
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('should prevent creating a second active vault if one is already active', async () => {
    rentVaultRepo.findActiveByUserId.mockResolvedValueOnce({
      id: 99,
      uuid: 'existing-vault',
    } as any)

    const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    await expect(
      useCase.execute(10, {
        target_amount_kobo: 240000000,
        contractual_due_date: futureDate,
        cadence: 'MONTHLY',
        preferred_funding_method: 'DVA',
      }),
    ).rejects.toThrow(ConflictException)
  })

  it('should create and lock vault linking ARM membership and generating dedicated account name', async () => {
    const futureDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    const result = await useCase.execute(10, {
      target_amount_kobo: 240000000,
      contractual_due_date: futureDate,
      cadence: 'MONTHLY',
      preferred_funding_method: 'DVA',
    })

    expect(result.status).toBe('success')
    expect(result.data.vault_id).toBe('vault-uuid-001')
    expect(result.data.lock_status).toBe('LOCKED')

    expect(rentVaultRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 10,
        lockStatus: 'LOCKED',
        dvaAccountName: 'Upward / Amaka Eze',
        investmentProvider: 'ARM',
        providerMembershipId: 'ARM-MEM-555',
        providerAccountNumber: 'ARM-CRM-444',
        providerCrmStatus: 'Approved',
      }),
    )

    // Baseline savings score initialized
    expect(rentVaultRepo.upsertSavingsScore).toHaveBeenCalledWith(
      1,
      10,
      expect.objectContaining({ totalScore: 20 }),
    )
  })
})
