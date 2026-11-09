import { ExecuteLandlordSettlementUseCase } from '@application/use-cases/rent-savings/execute-landlord-settlement.use-case'

describe('ExecuteLandlordSettlementUseCase (Rent Vault Settlement -> Upward Score Sync)', () => {
  let useCase: ExecuteLandlordSettlementUseCase
  let rentVaultRepo: any
  let rentAdvanceRepo: any
  let rentSettlementRepo: any
  let providerRegistry: any
  let rentCycleRepo: any
  let prisma: any

  beforeEach(() => {
    rentVaultRepo = {
      findByUuid: jest.fn(),
      createTransaction: jest.fn(),
      update: jest.fn(),
      findSavingsScoreByVaultId: jest.fn(),
      upsertSavingsScore: jest.fn(),
    }
    rentAdvanceRepo = {
      findActiveByVaultId: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    }
    rentSettlementRepo = {
      create: jest.fn(),
    }
    providerRegistry = {
      getProvider: jest.fn().mockReturnValue({
        redeem: jest.fn().mockResolvedValue({ withdrawalId: 'ARM_WD_001' }),
      }),
    }
    rentCycleRepo = {
      create: jest.fn().mockResolvedValue({ id: 500, uuid: 'rc-vault-500' }),
    }
    prisma = {
      upward_user_property: {
        findFirst: jest.fn().mockResolvedValue({ id: 42 }),
      },
    }

    useCase = new ExecuteLandlordSettlementUseCase(
      rentVaultRepo,
      rentAdvanceRepo,
      rentSettlementRepo,
      providerRegistry,
      rentCycleRepo,
      prisma,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('records a verified RENT_VAULT rent cycle and boosts the savings score when settling within the T-30 window', async () => {
    const now = new Date('2026-10-20T00:00:00Z')
    jest.useFakeTimers().setSystemTime(now)

    const contractualDueDate = new Date('2026-11-01T00:00:00Z') // 12 days remaining (inside T-30 window)
    const unlockDate = new Date('2026-10-02T00:00:00Z')

    rentVaultRepo.findByUuid.mockResolvedValueOnce({
      id: 9,
      uuid: 'vault-uuid-9',
      userId: 7,
      targetAmountKobo: 200000000n, // ₦2,000,000
      currentPrincipalKobo: 190000000n,
      accruedYieldKobo: 10000000n,
      contractualDueDate,
      unlockDate,
      lockStatus: 'SETTLEMENT_READY',
      autoBypassPmApproval: true,
      investmentProvider: 'ARM',
    })

    rentVaultRepo.findSavingsScoreByVaultId.mockResolvedValueOnce({
      totalScore: 85,
      historyLog: [],
    })

    const res = await useCase.execute(7, 'vault-uuid-9', {
      landlord_bank_code: '058',
      landlord_account_number: '0123456789',
      landlord_name: 'Palm View Estates',
      property_address: '14 Glover Road, Ikoyi',
    })

    expect(res.status).toBe('success')
    expect(rentVaultRepo.upsertSavingsScore).toHaveBeenCalledWith(
      9,
      7,
      expect.objectContaining({
        totalScore: 100,
      }),
    )
    expect(rentCycleRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        userPropertyId: 42,
        source: 'RENT_VAULT',
        amountOwed: 2000000,
        amountPaid: 2000000,
        dueDate: contractualDueDate,
        paidAt: now,
        status: 'PAID_ON_TIME',
      }),
    )
  })
})
