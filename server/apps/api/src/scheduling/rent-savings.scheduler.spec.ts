import { RentSavingsCalculatorEngine } from '../domains/rent-savings/rent-savings-calculator.engine'
import { RentSavingsScheduler } from './rent-savings.scheduler'

describe('RentSavingsScheduler — Dual Ledger Daily NAV Accrual', () => {
  const buildScheduler = (
    vaults: any[],
    options?: {
      armAnnualYieldRate?: number
      uninvestedArmJobs?: Array<{ vaultId: number | null; amountKobo: bigint }>
    },
  ) => {
    const treasuryUpserts: any[] = []
    const ledgerCreates: any[] = []
    const customerTxs: any[] = []
    const customerTxByRef = new Map<string, any>()
    const balanceIncrements: any[] = []
    const armRate = options?.armAnnualYieldRate ?? 0.1655

    const prisma: any = {
      upward_rent_vault: {
        findMany: jest.fn().mockResolvedValue(vaults),
      },
      upward_arm_job: {
        findMany: jest.fn().mockImplementation(async (args?: any) => {
          const jobs = options?.uninvestedArmJobs ?? []
          const vaultIdFilter = args?.where?.vaultId
          return vaultIdFilter !== undefined
            ? jobs.filter((j) => j.vaultId === vaultIdFilter)
            : jobs
        }),
      },
      upward_rent_advance: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      upward_vault_treasury_summary: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (args) => {
          treasuryUpserts.push(args.data)
          return args.data
        }),
        update: jest.fn().mockImplementation(async (args) => {
          treasuryUpserts.push(args.data)
          return args.data
        }),
      },
      upward_savings_internal_ledger: {
        create: jest.fn().mockImplementation(async (args) => {
          ledgerCreates.push(args.data)
          return args.data
        }),
      },
    }

    const rentVaultRepo: any = {
      findTransactionByReference: jest.fn().mockImplementation(async (ref: string) => {
        return customerTxByRef.get(ref) ?? null
      }),
      createTransaction: jest.fn().mockImplementation(async (tx) => {
        if (customerTxByRef.has(tx.reference)) {
          const err: any = new Error('Unique constraint failed')
          err.code = 'P2002'
          throw err
        }
        customerTxByRef.set(tx.reference, tx)
        customerTxs.push(tx)
        return tx
      }),
      incrementBalances: jest.fn().mockImplementation(async (id, p, y) => {
        balanceIncrements.push({ id, p, y })
      }),
      update: jest.fn().mockResolvedValue({}),
    }

    const rentAdvanceRepo: any = {}

    const providerRegistry: any = {
      getProvider: jest.fn().mockReturnValue({
        getYieldMetrics: jest.fn().mockResolvedValue({
          annualNetYieldRate: armRate,
          dailyYieldRate: RentSavingsCalculatorEngine.getEffectiveDailyRate(armRate),
        }),
      }),
    }

    const platformRates: any = {
      getRates: jest.fn().mockResolvedValue({
        savingsEnabled: true,
        savingsMode: 'LIVE',
        savingsAnnualRatePct: 16.0,
        rentProtecRatePct: 10.0,
        insurancePremiumPct: 2.0,
        savingsDailyRate: RentSavingsCalculatorEngine.getEffectiveDailyRate(0.16),
        rentProtecDailyRate: RentSavingsCalculatorEngine.getEffectiveDailyRate(0.1),
      }),
    }

    const scheduler = new RentSavingsScheduler(
      prisma,
      rentVaultRepo,
      rentAdvanceRepo,
      providerRegistry,
      platformRates,
    )

    return { scheduler, treasuryUpserts, ledgerCreates, customerTxs, balanceIncrements }
  }

  it('accrues RENT_PROTEC at 10% and SAVE_AND_EARN at 16% with separate internal treasury & 2% premium recovery', async () => {
    const vaults = [
      {
        id: 1,
        uuid: 'vault-rp-1',
        userId: 10,
        productOption: 'RENT_PROTEC',
        appliedAnnualRatePct: 10.0,
        targetAmountKobo: 200_000_000n, // NGN 2,000,000 -> 2% upfront premium = 4,000,000 kobo (NGN 40,000)
        currentPrincipalKobo: 100_000_000n, // NGN 1,000,000
        accruedYieldKobo: 0n,
        lockStatus: 'LOCKED',
      },
      {
        id: 2,
        uuid: 'vault-se-2',
        userId: 20,
        productOption: 'SAVE_AND_EARN',
        appliedAnnualRatePct: 16.0,
        targetAmountKobo: 200_000_000n,
        currentPrincipalKobo: 100_000_000n, // NGN 1,000,000
        accruedYieldKobo: 0n,
        lockStatus: 'LOCKED',
      },
    ]

    const { scheduler, treasuryUpserts, ledgerCreates, customerTxs } = buildScheduler(vaults)
    await scheduler.executeDailyNavAccrual()

    expect(customerTxs).toHaveLength(2)

    // 1. Customer Liability Ledger: Rent Protec earns 10% effective p.a. compounded daily, zero 2% deduction
    const rpTx = customerTxs.find((t) => t.vaultId === 1)
    const expectedRpDaily = BigInt(
      Math.round(100_000_000 * RentSavingsCalculatorEngine.getEffectiveDailyRate(0.1)),
    )
    expect(rpTx.type).toBe('YIELD_ACCRUAL')
    expect(rpTx.principalDeltaKobo).toBe(0n)
    expect(rpTx.yieldDeltaKobo).toBe(expectedRpDaily)
    expect(rpTx.narration).toContain('10.0% p.a.')

    // 2. Customer Liability Ledger: Save & Earn earns 16% effective p.a. compounded daily
    const seTx = customerTxs.find((t) => t.vaultId === 2)
    const expectedSeDaily = BigInt(
      Math.round(100_000_000 * RentSavingsCalculatorEngine.getEffectiveDailyRate(0.16)),
    )
    expect(seTx.yieldDeltaKobo).toBe(expectedSeDaily)
    expect(seTx.narration).toContain('16.0% p.a.')

    // 3. Internal Treasury Ledger: Rent Protec spread recovers upfront 2% premium first
    const rpTreasury = treasuryUpserts.find((t) => t.vaultId === 1)
    expect(rpTreasury.upfrontPremiumObligationKobo).toBe(4_000_000n)
    expect(rpTreasury.platformSpreadAccruedKobo).toBeGreaterThan(0n)
    expect(rpTreasury.premiumRecoveredKobo).toBe(rpTreasury.platformSpreadAccruedKobo)
    expect(rpTreasury.unrecoveredPremiumKobo).toBe(
      4_000_000n - rpTreasury.platformSpreadAccruedKobo,
    )
    expect(rpTreasury.netPlatformMarginKobo).toBe(0n)

    // 4. Internal Treasury Ledger: Save & Earn has 0 premium obligation, so spread goes straight to net margin
    const seTreasury = treasuryUpserts.find((t) => t.vaultId === 2)
    expect(seTreasury.upfrontPremiumObligationKobo).toBe(0n)
    expect(seTreasury.netPlatformMarginKobo).toBe(seTreasury.platformSpreadAccruedKobo)

    expect(ledgerCreates).toHaveLength(2)
  })

  it('does NOT book 2% upfront Rent Protec obligation while funded balance is below the 20% activation threshold', async () => {
    const vaults = [
      {
        id: 3,
        uuid: 'vault-rp-under-20',
        userId: 30,
        productOption: 'RENT_PROTEC',
        appliedAnnualRatePct: 10.0,
        targetAmountKobo: 200_000_000n, // NGN 2,000,000 -> 20% activation threshold = 40,000,000 kobo (NGN 400k)
        currentPrincipalKobo: 10_000_000n, // NGN 100,000 (5% < 20%)
        accruedYieldKobo: 0n,
        lockStatus: 'LOCKED',
      },
    ]

    const { scheduler, treasuryUpserts } = buildScheduler(vaults)
    await scheduler.executeDailyNavAccrual()

    expect(treasuryUpserts).toHaveLength(1)
    expect(treasuryUpserts[0].upfrontPremiumObligationKobo).toBe(0n)
    expect(treasuryUpserts[0].unrecoveredPremiumKobo).toBe(0n)
  })

  it('is strictly idempotent when triggered twice on the same UTC date (deterministic YLD_ reference)', async () => {
    const vaults = [
      {
        id: 4,
        uuid: 'vault-idemp-4',
        userId: 40,
        productOption: 'SAVE_AND_EARN',
        appliedAnnualRatePct: 16.0,
        targetAmountKobo: 200_000_000n,
        currentPrincipalKobo: 100_000_000n,
        accruedYieldKobo: 0n,
        lockStatus: 'LOCKED',
      },
    ]

    const { scheduler, customerTxs, balanceIncrements, ledgerCreates } = buildScheduler(vaults)
    await scheduler.executeDailyNavAccrual()
    await scheduler.executeDailyNavAccrual()

    expect(customerTxs).toHaveLength(1)
    expect(customerTxs[0].reference).toMatch(/^YLD_4_\d{4}-\d{2}-\d{2}$/)
    expect(balanceIncrements).toHaveLength(1)
    expect(ledgerCreates).toHaveLength(1)
    expect(ledgerCreates[0].reference).toBe(`TREAS_${customerTxs[0].reference}`)
  })

  it('excludes principal still sitting in uninvested QUEUED/FAILED ARM SUBSCRIBE jobs from synthetic yield', async () => {
    const vaults = [
      {
        id: 5,
        uuid: 'vault-partial-arm',
        userId: 50,
        productOption: 'SAVE_AND_EARN',
        investmentProvider: 'ARM',
        appliedAnnualRatePct: 16.0,
        targetAmountKobo: 200_000_000n,
        currentPrincipalKobo: 100_000_000n, // NGN 1,000,000 total
        accruedYieldKobo: 0n,
        lockStatus: 'LOCKED',
      },
      {
        id: 6,
        uuid: 'vault-zero-arm',
        userId: 60,
        productOption: 'SAVE_AND_EARN',
        investmentProvider: 'ARM',
        appliedAnnualRatePct: 16.0,
        targetAmountKobo: 200_000_000n,
        currentPrincipalKobo: 50_000_000n, // NGN 500,000 total, 100% failed ARM
        accruedYieldKobo: 0n,
        lockStatus: 'LOCKED',
      },
    ]

    const { scheduler, customerTxs, ledgerCreates } = buildScheduler(vaults, {
      uninvestedArmJobs: [
        { vaultId: 5, amountKobo: 40_000_000n }, // NGN 400k stuck -> only NGN 600k compounds
        { vaultId: 6, amountKobo: 50_000_000n }, // NGN 500k stuck -> NGN 0 compounds
      ],
    })

    await scheduler.executeDailyNavAccrual()

    expect(customerTxs).toHaveLength(1)
    expect(customerTxs[0].vaultId).toBe(5)
    const expectedOn600k = BigInt(
      Math.round(60_000_000 * RentSavingsCalculatorEngine.getEffectiveDailyRate(0.16)),
    )
    expect(customerTxs[0].yieldDeltaKobo).toBe(expectedOn600k)
    expect(ledgerCreates[0].principalBaseKobo).toBe(60_000_000n)
  })

  it('honestly books negative spread & platform subsidy when ARM gross yield falls below customer rate', async () => {
    const vaults = [
      {
        id: 7,
        uuid: 'vault-neg-spread',
        userId: 70,
        productOption: 'SAVE_AND_EARN',
        appliedAnnualRatePct: 16.0,
        targetAmountKobo: 200_000_000n,
        currentPrincipalKobo: 100_000_000n,
        accruedYieldKobo: 0n,
        lockStatus: 'LOCKED',
      },
    ]

    const { scheduler, treasuryUpserts, ledgerCreates } = buildScheduler(vaults, {
      armAnnualYieldRate: 0.14, // 14% ARM < 16% customer
    })

    await scheduler.executeDailyNavAccrual()

    expect(treasuryUpserts).toHaveLength(1)
    expect(treasuryUpserts[0].platformSpreadAccruedKobo).toBeLessThan(0n)
    expect(treasuryUpserts[0].netPlatformMarginKobo).toBeLessThan(0n)
    expect(ledgerCreates[0].grossArmRatePct).toBeCloseTo(14.0, 2)
    expect(ledgerCreates[0].yieldSpreadKobo).toBeLessThan(0n)
    expect(ledgerCreates[0].notes).toContain('NEGATIVE SPREAD')
  })

  it('accrues 0 kobo on dust balances instead of inflating to 1 kobo/day', async () => {
    const vaults = [
      {
        id: 8,
        uuid: 'vault-dust',
        userId: 80,
        productOption: 'SAVE_AND_EARN',
        appliedAnnualRatePct: 16.0,
        targetAmountKobo: 200_000_000n,
        currentPrincipalKobo: 100n, // NGN 1.00
        accruedYieldKobo: 0n,
        lockStatus: 'LOCKED',
      },
    ]

    const { scheduler, customerTxs, balanceIncrements } = buildScheduler(vaults)
    await scheduler.executeDailyNavAccrual()

    expect(customerTxs).toHaveLength(0)
    expect(balanceIncrements).toHaveLength(0)
  })
})
