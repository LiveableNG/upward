import { PrismaGoalRepository } from '@shared/infrastructure/prisma/repositories/prisma-goal.repository'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

describe('PrismaGoalRepository - Domain Integrity & Non-Destructive Operations', () => {
  let repository: PrismaGoalRepository
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      upward_goal_category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      upward_goal: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      upward_user_goal: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      upward_goal_milestone: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      upward_housing_adoption_decision: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      upward_goal_interest: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      upward_goal_interest_history: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      upward_goal_collection: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      upward_goal_offering: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    }

    repository = new PrismaGoalRepository(mockPrisma as unknown as PrismaService)
  })

  describe('Non-destructive setUserGoals', () => {
    it('soft-archives deselected catalogue goals, preserving progress and milestones instead of deleting', async () => {
      const userId = 10
      const existingGoals = [
        {
          id: 101,
          userId,
          goalId: 1,
          status: 'ACTIVE',
          progressPct: 40,
          historicalTitle: 'Emergency Fund',
        },
        {
          id: 102,
          userId,
          goalId: 2,
          status: 'ACTIVE',
          progressPct: 75,
          historicalTitle: 'Save for Rent',
        },
      ]

      mockPrisma.upward_user_goal.findMany
        .mockResolvedValueOnce(existingGoals) // initial query for existing
        .mockResolvedValueOnce([existingGoals[0]]) // final active goals query

      mockPrisma.upward_user_goal.update.mockResolvedValue({})

      // User selects only goal 1; goal 2 is deselected
      const result = await repository.setUserGoals(userId, [1])

      // Verify deleteMany was NOT called
      expect(mockPrisma.upward_user_goal.deleteMany).not.toHaveBeenCalled()

      // Verify goal 2 was soft-archived with archivedAt timestamp
      expect(mockPrisma.upward_user_goal.update).toHaveBeenCalledWith({
        where: { id: 102 },
        data: expect.objectContaining({
          status: 'ARCHIVED',
          archivedAt: expect.any(Date),
        }),
      })

      // Verify active goal 1 was preserved
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe(101)
    })

    it('reactivates previously archived catalogue goals when re-selected', async () => {
      const userId = 10
      const existingGoals = [
        {
          id: 102,
          userId,
          goalId: 2,
          status: 'ARCHIVED',
          archivedAt: new Date('2026-01-01'),
          progressPct: 75,
          historicalTitle: 'Save for Rent',
        },
      ]

      mockPrisma.upward_user_goal.findMany
        .mockResolvedValueOnce(existingGoals)
        .mockResolvedValueOnce([
          {
            ...existingGoals[0],
            status: 'ACTIVE',
            archivedAt: null,
          },
        ])

      mockPrisma.upward_user_goal.update.mockResolvedValue({})

      const result = await repository.setUserGoals(userId, [2])

      // Verify reactivated: status ACTIVE and archivedAt null
      expect(mockPrisma.upward_user_goal.update).toHaveBeenCalledWith({
        where: { id: 102 },
        data: {
          status: 'ACTIVE',
          archivedAt: null,
        },
      })
      expect(result[0]?.status).toBe('ACTIVE')
      expect(result[0]?.archivedAt).toBeNull()
    })

    it('creates newly selected catalogue goals with metadata snapshots', async () => {
      const userId = 10
      mockPrisma.upward_user_goal.findMany
        .mockResolvedValueOnce([]) // no existing goals
        .mockResolvedValueOnce([
          {
            id: 201,
            userId,
            goalId: 5,
            categoryId: 3,
            historicalTitle: 'Buy Workspace Equipment',
            status: 'ACTIVE',
            progressSource: 'MANUAL_PERCENT',
            currency: 'NGN',
          },
        ])

      mockPrisma.upward_goal.findMany.mockResolvedValueOnce([
        {
          id: 5,
          title: 'Buy Workspace Equipment',
          categoryId: 3,
        },
      ])

      mockPrisma.upward_user_goal.create.mockResolvedValue({})

      const result = await repository.setUserGoals(userId, [5])

      expect(mockPrisma.upward_user_goal.create).toHaveBeenCalledWith({
        data: {
          userId,
          goalId: 5,
          categoryId: 3,
          historicalTitle: 'Buy Workspace Equipment',
          customTitle: null,
          customDescription: null,
          status: 'ACTIVE',
          progressSource: 'MANUAL_PERCENT',
          progressPct: 0,
          currency: 'NGN',
        },
      })
      expect(result).toHaveLength(1)
    })

    it('never touches custom goals (goalId is null) during catalogue synchronization', async () => {
      const userId = 10

      // Only catalogue goals are queried by setUserGoals
      mockPrisma.upward_user_goal.findMany
        .mockResolvedValueOnce([]) // existing catalogue goals (empty)
        .mockResolvedValueOnce([
          {
            id: 301,
            userId,
            goalId: null, // Custom goal
            customTitle: 'Custom Travel Goal',
            historicalTitle: 'Custom Travel Goal',
            status: 'ACTIVE',
          },
        ])

      const result = await repository.setUserGoals(userId, [])

      // Verify that the query specifically filters for goalId != null
      expect(mockPrisma.upward_user_goal.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: {
            userId,
            goalId: { not: null },
          },
        }),
      )
      // Delete or update was not called on custom goal
      expect(mockPrisma.upward_user_goal.deleteMany).not.toHaveBeenCalled()
      expect(mockPrisma.upward_user_goal.update).not.toHaveBeenCalled()
    })
  })

  describe('Custom and Catalogue Goal Creation (createUserGoal)', () => {
    it('creates a custom goal with trimmed customTitle and matching historicalTitle snapshot', async () => {
      const userId = 15
      const createdRecord = {
        id: 401,
        uuid: 'ug-uuid-custom',
        userId,
        goalId: null,
        categoryId: 2,
        customTitle: 'Renovate Home Office',
        historicalTitle: 'Renovate Home Office',
        customDescription: 'Ergonomic table and plants',
        status: 'ACTIVE',
        progressSource: 'MANUAL_PERCENT',
        progressPct: 0,
        currency: 'NGN',
      }
      mockPrisma.upward_user_goal.create.mockResolvedValueOnce(createdRecord)

      const result = await repository.createUserGoal({
        userId,
        categoryId: 2,
        customTitle: '  Renovate Home Office  ',
        customDescription: 'Ergonomic table and plants',
      })

      expect(mockPrisma.upward_user_goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            goalId: null,
            categoryId: 2,
            customTitle: 'Renovate Home Office',
            historicalTitle: 'Renovate Home Office',
            customDescription: 'Ergonomic table and plants',
          }),
        }),
      )
      expect(result.customTitle).toBe('Renovate Home Office')
      expect(result.historicalTitle).toBe('Renovate Home Office')
      expect(result.goalId).toBeNull()
    })

    it('rejects custom goal creation if customTitle is missing or whitespace', async () => {
      await expect(
        repository.createUserGoal({
          userId: 15,
          categoryId: 2,
          customTitle: '   ',
        }),
      ).rejects.toThrow(BadRequestException)

      await expect(
        repository.createUserGoal({
          userId: 15,
          categoryId: 2,
          customTitle: undefined,
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('rejects custom goal creation if categoryId is missing', async () => {
      await expect(
        repository.createUserGoal({
          userId: 15,
          customTitle: 'My Goal',
          categoryId: undefined,
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('creates a catalogue-backed goal using catalogue metadata snapshots and null custom fields', async () => {
      const userId = 15
      mockPrisma.upward_goal.findUnique.mockResolvedValueOnce({
        id: 8,
        title: 'Save for Rent Deposit',
        categoryId: 4,
      })

      const createdRecord = {
        id: 402,
        uuid: 'ug-uuid-catalog',
        userId,
        goalId: 8,
        categoryId: 4,
        historicalTitle: 'Save for Rent Deposit',
        customTitle: null,
        customDescription: null,
        status: 'ACTIVE',
        progressSource: 'RENT_VAULT',
        progressPct: 10,
        currency: 'NGN',
      }
      mockPrisma.upward_user_goal.create.mockResolvedValueOnce(createdRecord)

      const result = await repository.createUserGoal({
        userId,
        goalId: 8,
        progressSource: 'RENT_VAULT',
        progressPct: 10,
      })

      expect(mockPrisma.upward_user_goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            goalId: 8,
            categoryId: 4,
            historicalTitle: 'Save for Rent Deposit',
            customTitle: null,
            customDescription: null,
          }),
        }),
      )
      expect(result.historicalTitle).toBe('Save for Rent Deposit')
      expect(result.customTitle).toBeNull()
    })

    it('throws NotFoundException when referenced catalogue goal does not exist', async () => {
      mockPrisma.upward_goal.findUnique.mockResolvedValueOnce(null)

      await expect(
        repository.createUserGoal({
          userId: 15,
          goalId: 999,
        }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('Milestone Operations', () => {
    it('creates milestone with default PENDING status', async () => {
      const milestoneRecord = {
        id: 1,
        uuid: 'ms-uuid-1',
        userGoalId: 50,
        title: 'Save first 100k',
        status: 'PENDING',
        sortOrder: 0,
        targetDate: null,
        completedAt: null,
      }
      mockPrisma.upward_goal_milestone.create.mockResolvedValueOnce(milestoneRecord)

      const result = await repository.createMilestone({
        userGoalId: 50,
        title: 'Save first 100k',
      })

      expect(mockPrisma.upward_goal_milestone.create).toHaveBeenCalledWith({
        data: {
          userGoalId: 50,
          title: 'Save first 100k',
          status: 'PENDING',
          sortOrder: 0,
          targetDate: undefined,
          completedAt: undefined,
        },
      })
      expect(result.status).toBe('PENDING')
    })

    it('finds milestones for a user goal sorted by sortOrder', async () => {
      const milestones = [
        { id: 1, userGoalId: 50, sortOrder: 0, title: 'Step 1' },
        { id: 2, userGoalId: 50, sortOrder: 1, title: 'Step 2' },
      ]
      mockPrisma.upward_goal_milestone.findMany.mockResolvedValueOnce(milestones)

      const result = await repository.findMilestones(50)

      expect(mockPrisma.upward_goal_milestone.findMany).toHaveBeenCalledWith({
        where: { userGoalId: 50 },
        orderBy: { sortOrder: 'asc' },
      })
      expect(result).toHaveLength(2)
    })
  })

  describe('Housing Adoption Decision Operations', () => {
    it('creates a housing adoption decision record with default PENDING status', async () => {
      const decisionRecord = {
        id: 1,
        uuid: 'had-1',
        userId: 25,
        userPropertyId: 10,
        rentVaultId: null,
        userGoalId: 60,
        status: 'PENDING',
        decidedAt: null,
      }
      mockPrisma.upward_housing_adoption_decision.create.mockResolvedValueOnce(decisionRecord)

      const result = await repository.createHousingAdoptionDecision({
        userId: 25,
        userPropertyId: 10,
        userGoalId: 60,
      })

      expect(mockPrisma.upward_housing_adoption_decision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 25,
            userPropertyId: 10,
            status: 'PENDING',
          }),
        }),
      )
      expect(result.status).toBe('PENDING')
    })

    it('updates housing adoption decision status and records change', async () => {
      const updatedRecord = {
        id: 1,
        userId: 25,
        status: 'ACCEPTED',
        decidedAt: new Date(),
      }
      mockPrisma.upward_housing_adoption_decision.update.mockResolvedValueOnce(updatedRecord)

      const result = await repository.updateHousingAdoptionDecision(1, {
        status: 'ACCEPTED',
      })

      expect(result.status).toBe('ACCEPTED')
      expect(mockPrisma.upward_housing_adoption_decision.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'ACCEPTED' }),
        include: { userGoal: true },
      })
    })
  })

  describe('Goal Interest Concurrency & Optimistic Locking', () => {
    it('creates an interest expression with initial version = 1', async () => {
      const interestRecord = {
        id: 10,
        uuid: 'gi-10',
        userGoalId: 70,
        serviceType: 'HOME_CLEANING',
        status: 'SUBMITTED',
        version: 1,
        submittedAt: new Date(),
      }
      mockPrisma.upward_goal_interest.create.mockResolvedValueOnce(interestRecord)

      const result = await repository.createInterest({
        userGoalId: 70,
        serviceType: 'HOME_CLEANING',
        status: 'SUBMITTED',
      })

      expect(mockPrisma.upward_goal_interest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userGoalId: 70,
          serviceType: 'HOME_CLEANING',
          status: 'SUBMITTED',
          version: 1,
        }),
        include: {
          history: true,
        },
      })
      expect(result.version).toBe(1)
    })

    it('updates interest atomically with compare-and-swap and records history snapshot in same transaction', async () => {
      const current = {
        id: 10,
        version: 1,
        serviceType: 'HOME_CLEANING',
        status: 'SUBMITTED',
        notes: 'Initial note',
      }
      mockPrisma.upward_goal_interest.findUnique
        .mockResolvedValueOnce(current) // initial fetch for version check
        .mockResolvedValueOnce({
          ...current,
          version: 2,
          status: 'CONTACTED',
          history: [
            {
              id: 1,
              interestId: 10,
              version: 2,
              serviceType: 'HOME_CLEANING',
              status: 'CONTACTED',
            },
          ],
        }) // final fetch with history

      mockPrisma.upward_goal_interest.updateMany.mockResolvedValueOnce({ count: 1 })
      mockPrisma.upward_goal_interest_history.create.mockResolvedValueOnce({})

      const result = await repository.updateInterest(
        10,
        1, // expectedVersion
        { status: 'CONTACTED', notes: 'Vendor reached out' },
        'Admin follow-up note',
      )

      // 1. CAS update checked id and version
      expect(mockPrisma.upward_goal_interest.updateMany).toHaveBeenCalledWith({
        where: { id: 10, version: 1 },
        data: {
          status: 'CONTACTED',
          notes: 'Vendor reached out',
          adminNotes: 'Admin follow-up note',
          version: 2,
        },
      })

      // 2. History record was created with version 2
      expect(mockPrisma.upward_goal_interest_history.create).toHaveBeenCalledWith({
        data: {
          interestId: 10,
          version: 2,
          serviceType: 'HOME_CLEANING',
          status: 'CONTACTED',
          notes: 'Vendor reached out',
          adminNotes: 'Admin follow-up note',
        },
      })

      expect(result.version).toBe(2)
      expect(result.status).toBe('CONTACTED')
    })

    it('throws ConflictException and prevents history write when expectedVersion does not match persisted version', async () => {
      const current = {
        id: 10,
        version: 2, // already advanced to 2
        serviceType: 'HOME_CLEANING',
        status: 'CONTACTED',
      }
      mockPrisma.upward_goal_interest.findUnique.mockResolvedValueOnce(current)

      await expect(
        repository.updateInterest(
          10,
          1, // stale expectedVersion
          { status: 'FULFILLED' },
        ),
      ).rejects.toThrow(ConflictException)

      // Ensure no update and no history creation occurred
      expect(mockPrisma.upward_goal_interest.updateMany).not.toHaveBeenCalled()
      expect(mockPrisma.upward_goal_interest_history.create).not.toHaveBeenCalled()
    })

    it('throws ConflictException if CAS updateMany count is 0 (concurrent race)', async () => {
      const current = {
        id: 10,
        version: 1,
        serviceType: 'HOME_CLEANING',
        status: 'SUBMITTED',
      }
      mockPrisma.upward_goal_interest.findUnique.mockResolvedValueOnce(current)
      mockPrisma.upward_goal_interest.updateMany.mockResolvedValueOnce({ count: 0 }) // another tx won the race

      await expect(
        repository.updateInterest(10, 1, { status: 'CONTACTED' }),
      ).rejects.toThrow(ConflictException)

      // History must NOT be written if CAS update count was 0
      expect(mockPrisma.upward_goal_interest_history.create).not.toHaveBeenCalled()
    })
  })

  describe('User Goal Soft-Deletion & Retrieval', () => {
    it('soft-archives user goal on removeUserGoal without deleting row', async () => {
      mockPrisma.upward_user_goal.updateMany.mockResolvedValueOnce({ count: 1 })

      await repository.removeUserGoal(10, 5)

      expect(mockPrisma.upward_user_goal.deleteMany).not.toHaveBeenCalled()
      expect(mockPrisma.upward_user_goal.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 10,
          goalId: 5,
          status: { not: 'ARCHIVED' },
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: expect.any(Date),
        },
      })
    })

    it('findUserGoal filters out ARCHIVED goals by default', async () => {
      mockPrisma.upward_user_goal.findFirst.mockResolvedValueOnce(null)

      const result = await repository.findUserGoal(10, 5)

      expect(mockPrisma.upward_user_goal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 10,
            goalId: 5,
            status: { not: 'ARCHIVED' },
          },
        }),
      )
      expect(result).toBeNull()
    })
  })
})
