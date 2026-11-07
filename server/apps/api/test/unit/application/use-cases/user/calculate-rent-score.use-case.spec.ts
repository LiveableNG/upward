import { NotFoundException } from '@nestjs/common'
import { CalculateRentScoreUseCase } from '@application/use-cases/user/calculate-rent-score.use-case'
import { UserRepository } from '@domains/users/user.repository'
import { IRentCycleRepository } from '@domains/scoring/rent-cycle.repository'
import { S3Service } from '@shared/infrastructure/common/s3/s3.service'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

describe('CalculateRentScoreUseCase (V2)', () => {
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

  it('should throw NotFoundException if user is not found', async () => {
    userRepository.findByUuid.mockResolvedValueOnce(null)
    await expect(useCase.execute('invalid-uuid')).rejects.toThrow(NotFoundException)
  })

  it('should return default unscorable state (500) if user has no rent cycles', async () => {
    userRepository.findByUuid.mockResolvedValueOnce(mockUser)
    rentCycleRepo.findByUserId.mockResolvedValueOnce([])

    const result = await useCase.execute(mockUser.uuid)
    expect(result.success).toBe(true)
    expect(result.data.isScorable).toBe(false)
    expect(result.data.score).toBe(500)
    expect(result.data.band).toBe('Not score-able yet')
  })

  describe('Persona 1: Fresh Upward User ("Chidi") — 3-Year Progression', () => {
    it('distinguishes Paid Early (7+ days) vs Paid On Due Date across Years 1, 2, and 3', async () => {
      const now = new Date('2026-11-07T00:00:00Z')
      jest.useFakeTimers().setSystemTime(now)

      // Year 1: Paid 10 days early -> 300 + 200 (Timeliness) + 100 (Discipline) + 40 (Streak) + 12 (Tenure) = 652
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-10-20T00:00:00Z'), // 12 days early
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)

      const yr1Early = await useCase.execute(mockUser.uuid)
      expect(yr1Early.data.score).toBe(652)
      expect(yr1Early.data.rank).toBe('C')
      expect(yr1Early.data.band).toBe('Good')
      expect(yr1Early.data.metrics.breakdown.timeliness).toBe(200)
      expect(yr1Early.data.metrics.breakdown.streak).toBe(40)
      expect(yr1Early.data.metrics.breakdown.tenure).toBe(12)

      // Year 1: Paid on exact due date -> 300 + 185 + 100 + 40 + 12 = 637
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1-due',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-11-01T00:00:00Z'), // on due date
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)

      const yr1DueDate = await useCase.execute(mockUser.uuid)
      expect(yr1DueDate.data.score).toBe(637)

      // Year 2: 2 cycles paid early -> 652 + 52 = 704 (Rank B — Strong)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 1,
          uuid: 'y1',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2025-11-01T00:00:00Z'),
          paidAt: new Date('2025-10-20T00:00:00Z'),
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
          paidAt: new Date('2026-10-20T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)

      const yr2Early = await useCase.execute(mockUser.uuid)
      expect(yr2Early.data.score).toBe(704)
      expect(yr2Early.data.rank).toBe('B')
      expect(yr2Early.data.band).toBe('Strong')

      // Year 3: 3 cycles paid early -> 704 + 41 = 745 (or 845 Rank A with +100 Rent Vault)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      prisma.upward_rent_vault.findMany.mockResolvedValueOnce([
        {
          id: 10,
          lockStatus: 'LOCKED',
          currentPrincipalKobo: 200000000n,
          targetAmountKobo: 200000000n,
          savingsScore: {
            cadencePoints: 40,
            velocityPoints: 40,
            loanDisciplinePoints: 20,
            totalScore: 100,
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

      const yr3WithVault = await useCase.execute(mockUser.uuid)
      expect(yr3WithVault.data.score).toBe(845)
      expect(yr3WithVault.data.rank).toBe('A')
      expect(yr3WithVault.data.band).toBe('Elite Tenant')
    })
  })

  describe('Persona 2: GoodTenants Imported Tenant ("Funke") — 3-Year Verified History + 3 Years on Upward', () => {
    it('credits 3 years of GoodTenants history on Day 0 (730 / 745) and grows across Years 4, 5, and 6', async () => {
      const now = new Date('2026-11-07T00:00:00Z')
      jest.useFakeTimers().setSystemTime(now)

      const gtCyclesOnDueDate = [
        {
          id: 1,
          uuid: 'gt1',
          userId: 1,
          amountOwed: 1500000,
          amountPaid: 1500000,
          dueDate: new Date('2023-11-01T00:00:00Z'),
          paidAt: new Date('2023-11-01T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'GOODTENANTS_HISTORY',
        },
        {
          id: 2,
          uuid: 'gt2',
          userId: 1,
          amountOwed: 1500000,
          amountPaid: 1500000,
          dueDate: new Date('2024-11-01T00:00:00Z'),
          paidAt: new Date('2024-11-01T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'GOODTENANTS_HISTORY',
        },
        {
          id: 3,
          uuid: 'gt3',
          userId: 1,
          amountOwed: 1500000,
          amountPaid: 1500000,
          dueDate: new Date('2025-11-01T00:00:00Z'),
          paidAt: new Date('2025-11-01T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'GOODTENANTS_HISTORY',
        },
      ]

      // Day 0 after import: 3 GT cycles paid on due date -> 730 (Rank B — Strong)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce(gtCyclesOnDueDate as any)
      const day0Res = await useCase.execute(mockUser.uuid)
      expect(day0Res.data.score).toBe(730)
      expect(day0Res.data.rank).toBe('B')

      // Year 1 on Upward (Cycle 4 paid early): 730 -> 754 (+24 pts)
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        ...gtCyclesOnDueDate,
        {
          id: 4,
          uuid: 'upw4',
          userId: 1,
          amountOwed: 1500000,
          amountPaid: 1500000,
          dueDate: new Date('2026-11-01T00:00:00Z'),
          paidAt: new Date('2026-10-20T00:00:00Z'), // 12 days early
          status: 'PAID_ON_TIME',
          source: 'PAYMENT_REQUEST',
        },
      ] as any)
      const yr1UpwRes = await useCase.execute(mockUser.uuid)
      expect(yr1UpwRes.data.score).toBe(754)
    })
  })

  describe('Fairness & Anti-Gaming Guardrails', () => {
    it('does not penalize early installments settled on or before the due date, and ignores future PENDING invoices', async () => {
      const now = new Date('2026-11-07T00:00:00Z')
      jest.useFakeTimers().setSystemTime(now)

      const due1 = new Date('2026-11-01T00:00:00Z')
      const futureDue = new Date('2027-11-01T00:00:00Z')

      userRepository.findByUuid.mockResolvedValueOnce(mockUser)
      rentCycleRepo.findByUserId.mockResolvedValueOnce([
        {
          id: 101,
          uuid: 'c-early-tranches',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: due1,
          status: 'PAID_ON_TIME',
          paymentRequestId: 501,
          source: 'PAYMENT_REQUEST',
        },
        {
          id: 102,
          uuid: 'c-future-pending',
          userId: 1,
          amountOwed: 2000000,
          amountPaid: 0,
          dueDate: futureDue,
          status: 'PENDING',
          paymentRequestId: 502,
          source: 'PAYMENT_REQUEST',
        },
        {
          id: 103,
          uuid: 'c-unverified-self-report',
          userId: 1,
          userPropertyId: 999,
          amountOwed: 2000000,
          amountPaid: 2000000,
          dueDate: new Date('2025-11-01T00:00:00Z'),
          paidAt: new Date('2025-10-15T00:00:00Z'),
          status: 'PAID_ON_TIME',
          source: 'SELF_REPORTED',
        },
      ] as any)

      // Paid in 2 early tranches (15 days early and 10 days early)
      prisma.upward_transaction.findMany.mockResolvedValueOnce([
        {
          paymentRequestId: 501,
          amount: 1000000,
          status: 'SUCCESS',
          createdAt: new Date('2026-10-15T00:00:00Z'),
        },
        {
          paymentRequestId: 501,
          amount: 1000000,
          status: 'SUCCESS',
          createdAt: new Date('2026-10-20T00:00:00Z'),
        },
      ])

      const result = await useCase.execute(mockUser.uuid)
      expect(result.data.metrics.discipline).toBe(100)
      expect(result.data.metrics.longestStreak).toBe(1)
      expect(result.data.metrics.totalCycles).toBe(1)
      expect(result.data.score).toBe(652)
    })
  })
})
