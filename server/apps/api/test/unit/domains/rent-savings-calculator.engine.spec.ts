import { RentSavingsCalculatorEngine } from '../../../src/domains/rent-savings/rent-savings-calculator.engine'

describe('RentSavingsCalculatorEngine', () => {
  const baseDate = new Date('2026-01-01T00:00:00Z')

  describe('Work-Backwards Runway Calculations', () => {
    it('M-03: should calculate 12-month runway (365 days) for ₦2.4M target', () => {
      const dueDate = new Date('2027-01-01T00:00:00Z') // 365 days
      const targetAmountKobo = 240_000_000n // ₦2,400,000

      // Monthly option (~12 payments)
      const monthlyRes = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo,
        contractualDueDate: dueDate,
        cadence: 'MONTHLY',
        asOfDate: baseDate,
      })

      expect(monthlyRes.daysRemaining).toBe(365)
      expect(monthlyRes.numberOfPayments).toBe(12)
      // Expect periodic deposit to be around ₦180k - ₦185k (18,000,000 - 18,500,000 kobo)
      expect(Number(monthlyRes.periodicDepositKobo)).toBeGreaterThan(17_500_000)
      expect(Number(monthlyRes.periodicDepositKobo)).toBeLessThan(19_000_000)

      // Weekly option
      const weeklyRes = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo,
        contractualDueDate: dueDate,
        cadence: 'WEEKLY',
        asOfDate: baseDate,
      })
      expect(weeklyRes.numberOfPayments).toBe(52)
      // Around ₦40k - ₦43k (4,000,000 - 4,300,000 kobo)
      expect(Number(weeklyRes.periodicDepositKobo)).toBeGreaterThan(3_900_000)
      expect(Number(weeklyRes.periodicDepositKobo)).toBeLessThan(4_300_000)

      // Daily option
      const dailyRes = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo,
        contractualDueDate: dueDate,
        cadence: 'DAILY',
        asOfDate: baseDate,
      })
      expect(dailyRes.numberOfPayments).toBe(365)
      // Around ₦5,600 - ₦6,000 (560,000 - 600,000 kobo)
      expect(Number(dailyRes.periodicDepositKobo)).toBeGreaterThan(550_000)
      expect(Number(dailyRes.periodicDepositKobo)).toBeLessThan(620_000)
    })

    it('M-04: should calculate 6-month runway (180 days) for ₦2.4M target', () => {
      const dueDate = new Date('2026-06-30T00:00:00Z') // 180 days
      const targetAmountKobo = 240_000_000n

      const res = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo,
        contractualDueDate: dueDate,
        cadence: 'MONTHLY',
        asOfDate: baseDate,
      })

      expect(res.daysRemaining).toBe(180)
      expect(res.numberOfPayments).toBe(6)
      // Around ₦375k - ₦390k (37,500,000 - 39,000,000 kobo)
      expect(Number(res.periodicDepositKobo)).toBeGreaterThan(37_000_000)
      expect(Number(res.periodicDepositKobo)).toBeLessThan(39_500_000)
    })

    it('M-05: should calculate 3-month runway (87 days) for ₦1.2M target', () => {
      const dueDate = new Date('2026-03-29T00:00:00Z') // 87 days
      const targetAmountKobo = 120_000_000n

      const res = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo,
        contractualDueDate: dueDate,
        cadence: 'MONTHLY',
        asOfDate: baseDate,
      })

      expect(res.daysRemaining).toBe(87)
      expect(res.numberOfPayments).toBe(2)
      // Around ₦580k - ₦600k for 2 payments
      expect(Number(res.periodicDepositKobo)).toBeGreaterThan(55_000_000)
      expect(Number(res.periodicDepositKobo)).toBeLessThan(61_000_000)
    })

    it('M-06: should calculate 45-day runway for ₦1.2M target across 2 payments', () => {
      const dueDate = new Date('2026-02-15T00:00:00Z') // 45 days
      const targetAmountKobo = 120_000_000n

      const res = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo,
        contractualDueDate: dueDate,
        cadence: 'MONTHLY',
        asOfDate: baseDate,
      })

      expect(res.daysRemaining).toBe(45)
      expect(res.numberOfPayments).toBe(2)
      expect(Number(res.periodicDepositKobo)).toBeGreaterThan(57_000_000)
      expect(Number(res.periodicDepositKobo)).toBeLessThan(61_000_000)
    })

    it('M-07: should trigger affordability alert when monthly deposit exceeds 50% income', () => {
      const dueDate = new Date('2026-06-30T00:00:00Z') // 180 days
      const targetAmountKobo = 240_000_000n // ~₦382,200/mo

      // Declared income ₦500,000 (deposit is ~76% of income)
      const res = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo,
        contractualDueDate: dueDate,
        cadence: 'MONTHLY',
        monthlyIncomeKobo: 50_000_000n, // ₦500,000
        asOfDate: baseDate,
      })

      expect(res.affordability.isOverThreshold).toBe(true)
      expect(res.affordability.rentToIncomeRatio).toBeGreaterThan(0.5)
      expect(res.affordability.advisoryMessage).toBeDefined()
    })

    it('should NOT trigger affordability alert when monthly deposit is within 50% income', () => {
      const dueDate = new Date('2026-06-30T00:00:00Z')
      const targetAmountKobo = 240_000_000n

      // Declared income ₦1,000,000 (deposit is ~38% of income)
      const res = RentSavingsCalculatorEngine.simulate({
        targetAmountKobo,
        contractualDueDate: dueDate,
        cadence: 'MONTHLY',
        monthlyIncomeKobo: 100_000_000n, // ₦1,000,000
        asOfDate: baseDate,
      })

      expect(res.affordability.isOverThreshold).toBe(false)
      expect(res.affordability.rentToIncomeRatio).toBeLessThanOrEqual(0.5)
    })
  })

  describe('M-08: Daily Compounding Yield', () => {
    it('should calculate daily interest accurately at 14.5% p.a.', () => {
      const balanceKobo = 100_000_000n // ₦1,000,000
      const dailyInterest = RentSavingsCalculatorEngine.calculateDailyYield(balanceKobo)
      // ₦1,000,000 * (0.145 / 365) = ₦397.26 => ~39,726 kobo
      expect(Number(dailyInterest)).toBeGreaterThanOrEqual(39_000)
      expect(Number(dailyInterest)).toBeLessThanOrEqual(41_000)
    })
  })

  describe('Emergency Advance Line (40% Borrowing)', () => {
    it('M-09: should strictly cap maximum advance to 40% of balance', () => {
      const balanceKobo = 100_000_000n // ₦1,000,000
      const maxBorrowable = RentSavingsCalculatorEngine.calculateMaxAdvanceBorrowable(balanceKobo)
      expect(maxBorrowable).toBe(40_000_000n) // ₦400,000
    })

    it('M-10: should calculate 3.5% facility fee and total repayable', () => {
      const currentBalanceKobo = 100_000_000n
      const requestedKobo = 40_000_000n // ₦400,000
      const terms = RentSavingsCalculatorEngine.calculateAdvanceTerms(
        requestedKobo,
        currentBalanceKobo,
      )

      expect(terms.borrowedAmountKobo).toBe(40_000_000n)
      expect(terms.facilityFeeKobo).toBe(1_400_000n) // 3.5% of ₦400,000 = ₦14,000
      expect(terms.totalRepayableKobo).toBe(41_400_000n) // ₦414,000
    })

    it('should reject advance request exceeding 40%', () => {
      const currentBalanceKobo = 100_000_000n
      const requestedKobo = 50_000_000n // 50%
      expect(() => {
        RentSavingsCalculatorEngine.calculateAdvanceTerms(requestedKobo, currentBalanceKobo)
      }).toThrow(/exceeds maximum 40% borrowing limit/)
    })

    it('M-11: should calculate 0.1%/day late penalty when overdue', () => {
      const unpaidKobo = 40_000_000n
      const penalty10Days = RentSavingsCalculatorEngine.calculateAdvanceLatePenalty(unpaidKobo, 10)
      // 0.1% * 10 = 1% of ₦400,000 = ₦4,000 (400,000 kobo)
      expect(penalty10Days).toBe(400_000n)
    })
  })

  describe('M-13: Fair Exit Breakout Recalculation', () => {
    it('should recalculate interest to base 7.0% p.a. and deduct 1.5% admin fee', () => {
      const principalKobo = 100_000_000n // ₦1,000,000
      const daysHeld = 90 // 3 months

      const breakout = RentSavingsCalculatorEngine.calculateFairBreakout(principalKobo, daysHeld)

      expect(breakout.principalKobo).toBe(100_000_000n)
      // 7.0% p.a. for 90 days: ~₦1,000,000 * (0.07 / 365 * 90) = ~₦17,260 (1,726,000 kobo)
      expect(Number(breakout.recalculatedYieldKobo)).toBeGreaterThan(1_600_000)
      expect(Number(breakout.recalculatedYieldKobo)).toBeLessThan(1_900_000)

      // 1.5% admin fee on ₦1,000,000: ₦15,000 (1,500,000 kobo)
      expect(breakout.adminFeeKobo).toBe(1_500_000n)

      // Net payout should be principal + yield - fee
      const expectedNet = principalKobo + breakout.recalculatedYieldKobo - breakout.adminFeeKobo
      expect(breakout.netPayoutKobo).toBe(expectedNet)
    })
  })

  describe('M-14: Gamified Rent Cashback', () => {
    it('should apply 0.65% base cashback for Everyday saver and 1.2x early bird bonus', () => {
      const targetKobo = 100_000_000n // ₦1,000,000
      // 25 days before due date (within first 10 days of T-30)
      const res = RentSavingsCalculatorEngine.calculateCashback(targetKobo, 25)

      expect(res.earlyBirdApplied).toBe(true)
      // 0.65% * 1.2 = 0.78% of ₦1,000,000 = ₦7,800 (780,000 kobo)
      expect(res.cashbackKobo).toBe(780_000n)
    })

    it('should apply standard rate without early bird bonus when settled past first 10 days', () => {
      const targetKobo = 100_000_000n
      // 5 days before due date (outside early bird 20-30 day window)
      const res = RentSavingsCalculatorEngine.calculateCashback(targetKobo, 5)

      expect(res.earlyBirdApplied).toBe(false)
      // 0.65% of ₦1,000,000 = ₦6,500 (650,000 kobo)
      expect(res.cashbackKobo).toBe(650_000n)
    })
  })
})
