import { NotFoundException } from '@nestjs/common'
import { CalculateRentScoreUseCase } from '@application/use-cases/user/calculate-rent-score.use-case'
import { UserRepository } from '@domains/users/user.repository'
import { IRentCycleRepository } from '@domains/scoring/rent-cycle.repository'
import { S3Service } from '@shared/infrastructure/common/s3/s3.service'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

describe('CalculateRentScoreUseCase', () => {
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
    properties: []
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
      upward_transaction: { findMany: jest.fn() },
      upward_user_property: { findMany: jest.fn() },
      upward_wallet: { findUnique: jest.fn() },
      upward_savings_goal: { findMany: jest.fn() },
      upward_wallet_transaction: { findMany: jest.fn() },
    }

    useCase = new CalculateRentScoreUseCase(
      userRepository,
      rentCycleRepo,
      s3Service,
      prisma as PrismaService
    )
  })

  it('should throw NotFoundException if user is not found', async () => {
    userRepository.findByUuid.mockResolvedValueOnce(null)
    await expect(useCase.execute('invalid-uuid')).rejects.toThrow(NotFoundException)
  })

  it('should return default unscorable state if user has no rent cycles', async () => {
    userRepository.findByUuid.mockResolvedValueOnce(mockUser)
    rentCycleRepo.findByUserId.mockResolvedValueOnce([])

    const result = await useCase.execute(mockUser.uuid)
    expect(result.success).toBe(true)
    expect(result.data.isScorable).toBe(false)
    expect(result.data.score).toBe(500)
    expect(result.data.band).toBe('Not score-able yet')
  })

  describe('Redesigned URS Calculations', () => {
    it('should calculate URS correctly based on the plan test case trace', async () => {
      // Mock user lookup
      userRepository.findByUuid.mockResolvedValueOnce(mockUser)

      // 4 Rent Cycles:
      // Cycle 1: Due 9 months ago. Paid early (on time).
      // Cycle 2: Due 6 months ago. Paid late (10 days late).
      // Cycle 3: Due 3 months ago. Paid in two tranches (partial).
      // Cycle 4: Due 1 month ago. Missed.
      const now = new Date('2026-08-07T12:00:00Z')
      
      const due1 = new Date('2025-11-07T12:00:00Z')
      const due2 = new Date('2026-02-07T12:00:00Z')
      const due3 = new Date('2026-05-07T12:00:00Z')
      const due4 = new Date('2026-07-07T12:00:00Z')

      const cycles = [
        { id: 101, uuid: 'c1', userId: mockUser.id, amountOwed: 100000, amountPaid: 100000, dueDate: due1, status: 'PAID_ON_TIME', paymentRequestId: 201 },
        { id: 102, uuid: 'c2', userId: mockUser.id, amountOwed: 100000, amountPaid: 100000, dueDate: due2, status: 'PAID_LATE', paymentRequestId: 202 },
        { id: 103, uuid: 'c3', userId: mockUser.id, amountOwed: 100000, amountPaid: 100000, dueDate: due3, status: 'PAID_LATE', paymentRequestId: 203 },
        { id: 104, uuid: 'c4', userId: mockUser.id, amountOwed: 100000, amountPaid: 0, dueDate: due4, status: 'MISSED', paymentRequestId: 204 },
      ]
      rentCycleRepo.findByUserId.mockResolvedValueOnce(cycles as any)

      // Mock successful transactions linked to payment requests
      // Cycle 1: Paid on-time
      // Cycle 2: 10 days late (paid at due2 + 10 days)
      const pay2 = new Date(due2.getTime() + 10 * 24 * 60 * 60 * 1000)
      // Cycle 3: 20 days late (tranche 1 early, tranche 2 paid at due3 + 20 days)
      const pay3Tranche1 = new Date(due3.getTime() - 2 * 24 * 60 * 60 * 1000)
      const pay3Tranche2 = new Date(due3.getTime() + 20 * 24 * 60 * 60 * 1000)

      const mockTxs = [
        { paymentRequestId: 201, amount: 100000, status: 'SUCCESS', createdAt: due1 },
        { paymentRequestId: 202, amount: 100000, status: 'SUCCESS', createdAt: pay2 },
        { paymentRequestId: 203, amount: 50000, status: 'SUCCESS', createdAt: pay3Tranche1 },
        { paymentRequestId: 203, amount: 50000, status: 'SUCCESS', createdAt: pay3Tranche2 },
      ]
      prisma.upward_transaction.findMany.mockResolvedValueOnce(mockTxs)
      
      // Expected annual rent mock: rentAmount = 100,000, rentType = 'Monthly' -> 1,200,000
      prisma.upward_user_property.findMany.mockResolvedValueOnce([
        { id: 1, rentAmount: 100000, rentType: 'Monthly', isPastTenancy: false }
      ])

      // Savings mock: wallet = 120,000, goals = 60,000 -> 180,000 total (15% of annual rent)
      prisma.upward_wallet.findUnique.mockResolvedValueOnce({ balance: 120000 })
      prisma.upward_savings_goal.findMany.mockResolvedValueOnce([
        { currentAmount: 60000 }
      ])

      // Savings consistency mock: 6 deposits in distinct months
      const mockDeposits = [
        { createdAt: new Date('2026-01-10T12:00:00Z') },
        { createdAt: new Date('2026-02-15T12:00:00Z') },
        { createdAt: new Date('2026-03-20T12:00:00Z') },
        { createdAt: new Date('2026-04-12T12:00:00Z') },
        { createdAt: new Date('2026-05-18T12:00:00Z') },
        { createdAt: new Date('2026-06-25T12:00:00Z') },
      ]
      prisma.upward_wallet_transaction.findMany.mockResolvedValueOnce(mockDeposits)

      // Mock Date in usecase:
      jest.useFakeTimers().setSystemTime(now)

      const result = await useCase.execute(mockUser.uuid)

      expect(result.success).toBe(true)
      expect(result.data.isScorable).toBe(true)
      expect(result.data.maxScore).toBe(900)
      
      // Verify final calculated URS score matches math: 581
      expect(result.data.score).toBe(581)
      expect(result.data.band).toBe('Risky')
      expect(result.data.rank).toBe('D')

      jest.useRealTimers()
    })
  })
})
