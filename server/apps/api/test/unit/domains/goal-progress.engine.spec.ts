import { BadRequestException } from '@nestjs/common'
import { GoalProgressEngine } from '@domains/goals/goal-progress.engine'
import { GoalMilestone } from '@domains/goals/goal.repository'

describe('GoalProgressEngine', () => {
  describe('parseMinorUnits', () => {
    it('parses valid bigint, number, and string minor units', () => {
      expect(GoalProgressEngine.parseMinorUnits(50000n, 'amount')).toBe(50000n)
      expect(GoalProgressEngine.parseMinorUnits(50000, 'amount')).toBe(50000n)
      expect(GoalProgressEngine.parseMinorUnits('50000', 'amount')).toBe(50000n)
      expect(GoalProgressEngine.parseMinorUnits(null, 'amount')).toBeNull()
      expect(GoalProgressEngine.parseMinorUnits(undefined, 'amount')).toBeNull()
    })

    it('rejects negative numbers, negative bigints, and negative strings', () => {
      expect(() => GoalProgressEngine.parseMinorUnits(-500, 'amount')).toThrow(BadRequestException)
      expect(() => GoalProgressEngine.parseMinorUnits(-500n, 'amount')).toThrow(BadRequestException)
      expect(() => GoalProgressEngine.parseMinorUnits('-500', 'amount')).toThrow(BadRequestException)
    })

    it('rejects floating-point numbers and strings with decimals', () => {
      expect(() => GoalProgressEngine.parseMinorUnits(100.5, 'amount')).toThrow(BadRequestException)
      expect(() => GoalProgressEngine.parseMinorUnits('100.50', 'amount')).toThrow(BadRequestException)
    })

    it('rejects malformed non-numeric strings', () => {
      expect(() => GoalProgressEngine.parseMinorUnits('abc', 'amount')).toThrow(BadRequestException)
      expect(() => GoalProgressEngine.parseMinorUnits('12a34', 'amount')).toThrow(BadRequestException)
      expect(() => GoalProgressEngine.parseMinorUnits('', 'amount')).toThrow(BadRequestException)
    })
  })

  describe('calculateFromMilestones', () => {
    it('returns 0 when milestones array is empty or undefined', () => {
      expect(GoalProgressEngine.calculateFromMilestones([])).toBe(0)
      expect(GoalProgressEngine.calculateFromMilestones(undefined)).toBe(0)
    })

    it('calculates integer percentage rounded down', () => {
      const milestones: GoalMilestone[] = [
        { uuid: 'm-1', userGoalId: 1, title: 'Step 1', status: 'COMPLETED', sortOrder: 0 },
        { uuid: 'm-2', userGoalId: 1, title: 'Step 2', status: 'PENDING', sortOrder: 1 },
        { uuid: 'm-3', userGoalId: 1, title: 'Step 3', status: 'PENDING', sortOrder: 2 },
      ]
      expect(GoalProgressEngine.calculateFromMilestones(milestones)).toBe(33)
    })

    it('returns 100 when all milestones are completed', () => {
      const milestones: GoalMilestone[] = [
        { uuid: 'm-1', userGoalId: 1, title: 'Step 1', status: 'COMPLETED', sortOrder: 0 },
        { uuid: 'm-2', userGoalId: 1, title: 'Step 2', status: 'COMPLETED', sortOrder: 1 },
      ]
      expect(GoalProgressEngine.calculateFromMilestones(milestones)).toBe(100)
    })

    it('returns 0 when no milestones are completed', () => {
      const milestones: GoalMilestone[] = [
        { uuid: 'm-1', userGoalId: 1, title: 'Step 1', status: 'PENDING', sortOrder: 0 },
        { uuid: 'm-2', userGoalId: 1, title: 'Step 2', status: 'PENDING', sortOrder: 1 },
      ]
      expect(GoalProgressEngine.calculateFromMilestones(milestones)).toBe(0)
    })
  })

  describe('calculateFromAmounts', () => {
    it('rejects zero, null, or negative target amounts with BadRequestException', () => {
      expect(() => GoalProgressEngine.calculateFromAmounts(50000n, null)).toThrow(BadRequestException)
      expect(() => GoalProgressEngine.calculateFromAmounts(50000n, 0n)).toThrow(BadRequestException)
      expect(() => GoalProgressEngine.calculateFromAmounts(50000n, -100n)).toThrow(BadRequestException)
    })

    it('rejects negative current amount with BadRequestException', () => {
      expect(() => GoalProgressEngine.calculateFromAmounts(-5000n, 100000n)).toThrow(BadRequestException)
    })

    it('rejects current amount exceeding target amount with BadRequestException', () => {
      expect(() => GoalProgressEngine.calculateFromAmounts(1500000n, 1000000n)).toThrow(BadRequestException)
    })

    it('calculates integer percentage using minor units safely', () => {
      expect(GoalProgressEngine.calculateFromAmounts(250000n, 1000000n)).toBe(25)
      expect(GoalProgressEngine.calculateFromAmounts(333333n, 1000000n)).toBe(33)
      expect(GoalProgressEngine.calculateFromAmounts(1000000n, 1000000n)).toBe(100)
      expect(GoalProgressEngine.calculateFromAmounts(0n, 1000000n)).toBe(0)
    })
  })

  describe('validateAndUpdateProgress', () => {
    it('rejects manual progress percentage for MILESTONES source', () => {
      expect(() =>
        GoalProgressEngine.validateAndUpdateProgress({
          source: 'MILESTONES',
          currentProgressPct: 0,
          newProgressPct: 50,
        }),
      ).toThrow(BadRequestException)
    })

    it('computes from milestones for MILESTONES source', () => {
      const milestones: GoalMilestone[] = [
        { uuid: 'm-1', userGoalId: 1, title: 'Step 1', status: 'COMPLETED', sortOrder: 0 },
        { uuid: 'm-2', userGoalId: 1, title: 'Step 2', status: 'COMPLETED', sortOrder: 1 },
      ]
      const result = GoalProgressEngine.validateAndUpdateProgress({
        source: 'MILESTONES',
        currentProgressPct: 0,
        milestones,
      })
      expect(result).toBe(100)
    })

    it('accepts valid 0-100 integer for MANUAL_PERCENT', () => {
      const result = GoalProgressEngine.validateAndUpdateProgress({
        source: 'MANUAL_PERCENT',
        currentProgressPct: 20,
        newProgressPct: 75,
      })
      expect(result).toBe(75)
    })

    it('rejects invalid percentage (< 0, > 100, non-integer) for MANUAL_PERCENT', () => {
      expect(() =>
        GoalProgressEngine.validateAndUpdateProgress({
          source: 'MANUAL_PERCENT',
          currentProgressPct: 20,
          newProgressPct: -5,
        }),
      ).toThrow(BadRequestException)

      expect(() =>
        GoalProgressEngine.validateAndUpdateProgress({
          source: 'MANUAL_PERCENT',
          currentProgressPct: 20,
          newProgressPct: 105,
        }),
      ).toThrow(BadRequestException)

      expect(() =>
        GoalProgressEngine.validateAndUpdateProgress({
          source: 'MANUAL_PERCENT',
          currentProgressPct: 20,
          newProgressPct: 33.5,
        }),
      ).toThrow(BadRequestException)
    })

    it('rejects manual progress percentage for TARGET_AMOUNT and computes from amounts', () => {
      expect(() =>
        GoalProgressEngine.validateAndUpdateProgress({
          source: 'TARGET_AMOUNT',
          currentProgressPct: 10,
          newProgressPct: 50,
          currentAmountMinor: 100000n,
          targetAmountMinor: 200000n,
        }),
      ).toThrow(BadRequestException)

      const result = GoalProgressEngine.validateAndUpdateProgress({
        source: 'TARGET_AMOUNT',
        currentProgressPct: 0,
        currentAmountMinor: 50000n,
        targetAmountMinor: 100000n,
      })
      expect(result).toBe(50)
    })

    it('rejects manual progress percentage and manual balance updates for RENT_VAULT', () => {
      expect(() =>
        GoalProgressEngine.validateAndUpdateProgress({
          source: 'RENT_VAULT',
          currentProgressPct: 40,
          newProgressPct: 80,
        }),
      ).toThrow(BadRequestException)

      expect(() =>
        GoalProgressEngine.validateAndUpdateProgress({
          source: 'RENT_VAULT',
          currentProgressPct: 40,
          currentAmountMinor: 500000n,
        }),
      ).toThrow(BadRequestException)
    })

    it('computes RENT_VAULT progress strictly from verified principal', () => {
      const progress = GoalProgressEngine.validateAndUpdateProgress({
        source: 'RENT_VAULT',
        currentProgressPct: 0,
        rentVaultBalanceMinor: 25000000n, // 250,000 NGN
        rentVaultTargetMinor: 100000000n, // 1,000,000 NGN
      })
      expect(progress).toBe(25)
    })

    it('rejects manual progress percentage for STATUS_ONLY and returns 0', () => {
      expect(() =>
        GoalProgressEngine.validateAndUpdateProgress({
          source: 'STATUS_ONLY',
          currentProgressPct: 0,
          newProgressPct: 50,
        }),
      ).toThrow(BadRequestException)

      const result = GoalProgressEngine.validateAndUpdateProgress({
        source: 'STATUS_ONLY',
        currentProgressPct: 0,
      })
      expect(result).toBe(0)
    })
  })
})
