import { NotFoundException } from '@nestjs/common'
import {
  CalculateRentScoreUseCase,
  evaluateTimelinessFromDaysDiff,
  getStreakPointsFromCurve,
  getTenurePointsFromCurve,
  getScoreBandAndRank,
} from '@application/use-cases/user/calculate-rent-score.use-case'
import { UserRepository } from '@domains/users/user.repository'
import { IRentCycleRepository } from '@domains/scoring/rent-cycle.repository'
import { S3Service } from '@shared/infrastructure/common/s3/s3.service'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

describe('CalculateRentScoreUseCase (V2 Comprehensive Suite)', () => {
  let useCase: CalculateRentScoreUseCase
  let userRepository: jest.Mocked<UserRepository>
  let rentCycleRepo: jest.Mocked<IRentCycleRepository>
  let s3Service: jest.Mocked<S3Service>
  let prisma: any

  const mockUser: any = {
    id: 1,
    uuid: 'user-uuid-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@doe.com',
    phone: '08012345678',
    bio: 'A responsible resident',
    profilePic: 'pic.jpg',
    profileSlug: 'john-doe',
    isIdentityVerified: true,
    savingsWalletEnabled: true,
    properties: [],
  }

  beforeEach(() => {
    userRepository = {
      findByUuid: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    rentCycleRepo = {
      findByUserId: jest.fn(),
    } as any

    s3Service = {
      getDownloadUrl: jest.fn().mockResolvedValue('https://s3.download/pic.jpg'),
    } as any

    prisma = {
      upward_transaction: { findMany: jest.fn().mockResolvedValue([]) },
      upward_user_property: { findMany: jest.fn().mockResolvedValue([]) },
      upward_rent_vault: { findMany: jest.fn().mockResolvedValue([]) },
      upward_wallet: { findUnique: jest.fn().mockResolvedValue(null) },
      upward_savings_goal: { findMany: jest.fn().mockResolvedValue([]) },
      upward_wallet_transaction: { findMany: jest.fn().mockResolvedValue([]) },
    }

    useCase = new CalculateRentScoreUseCase(
      userRepository,
      rentCycleRepo,
      s3Service,
      prisma as PrismaService,
    )
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('1. Pure V2 Scoring Helper Functions', () => {
    it('evaluates all Timeliness bands accurately (Early 7+d, Early 1-6d, Due Date, 48h Grace, 3-14d, 15-30d, 31-90d, 91-365d, >365d)', () => {
      // Paid 7+ days early -> 200 pts (1.0)
      expect(evaluateTimelinessFromDaysDiff(-10)).toEqual({
        points: 200,
        ratio: 1.0,
        tier: 'PAID_EARLY',
        isOnTime: true,
      })
      expect(evaluateTimelinessFromDaysDiff(-7)).toEqual({
        points: 200,
        ratio: 1.0,
        tier: 'PAID_EARLY',
        isOnTime: true,
      })

      // Paid 1-6 days early -> 190 pts (0.95)
      expect(evaluateTimelinessFromDaysDiff(-6)).toEqual({
        points: 190,
        ratio: 0.95,
        tier: 'PAID_SLIGHTLY_EARLY',
        isOnTime: true,
      })
      expect(evaluateTimelinessFromDaysDiff(-1)).toEqual({
        points: 190,
        ratio: 0.95,
        tier: 'PAID_SLIGHTLY_EARLY',
        isOnTime: true,
      })

      // Paid on due date -> 185 pts (0.925)
      expect(evaluateTimelinessFromDaysDiff(0)).toEqual({
        points: 185,
        ratio: 0.925,
        tier: 'PAID_ON_DUE_DATE',
        isOnTime: true,
      })

      // Paid within 48-hour bank transfer grace window (+1 or +2 days) -> 185 pts (0.925)
      expect(evaluateTimelinessFromDaysDiff(1)).toEqual({
        points: 185,
        ratio: 0.925,
        tier: 'GRACE_PERIOD',
        isOnTime: true,
      })
      expect(evaluateTimelinessFromDaysDiff(2)).toEqual({
        points: 185,
        ratio: 0.925,
        tier: 'GRACE_PERIOD',
        isOnTime: true,
      })

      // 3 to 14 days late -> smooth linear dip 180 -> 140 pts
      const day3 = evaluateTimelinessFromDaysDiff(3)
      expect(day3.points).toBeCloseTo(180, 5)
      expect(day3.tier).toBe('LATE_MINOR')
      expect(day3.isOnTime).toBe(false)

      const day14 = evaluateTimelinessFromDaysDiff(14)
      expect(day14.points).toBeCloseTo(140, 5)
      expect(day14.tier).toBe('LATE_MINOR')

      // 15 to 30 days late -> 140 -> 100 pts
      const day22 = evaluateTimelinessFromDaysDiff(22)
      expect(day22.points).toBeCloseTo(120, 5)
      expect(day22.tier).toBe('LATE_MODERATE')

      const day30 = evaluateTimelinessFromDaysDiff(30)
      expect(day30.points).toBeCloseTo(100, 5)

      // 31 to 90 days late -> 100 -> 20 pts (no cliff at day 31!)
      const day31 = evaluateTimelinessFromDaysDiff(31)
      expect(day31.points).toBeGreaterThan(98)
      expect(day31.tier).toBe('LATE_SEVERE')

      const day60 = evaluateTimelinessFromDaysDiff(60)
      expect(day60.points).toBeCloseTo(60, 5)

      const day90 = evaluateTimelinessFromDaysDiff(90)
      expect(day90.points).toBeCloseTo(20, 5)

      // > 365 days late -> 0 pts
      expect(evaluateTimelinessFromDaysDiff(400).points).toBe(0)
    })

    it('follows the 6-Year Track-Record Curve for Streak (40 -> 80 -> 110 -> 125 -> 140 -> 150) and Tenure (12 -> 24 -> 35 -> 40 -> 45 -> 50)', () => {
      expect(getStreakPointsFromCurve(0, 0)).toBe(0)
      expect(getStreakPointsFromCurve(1, 1)).toBe(40)
      expect(getStreakPointsFromCurve(2, 2)).toBe(80)
      expect(getStreakPointsFromCurve(3, 3)).toBe(110)
      expect(getStreakPointsFromCurve(4, 4)).toBe(125)
      expect(getStreakPointsFromCurve(5, 5)).toBe(140)
      expect(getStreakPointsFromCurve(6, 6)).toBe(150)
      expect(getStreakPointsFromCurve(10, 10)).toBe(150)

      expect(getTenurePointsFromCurve(0)).toBe(0)
      expect(getTenurePointsFromCurve(1)).toBe(12)
      expect(getTenurePointsFromCurve(2)).toBe(24)
      expect(getTenurePointsFromCurve(3)).toBe(35)
      expect(getTenurePointsFromCurve(4)).toBe(40)
      expect(getTenurePointsFromCurve(5)).toBe(45)
      expect(getTenurePointsFromCurve(6)).toBe(50)
      expect(getTenurePointsFromCurve(8)).toBe(50)
    })

    it('maps score bands and ranks uniformly on the 300-900 scale', () => {
      expect(getScoreBandAndRank(850)).toEqual({ band: 'Elite Tenant', rank: 'A' })
      expect(getScoreBandAndRank(800)).toEqual({ band: 'Elite Tenant', rank: 'A' })
      expect(getScoreBandAndRank(750)).toEqual({ band: 'Strong', rank: 'B' })
      expect(getScoreBandAndRank(652)).toEqual({ band: 'Good', rank: 'C' })
      expect(getScoreBandAndRank(550)).toEqual({ band: 'Fair', rank: 'D' })
      expect(getScoreBandAndRank(420)).toEqual({ band: 'High Risk', rank: 'E' })
    })
  })

  describe('2. Base & Unscorable States', () => {
    it('throws NotFoundException if user is not found', async () => {
      userRepository.findByUuid.mockResolvedValueOnce(null)
      await expect(useCase.execute('invalid-uuid')).rejects.toThrow(NotFoundException)
    })

    it('returns default unscorable state (500) if user has no rent cycles', async () => {
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([])

      const result = await useCase.execute(mockUser.uuid)
      expect(result.success).toBe(true)
      expect(result.data.isScorable).toBe(false)
      expect(result.data.score).toBe(500)
      expect(result.data.band).toBe('Not score-able yet')
      expect(result.data.rank).toBe('N/A')
    })
  })

  describe('3. Persona 1 ("Chidi" — Fresh User on Upward): Full 3-Year Play-Out', () => {
    const now = new Date('2026-11-07T00:00:00Z')

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now)
    })

    it('matches exact 3-year progression for Paid Early (652 -> 704 -> 745) and Paid On Due Date (637 -> 689 -> 730)', async () => {
      // Year 1: Paid Early (652) vs Paid On Due Date (637) vs Slightly Early 1-6d (642)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1-early',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-10-20T00:00:00Z'), // 12 days early
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)
      const y1Early = await useCase.execute(mockUser.uuid)
      expect(y1Early.data.score).toBe(652)
      expect(y1Early.data.rank).toBe('C')

      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1-slight',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-10-29T00:00:00Z'), // 3 days early -> 190 pts
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)
      const y1SlightlyEarly = await useCase.execute(mockUser.uuid)
      expect(y1SlightlyEarly.data.score).toBe(642)

      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1-due',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-11-01T00:00:00Z'), // on due date -> 185 pts
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)
      const y1Due = await useCase.execute(mockUser.uuid)
      expect(y1Due.data.score).toBe(637)

      // Year 2: Paid Early (704) vs Paid On Due Date (689)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2025-11-01T00:00:00Z'),
          paidAt: new Date('2025-11-01T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
        {
          id: 2,
          uuid: 'y2',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-11-01T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)
      const y2Due = await useCase.execute(mockUser.uuid)
      expect(y2Due.data.score).toBe(689)
      expect(y2Due.data.rank).toBe('C')

      // Year 3: Paid Early (745) vs Paid On Due Date (730)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2024-11-01T00:00:00Z'),
          paidAt: new Date('2024-10-20T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
        {
          id: 2,
          uuid: 'y2',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2025-11-01T00:00:00Z'),
          paidAt: new Date('2025-10-20T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
        {
          id: 3,
          uuid: 'y3',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-10-20T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)
      const y3Early = await useCase.execute(mockUser.uuid)
      expect(y3Early.data.score).toBe(745)
      expect(y3Early.data.rank).toBe('B')
      // Verify scoreHistory timeline deltas: +152 -> +52 -> +41
      const chronologicalHistory = [...y3Early.data.scoreHistory].reverse()
      expect(chronologicalHistory.map((h: any) => h.delta)).toEqual([152, 52, 41])
      expect(chronologicalHistory.map((h: any) => h.scoreAfter)).toEqual([652, 704, 745])
    })
  })

  describe('4. Persona 2 ("Funke" — GoodTenants 3-Yr Import): Full 3-Year Play-Out on Upward (Cycles 4, 5, 6)', () => {
    const now = new Date('2026-11-07T00:00:00Z')

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now)
    })

    it('matches Case 1 (GT Due-Date History -> Pays Early on Upward): 730 -> 754 -> 776 -> 793', async () => {
      const gtDueCycles = [
        {
          id: 1,
          uuid: 'gt1',
          userId: 1,
          amountOwed: 1500000,
          amountPaid: 1500000,
          dueDate: new Date('2021-11-01T00:00:00Z'),
          paidAt: new Date('2021-11-01T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'GOODTENANTS_HISTORY',
        },
        {
          id: 2,
          uuid: 'gt2',
          userId: 1,
          amountOwed: 1500000,
          amountPaid: 1500000,
          dueDate: new Date('2022-11-01T00:00:00Z'),
          paidAt: new Date('2022-11-01T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'GOODTENANTS_HISTORY',
        },
        {
          id: 3,
          uuid: 'gt3',
          userId: 1,
          amountOwed: 1500000,
          amountPaid: 1500000,
          dueDate: new Date('2023-11-01T00:00:00Z'),
          paidAt: new Date('2023-11-01T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'GOODTENANTS_HISTORY',
        },
      ]

      const upwCycle4 = {
        id: 4,
        uuid: 'upw4',
        userId: 1,
        amountOwed: 1500000,
        amountPaid: 1500000,
        dueDate: new Date('2024-11-01T00:00:00Z'),
        paidAt: new Date('2024-10-20T00:00:00Z'),
        status: 'PAID_ON_TIME',
        source: 'PAYMENT_REQUEST',
      }
      const upwCycle5 = {
        id: 5,
        uuid: 'upw5',
        userId: 1,
        amountOwed: 1500000,
        amountPaid: 1500000,
        dueDate: new Date('2025-11-01T00:00:00Z'),
        paidAt: new Date('2025-10-20T00:00:00Z'),
        status: 'PAID_ON_TIME',
        source: 'PAYMENT_REQUEST',
      }
      const upwCycle6 = {
        id: 6,
        uuid: 'upw6',
        userId: 1,
        amountOwed: 1500000,
        amountPaid: 1500000,
        dueDate: new Date('2026-11-01T00:00:00Z'),
        paidAt: new Date('2026-10-20T00:00:00Z'),
        status: 'PAID_ON_TIME',
        source: 'PAYMENT_REQUEST',
      }

      // Day 0 (3 GT cycles) -> 730
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce(gtDueCycles as any)
      expect((await useCase.execute(mockUser.uuid)).data.score).toBe(730)

      // Year 1 on Upward (Cycle 4) -> 754 (+24)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([...gtDueCycles, upwCycle4] as any)
      expect((await useCase.execute(mockUser.uuid)).data.score).toBe(754)

      // Year 2 on Upward (Cycle 5) -> 776 (+22)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        ...gtDueCycles,
        upwCycle4,
        upwCycle5,
      ] as any)
      expect((await useCase.execute(mockUser.uuid)).data.score).toBe(776)

      // Year 3 on Upward (Cycle 6) -> 793 (+17)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        ...gtDueCycles,
        upwCycle4,
        upwCycle5,
        upwCycle6,
      ] as any)
      expect((await useCase.execute(mockUser.uuid)).data.score).toBe(793)
    })

    it('matches Case 2 (GT Early History -> Pays Early on Upward): 745 -> 765 -> 785 -> 800 (and 900 max with Rent Vault)', async () => {
      const makeEarlyCycle = (id: number, year: number, source: string) => ({
        id,
        uuid: `c-${id}`,
        userId: 1,
        amountOwed: 1500000,
        amountPaid: 1500000,
        dueDate: new Date(`${year}-11-01T00:00:00Z`),
        paidAt: new Date(`${year}-10-20T00:00:00Z`), // 12 days early
        status: 'PAID_ON_TIME',
        source,
      })

      const c1 = makeEarlyCycle(1, 2021, 'GOODTENANTS_HISTORY')
      const c2 = makeEarlyCycle(2, 2022, 'GOODTENANTS_HISTORY')
      const c3 = makeEarlyCycle(3, 2023, 'GOODTENANTS_HISTORY')
      const c4 = makeEarlyCycle(4, 2024, 'PAYMENT_REQUEST')
      const c5 = makeEarlyCycle(5, 2025, 'PAYMENT_REQUEST')
      const c6 = makeEarlyCycle(6, 2026, 'PAYMENT_REQUEST')

      // Day 0 -> 745
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([c1, c2, c3] as any)
      expect((await useCase.execute(mockUser.uuid)).data.score).toBe(745)

      // Year 1 -> 765
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([c1, c2, c3, c4] as any)
      expect((await useCase.execute(mockUser.uuid)).data.score).toBe(765)

      // Year 2 -> 785
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([c1, c2, c3, c4, c5] as any)
      expect((await useCase.execute(mockUser.uuid)).data.score).toBe(785)

      // Year 3 -> 800 (Rank A — Elite Tenant)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([c1, c2, c3, c4, c5, c6] as any)
      const yr3Res = await useCase.execute(mockUser.uuid)
      expect(yr3Res.data.score).toBe(800)
      expect(yr3Res.data.rank).toBe('A')

      // Year 3 + Active 100-pt Rent Vault -> 900 Max Score
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      prisma.upward_rent_vault.findMany.mockResolvedValueOnce([
        {
          id: 1,
          lockStatus: 'SETTLED',
          currentPrincipalKobo: 0n,
          targetAmountKobo: 150000000n,
          savingsScore: { totalScore: 100, cadencePoints: 40, velocityPoints: 40 },
        },
      ])
      rentCycleRepo.findByUserId.mockResolvedValueOnce([c1, c2, c3, c4, c5, c6] as any)
      const maxRes = await useCase.execute(mockUser.uuid)
      expect(maxRes.data.score).toBe(900)
      expect(maxRes.data.rank).toBe('A')
    })
  })

  describe('5. Progressive Early Part-Payment Interpolation & Rent Vault Guardrails', () => {
    it('smoothly interpolates score when a user makes an early 50% part-payment on an upcoming rent bill', async () => {
      const now = new Date('2026-10-15T00:00:00Z')
      jest.useFakeTimers().setSystemTime(now)

      // Upcoming cycle due Nov 1, 2026 (17 days in the future), 50% paid early
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'pending-half',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 1000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-10-15T00:00:00Z'),
          status: 'PARTIAL_ON_TIME',
          paymentRequestId: 777,
          source: 'PAYMENT_REQUEST',
        },
      ] as any)
      prisma.upward_transaction.findMany.mockResolvedValueOnce([
        {
          paymentRequestId: 777,
          amount: 1000000,
          status: 'SUCCESS',
          createdAt: new Date('2026-10-15T00:00:00Z'),
        },
      ])

      const res = await useCase.execute(mockUser.uuid)
      expect(res.data.isScorable).toBe(true)
      // Base unscored is 500, potential full early score is 652 -> 50% paid = 500 + (652 - 500) * 0.5 = 576
      expect(res.data.score).toBe(576)
    })

    it('does not award free Rent Vault points for an empty unfunded vault with 0 principal and 0 cadence/velocity points', async () => {
      const now = new Date('2026-11-07T00:00:00Z')
      jest.useFakeTimers().setSystemTime(now)

      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      // Empty vault just initialized (0 principal, 0 cadence, 0 velocity, default 20 loanDisciplinePoints)
      prisma.upward_rent_vault.findMany.mockResolvedValueOnce([
        {
          id: 99,
          lockStatus: 'LOCKED',
          currentPrincipalKobo: 0n,
          targetAmountKobo: 200000000n,
          savingsScore: {
            cadencePoints: 0,
            velocityPoints: 0,
            loanDisciplinePoints: 20,
            totalScore: 20,
          },
        },
      ])
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-10-20T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)

      const res = await useCase.execute(mockUser.uuid)
      expect(res.data.metrics.savingsBonus).toBe(0)
      expect(res.data.score).toBe(652)
    })
  })
})
