import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'
import { BreakoutRentVaultUseCase } from './breakout-rent-vault.use-case'

describe('Nov 26 Savings Rules — Breakeven Formula, Flexible Exit & DVA Classification', () => {
  describe('Formula-driven Rent Protec minimum upfront deposit d_min(T)', () => {
    it('returns 20% for 7-11 month timelines and 33% for 6-month (180d) timeline at 6.55% spread', () => {
      expect(RentSavingsCalculatorEngine.getRentProtecActivationThresholdPct(330)).toBe(20)
      expect(RentSavingsCalculatorEngine.getRentProtecActivationThresholdPct(270)).toBe(20)
      expect(RentSavingsCalculatorEngine.getRentProtecActivationThresholdPct(210)).toBe(20)
      expect(RentSavingsCalculatorEngine.getRentProtecActivationThresholdPct(180)).toBe(33)
      // Clamped at 45% for ultra-short timelines
      expect(RentSavingsCalculatorEngine.getRentProtecActivationThresholdPct(120)).toBe(45)
    })

    it('enforces the calculated minimum upfront deposit floor over active compounding days (T - 30) in simulate()', () => {
      const asOf = new Date('2026-01-01T00:00:00Z')
      // 6 months to due date (180d) -> 150 active compounding days -> 45% floor
      const dueIn6Mo = new Date(asOf.getTime() + 180 * 24 * 60 * 60 * 1000)
      const result6Mo = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo: 300_000_000n, // NGN 3,000,000
        contractualDueDate: dueIn6Mo,
        initialDepositKobo: 30_000_000n, // User attempts 10% (below 45% floor)
        cadence: 'MONTHLY',
        productOption: 'RENT_PROTEC',
        planPattern: 'INITIAL_DEPOSIT',
        asOfDate: asOf,
      })

      expect(result6Mo.activeCompoundingDays).toBe(150)
      expect(result6Mo.minimumInitialDepositPct).toBe(45)
      expect(result6Mo.minimumInitialDepositKobo).toBe(135_000_000n) // 45% of 3M = NGN 1.35M
      expect(result6Mo.requiredInitialDepositKobo).toBe(135_000_000n)
      expect(result6Mo.lockMode).toBe('LOCKED')

      // 7 months to due date (210d) -> 180 active compounding days -> 33% floor
      const dueIn7Mo = new Date(asOf.getTime() + 210 * 24 * 60 * 60 * 1000)
      const result7Mo = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo: 300_000_000n,
        contractualDueDate: dueIn7Mo,
        initialDepositKobo: 30_000_000n,
        cadence: 'MONTHLY',
        productOption: 'RENT_PROTEC',
        planPattern: 'INITIAL_DEPOSIT',
        asOfDate: asOf,
      })

      expect(result7Mo.activeCompoundingDays).toBe(180)
      expect(result7Mo.minimumInitialDepositPct).toBe(33)
      expect(result7Mo.minimumInitialDepositKobo).toBe(99_000_000n)

      // 8+ months to due date (240d) -> 210 active compounding days -> 20% floor
      const dueIn8Mo = new Date(asOf.getTime() + 240 * 24 * 60 * 60 * 1000)
      const result8Mo = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo: 300_000_000n,
        contractualDueDate: dueIn8Mo,
        initialDepositKobo: 30_000_000n,
        cadence: 'MONTHLY',
        productOption: 'RENT_PROTEC',
        planPattern: 'INITIAL_DEPOSIT',
        asOfDate: asOf,
      })

      expect(result8Mo.activeCompoundingDays).toBe(210)
      expect(result8Mo.minimumInitialDepositPct).toBe(20)
      expect(result8Mo.minimumInitialDepositKobo).toBe(60_000_000n)
    })
  })

  describe('Flexible Save & Earn vs Locked Breakout', () => {
    const buildBreakoutDeps = (vaultOverrides: Record<string, any>) => {
      const createdTxs: any[] = []
      const scoreUpdates: any[] = []
      const vault = {
        id: 42,
        uuid: 'vault-flex-42',
        userId: 7,
        targetAmountKobo: 200_000_000n,
        currentPrincipalKobo: 100_000_000n, // NGN 1,000,000
        accruedYieldKobo: 5_000_000n, // NGN 50,000 accrued at 12% p.a.
        productOption: 'SAVE_AND_EARN',
        lockMode: 'FLEXIBLE',
        lockStatus: 'LOCKED',
        investmentProvider: 'ARM',
        createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
        ...vaultOverrides,
      }

      const rentVaultRepo: any = {
        findByUuid: jest.fn().mockResolvedValue(vault),
        createTransaction: jest.fn().mockImplementation(async (tx) => {
          createdTxs.push(tx)
          return { id: 1, ...tx }
        }),
        update: jest.fn().mockResolvedValue(vault),
        findSavingsScoreByVaultId: jest.fn().mockResolvedValue({ totalScore: 50, historyLog: [] }),
        upsertSavingsScore: jest.fn().mockImplementation(async (...args) => {
          scoreUpdates.push(args)
        }),
      }
      const rentAdvanceRepo: any = {
        findActiveByVaultId: jest.fn().mockResolvedValue(null),
      }

      const useCase = new BreakoutRentVaultUseCase(rentVaultRepo, rentAdvanceRepo)
      return { useCase, createdTxs, scoreUpdates }
    }

    it('returns 100% principal + 100% accrued yield with ₦0 fee and zero score penalty for FLEXIBLE vaults', async () => {
      const { useCase, createdTxs, scoreUpdates } = buildBreakoutDeps({
        productOption: 'SAVE_AND_EARN',
        lockMode: 'FLEXIBLE',
      })

      const res = await useCase.execute(7, 'vault-flex-42')

      expect(res.data.lock_mode).toBe('FLEXIBLE')
      expect(res.data.admin_fee_kobo).toBe(0)
      expect(res.data.forfeited_yield_kobo).toBe(0)
      expect(res.data.recalculated_base_yield_kobo).toBe(5_000_000)
      expect(res.data.net_payout_kobo).toBe(105_000_000)
      expect(createdTxs[0].type).toBe('BREAKOUT_PAYOUT')
      expect(scoreUpdates).toHaveLength(0)
    })

    it('refuses early withdrawal for Full Lock Save & Earn', async () => {
      const { useCase, createdTxs, scoreUpdates } = buildBreakoutDeps({
        productOption: 'SAVE_AND_EARN',
        lockMode: 'LOCKED',
      })

      await expect(useCase.execute(7, 'vault-flex-42')).rejects.toThrow(
        'cannot be withdrawn earlier',
      )
      expect(createdTxs).toHaveLength(0)
      expect(scoreUpdates).toHaveLength(0)
    })

    it('applies Fair Exit (7.0% base yield + 1.5% admin fee + score penalty) for Rent Protec', async () => {
      const { useCase, createdTxs, scoreUpdates } = buildBreakoutDeps({
        productOption: 'RENT_PROTEC',
        lockMode: 'LOCKED',
      })

      const res = await useCase.execute(7, 'vault-flex-42')

      expect(res.data.lock_mode).toBe('LOCKED')
      expect(res.data.admin_fee_kobo).toBe(1_500_000) // 1.5% of 1M
      expect(res.data.forfeited_yield_kobo).toBe(5_000_000)
      expect(res.data.net_payout_kobo).toBeLessThan(105_000_000)
      expect(createdTxs[0].type).toBe('LIQUIDATION_PENALTY')
      expect(scoreUpdates).toHaveLength(1)
    })
  })

  describe('Deterministic Direct DVA Transfer Classification', () => {
    it('classifies initial deposit, partial monthly, completing monthly, and extra top-up cleanly', () => {
      // 1. First deposit on an upfront-deposit vault
      const initRes = RentSavingsCalculatorEngine.classifyDirectDeposit({
        currentPrincipalKobo: 0n,
        initialDepositKobo: 60_000_000n,
        plannedMonthlyDepositKobo: 26_000_000n,
        currentMonthAppliedKobo: 0n,
        depositAmountKobo: 60_000_000n,
      })
      expect(initRes.classification).toBe('INITIAL_DEPOSIT')
      expect(initRes.shouldRecalculateMonthlyTarget).toBe(false)

      // 2. First half of monthly installment (split payment)
      const partialRes = RentSavingsCalculatorEngine.classifyDirectDeposit({
        currentPrincipalKobo: 60_000_000n,
        initialDepositKobo: 60_000_000n,
        plannedMonthlyDepositKobo: 26_000_000n,
        currentMonthAppliedKobo: 0n,
        depositAmountKobo: 13_000_000n,
      })
      expect(partialRes.classification).toBe('PARTIAL_MONTHLY')
      expect(partialRes.shouldRecalculateMonthlyTarget).toBe(false)

      // 3. Second half completing the month — keeps monthly target fixed!
      const completeMonthRes = RentSavingsCalculatorEngine.classifyDirectDeposit({
        currentPrincipalKobo: 73_000_000n,
        initialDepositKobo: 60_000_000n,
        plannedMonthlyDepositKobo: 26_000_000n,
        currentMonthAppliedKobo: 13_000_000n,
        depositAmountKobo: 13_000_000n,
      })
      expect(completeMonthRes.classification).toBe('MONTHLY_CONTRIBUTION')
      expect(completeMonthRes.shouldRecalculateMonthlyTarget).toBe(false)

      // 4. Subsequent transfer in the same month after month is already fulfilled -> EXTRA_TOPUP!
      const extraRes = RentSavingsCalculatorEngine.classifyDirectDeposit({
        currentPrincipalKobo: 86_000_000n,
        initialDepositKobo: 60_000_000n,
        plannedMonthlyDepositKobo: 26_000_000n,
        currentMonthAppliedKobo: 26_000_000n,
        depositAmountKobo: 20_000_000n,
      })
      expect(extraRes.classification).toBe('EXTRA_TOPUP')
      expect(extraRes.shouldRecalculateMonthlyTarget).toBe(true)
    })

    it('recalculates a strictly lower (never higher) monthly target on Extra Top-Up', () => {
      const asOf = new Date('2026-01-01T00:00:00Z')
      const dueIn10Mo = new Date(asOf.getTime() + 300 * 24 * 60 * 60 * 1000)
      const currentPlanned = 26_000_000n // NGN 260k/mo

      const nextMonthly = RentSavingsCalculatorEngine.recalculateMonthlyTargetKobo({
        targetAmountKobo: 300_000_000n, // NGN 3M
        currentBalanceKobo: 120_000_000n, // NGN 1.2M saved after extra top-up
        contractualDueDate: dueIn10Mo,
        annualNetYieldRate: 0.16,
        currentPlannedMonthlyKobo: currentPlanned,
        asOfDate: asOf,
        currentMonthAlreadyFulfilled: true,
      })

      expect(nextMonthly).toBeGreaterThan(0n)
      expect(nextMonthly).toBeLessThan(currentPlanned)
    })
  })

  describe('Exact Calendar-Day Effective Compounding & Dynamic Daily Targets', () => {
    it('compounds canonical effective daily rate over 365 days to exact annual effective rate (16.00%, not 17.35%)', () => {
      const dailyRate = RentSavingsCalculatorEngine.getEffectiveDailyRate(0.16)
      const compoundedAnnual = Math.pow(1 + dailyRate, 365) - 1
      expect(compoundedAnnual).toBeCloseTo(0.16, 10)
    })

    it('produces different periodic deposits and projected yield for Nov 1 vs Nov 20 start dates on the same due date', () => {
      const dueDate = new Date('2027-10-31T00:00:00Z')
      const earlyStart = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo: 250_000_000n, // NGN 2,500,000
        contractualDueDate: dueDate,
        initialDepositKobo: 50_000_000n, // NGN 500,000
        cadence: 'MONTHLY',
        productOption: 'SAVE_AND_EARN',
        planPattern: 'INITIAL_DEPOSIT',
        paydayDayOfMonth: 28,
        asOfDate: new Date('2026-11-01T00:00:00Z'),
      })

      const lateStart = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo: 250_000_000n,
        contractualDueDate: dueDate,
        initialDepositKobo: 50_000_000n,
        cadence: 'MONTHLY',
        productOption: 'SAVE_AND_EARN',
        planPattern: 'INITIAL_DEPOSIT',
        paydayDayOfMonth: 28,
        asOfDate: new Date('2026-11-20T00:00:00Z'),
      })

      expect(earlyStart.activeCompoundingDays).toBeGreaterThan(lateStart.activeCompoundingDays)
      expect(earlyStart.projectedYieldKobo).toBeGreaterThan(lateStart.projectedYieldKobo)
      expect(earlyStart.periodicDepositKobo).toBeLessThan(lateStart.periodicDepositKobo)
    })

    it('increases dynamic daily target when a saver falls behind and flags BEHIND status', () => {
      const dueDate = new Date('2027-10-31T00:00:00Z')
      const baseline = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo: 250_000_000n,
        contractualDueDate: dueDate,
        initialDepositKobo: 50_000_000n,
        cadence: 'MONTHLY',
        productOption: 'SAVE_AND_EARN',
        planPattern: 'INITIAL_DEPOSIT',
        paydayDayOfMonth: 28,
        asOfDate: new Date('2026-11-01T00:00:00Z'),
      })

      // 3 months later with still only the initial deposit (missed 3 scheduled deposits + their compounding)
      const dynamic = RentSavingsCalculatorEngine.calculateDynamicDailyTarget({
        targetAmountKobo: 250_000_000n,
        currentBalanceKobo: 52_000_000n,
        contractualDueDate: dueDate,
        annualNetYieldRate: 0.16,
        plannedMonthlyKobo: baseline.periodicDepositKobo,
        paydayDayOfMonth: 28,
        asOfDate: new Date('2027-02-15T00:00:00Z'),
      })

      expect(dynamic.onTrackStatus).toBe('BEHIND')
      expect(dynamic.isTargetReachedEarly).toBe(false)
      expect(dynamic.suggestedDepositTodayKobo).toBeGreaterThan(baseline.periodicDepositKobo)
      expect(dynamic.catchUpTodayKobo).toBeGreaterThan(baseline.periodicDepositKobo)
    })

    it('flags TARGET_REACHED and isTargetReachedEarly when balance hits rent target before unlock while still projecting yield', () => {
      const dueDate = new Date('2027-10-31T00:00:00Z')
      const dynamic = RentSavingsCalculatorEngine.calculateDynamicDailyTarget({
        targetAmountKobo: 250_000_000n,
        currentBalanceKobo: 250_000_000n,
        contractualDueDate: dueDate,
        annualNetYieldRate: 0.16,
        plannedMonthlyKobo: 18_000_000n,
        paydayDayOfMonth: 28,
        asOfDate: new Date('2027-05-01T00:00:00Z'),
      })

      expect(dynamic.onTrackStatus).toBe('TARGET_REACHED')
      expect(dynamic.isTargetReachedEarly).toBe(true)
      expect(dynamic.suggestedDepositTodayKobo).toBe(0n)
      expect(dynamic.projectedRemainingYieldKobo).toBeGreaterThan(0n)
      expect(dynamic.projectedBalanceAtUnlockKobo).toBeGreaterThan(250_000_000n)
    })

    it('keeps Cycle 2 INITIAL_DEPOSIT saver with ₦12k cashback ON_TRACK and suggests remaining upfront deposit', () => {
      const asOf = new Date('2026-11-28T00:00:00Z')
      const dueDate = new Date('2027-12-23T00:00:00Z')
      const plan = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo: 250_000_000n, // NGN 2.5M
        contractualDueDate: dueDate,
        initialDepositKobo: 50_000_000n, // NGN 500k upfront
        cadence: 'MONTHLY',
        productOption: 'SAVE_AND_EARN',
        planPattern: 'INITIAL_DEPOSIT',
        paydayDayOfMonth: 28,
        asOfDate: asOf,
      })

      // Only ₦12k cashback rolled over so far (< ₦500k initial deposit)
      const dynamic = RentSavingsCalculatorEngine.calculateDynamicDailyTarget({
        targetAmountKobo: 250_000_000n,
        currentBalanceKobo: 1_200_000n,
        contractualDueDate: dueDate,
        annualNetYieldRate: 0.16,
        plannedMonthlyKobo: plan.periodicDepositKobo,
        planPattern: 'INITIAL_DEPOSIT',
        initialDepositKobo: 50_000_000n,
        paydayDayOfMonth: 28,
        asOfDate: asOf,
      })

      expect(dynamic.onTrackStatus).toBe('ON_TRACK')
      expect(dynamic.suggestedDepositTodayKobo).toBe(48_800_000n) // ₦500k - ₦12k = ₦488k
    })

    it('anchors monthly contribution window to preferred payday (5-day early-pay grace)', () => {
      // Payday = 28th. User pays on Nov 28. On Dec 1, Nov 28 must still be inside the active window!
      const dec1 = new Date('2026-12-01T10:00:00Z')
      const nov28 = new Date('2026-11-28T12:00:00Z')
      const { cycleStartUtc, cycleEndUtc } = RentSavingsCalculatorEngine.getCurrentCycleWindowUtc(
        dec1,
        28,
      )
      expect(nov28.getTime()).toBeGreaterThanOrEqual(cycleStartUtc.getTime())
      expect(nov28.getTime()).toBeLessThan(cycleEndUtc.getTime())

      // By Dec 24 (within 5 days of Dec 28), the new cycle window opens
      const dec24 = new Date('2026-12-24T10:00:00Z')
      const nextWin = RentSavingsCalculatorEngine.getCurrentCycleWindowUtc(dec24, 28)
      expect(nov28.getTime()).toBeLessThan(nextWin.cycleStartUtc.getTime())
    })

    it('does not truncate DAILY scheduled deposits at maxMonths * 31', () => {
      const startMs = Date.UTC(2026, 0, 1)
      const unlockMs = startMs + 350 * 24 * 60 * 60 * 1000
      const dates = RentSavingsCalculatorEngine.buildScheduledDepositDatesUtc({
        startMs,
        unlockMs,
        cadence: 'DAILY',
        maxMonths: 11,
      })
      expect(dates).toHaveLength(350)
    })
  })
})
