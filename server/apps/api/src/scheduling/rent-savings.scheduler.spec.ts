import { RentSavingsScheduler } from './rent-savings.scheduler'

describe('RentSavingsScheduler — Dual Ledger Daily NAV Accrual', () => {
  const buildScheduler = (vaults: any[]) => {
    const treasuryUpserts: any[] = []
    const ledgerCreates: any[] = []
    const customerTxs: any[] = []
    const balanceIncrements: any[] = []

    const prisma: any = {
      upward_rent_vault: {
        findMany: jest.fn().mockResolvedValue(vaults),
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
      createTransaction: jest.fn().mockImplementation(async (tx) => {
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
          annualNetYieldRate: 0.1655,
          dailyYieldRate: 0.1655 / 365,
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
        savingsDailyRate: 0.16 / 365,
        rentProtecDailyRate: 0.1 / 365,
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

    // 1. Customer Liability Ledger: Rent Protec earns 10% daily, zero 2% deduction
    const rpTx = customerTxs.find((t) => t.vaultId === 1)
    const expectedRpDaily = BigInt(Math.round(100_000_000 * (0.1 / 365)))
    expect(rpTx.type).toBe('YIELD_ACCRUAL')
    expect(rpTx.principalDeltaKobo).toBe(0n)
    expect(rpTx.yieldDeltaKobo).toBe(expectedRpDaily)
    expect(rpTx.narration).toContain('10.0% p.a.')

    // 2. Customer Liability Ledger: Save & Earn earns 16% daily
    const seTx = customerTxs.find((t) => t.vaultId === 2)
    const expectedSeDaily = BigInt(Math.round(100_000_000 * (0.16 / 365)))
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
})
