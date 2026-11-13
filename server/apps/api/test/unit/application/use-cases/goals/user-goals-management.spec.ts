import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AdoptCatalogueGoalUseCase } from '@application/goals/use-cases/adopt-catalogue-goal.use-case'
import { CreateCustomGoalUseCase } from '@application/goals/use-cases/create-custom-goal.use-case'
import { GetUserGoalsUseCase } from '@application/goals/use-cases/get-user-goals.use-case'
import { GetUserGoalDetailUseCase } from '@application/goals/use-cases/get-user-goal-detail.use-case'
import { UpdateUserGoalUseCase } from '@application/goals/use-cases/update-user-goal.use-case'
import { ChangeGoalStatusUseCase } from '@application/goals/use-cases/change-goal-status.use-case'
import { CreateGoalMilestoneUseCase } from '@application/goals/use-cases/milestones/create-goal-milestone.use-case'
import { GetGoalMilestonesUseCase } from '@application/goals/use-cases/milestones/get-goal-milestones.use-case'
import { UpdateGoalMilestoneUseCase } from '@application/goals/use-cases/milestones/update-goal-milestone.use-case'
import { ToggleGoalMilestoneStatusUseCase } from '@application/goals/use-cases/milestones/toggle-goal-milestone-status.use-case'
import { DeleteGoalMilestoneUseCase } from '@application/goals/use-cases/milestones/delete-goal-milestone.use-case'
import { GoalRepository, UserGoal, GoalMilestone } from '@domains/goals/goal.repository'
import { UserRepository } from '@domains/users/user.repository'
import { serializeUserGoal, serializeGoalMilestone } from '@application/goals/dto/user-goal.dto'

describe('Stage 3B: User Goals Management Use Cases', () => {
  let mockGoalRepo: jest.Mocked<GoalRepository>
  let mockUserRepo: jest.Mocked<UserRepository>

  const userId = 42
  const userUuid = 'user-uuid-42'

  beforeEach(() => {
    mockGoalRepo = {
      findCategories: jest.fn(),
      findCategoryBySlug: jest.fn(),
      findCategoryByUuid: jest.fn(),
      createCategory: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      findGoals: jest.fn(),
      findGoalBySlug: jest.fn(),
      findGoalByUuid: jest.fn(),
      findGoalById: jest.fn(),
      createGoal: jest.fn(),
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
      findUserGoals: jest.fn(),
      findUserGoalsPaged: jest.fn(),
      findUserGoal: jest.fn(),
      findUserGoalById: jest.fn(),
      findUserGoalByUuid: jest.fn(),
      createUserGoal: jest.fn(),
      setUserGoals: jest.fn(),
      updateUserGoal: jest.fn(),
      removeUserGoal: jest.fn(),
      archiveUserGoal: jest.fn(),
      findMilestones: jest.fn(),
      findMilestoneById: jest.fn(),
      findMilestoneByUuid: jest.fn(),
      createMilestone: jest.fn(),
      updateMilestone: jest.fn(),
      deleteMilestone: jest.fn(),
      findHousingAdoptionDecisions: jest.fn(),
      findHousingAdoptionDecisionById: jest.fn(),
      createHousingAdoptionDecision: jest.fn(),
      updateHousingAdoptionDecision: jest.fn(),
      findInterests: jest.fn(),
      findInterestById: jest.fn(),
      createInterest: jest.fn(),
      updateInterest: jest.fn(),
      findInterestHistory: jest.fn(),
      findCollections: jest.fn(),
      findCollectionByUuid: jest.fn(),
      createCollection: jest.fn(),
      updateCollection: jest.fn(),
      deleteCollection: jest.fn(),
      linkOfferingToGoal: jest.fn(),
      unlinkOfferingFromGoal: jest.fn(),
      getGoalsOverview: jest.fn(),
    } as any

    mockUserRepo = {
      findByUuid: jest.fn().mockResolvedValue({ id: userId, uuid: userUuid } as any),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any
  })

  describe('AdoptCatalogueGoalUseCase', () => {
    it('adopts published catalogue goal, creating historical title snapshot', async () => {
      const catalogueGoal = {
        id: 10,
        uuid: 'cat-goal-10',
        categoryId: 3,
        slug: 'furnish-home',
        title: 'Furnish My Apartment',
        sortOrder: 0,
        status: 'PUBLISHED' as const,
        isFeatured: false,
      }
      mockGoalRepo.findGoalById.mockResolvedValue(catalogueGoal)
      mockGoalRepo.findUserGoal.mockResolvedValue(null)
      mockGoalRepo.createUserGoal.mockImplementation(async (data: Partial<UserGoal>) => ({
        id: 101,
        uuid: 'ug-101',
        ...data,
      } as UserGoal))

      const useCase = new AdoptCatalogueGoalUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, {
        goalId: 10,
        notes: 'First goal',
        targetAmountMinor: '50000000',
      })

      expect(result.id).toBe(101)
      expect(mockGoalRepo.createUserGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          goalId: 10,
          categoryId: 3,
          historicalTitle: 'Furnish My Apartment',
          customTitle: null,
          customDescription: null,
          status: 'ACTIVE',
          progressPct: 0,
          targetAmountMinor: 50000000n,
        }),
      )
    })

    it('rejects adoption if catalogue goal does not exist or is not published', async () => {
      mockGoalRepo.findGoalById.mockResolvedValue({
        id: 11,
        uuid: 'cg-11',
        categoryId: 1,
        slug: 'draft-goal',
        title: 'Draft',
        sortOrder: 0,
        status: 'DRAFT' as const,
        isFeatured: false,
      })

      const useCase = new AdoptCatalogueGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(useCase.execute(userId, { goalId: 11 })).rejects.toThrow(NotFoundException)
    })

    it('rejects duplicate active adoption', async () => {
      mockGoalRepo.findGoalById.mockResolvedValue({
        id: 10,
        uuid: 'cg-10',
        categoryId: 3,
        slug: 'furnish-home',
        title: 'Furnish',
        sortOrder: 0,
        status: 'PUBLISHED' as const,
        isFeatured: false,
      })
      mockGoalRepo.findUserGoal.mockResolvedValue({
        id: 99,
        uuid: 'ug-99',
        userId,
        goalId: 10,
        categoryId: 3,
        historicalTitle: 'Furnish',
        status: 'ACTIVE' as const,
        progressPct: 15,
      })

      const useCase = new AdoptCatalogueGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(useCase.execute(userId, { goalId: 10 })).rejects.toThrow(BadRequestException)
    })

    it('reactivates previously archived goal, preserving milestones and progress', async () => {
      mockGoalRepo.findGoalById.mockResolvedValue({
        id: 10,
        uuid: 'cg-10',
        categoryId: 3,
        slug: 'furnish-home',
        title: 'Furnish',
        sortOrder: 0,
        status: 'PUBLISHED' as const,
        isFeatured: false,
      })
      mockGoalRepo.findUserGoal.mockResolvedValue({
        id: 99,
        uuid: 'ug-99',
        userId,
        goalId: 10,
        categoryId: 3,
        historicalTitle: 'Furnish',
        status: 'ARCHIVED' as const,
        progressPct: 60,
        targetAmountMinor: 10000000n,
      })
      mockGoalRepo.updateUserGoal.mockResolvedValue({
        id: 99,
        uuid: 'ug-99',
        userId,
        goalId: 10,
        categoryId: 3,
        historicalTitle: 'Furnish',
        status: 'ACTIVE' as const,
        progressPct: 60,
        targetAmountMinor: 10000000n,
        archivedAt: null,
      })

      const useCase = new AdoptCatalogueGoalUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, { goalId: 10, notes: 'Re-activated' })

      expect(result.status).toBe('ACTIVE')
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(99, expect.objectContaining({
        status: 'ACTIVE',
        archivedAt: null,
        notes: 'Re-activated',
      }))
    })
  })

  describe('CreateCustomGoalUseCase', () => {
    it('creates custom goal with matching customTitle and historicalTitle snapshot', async () => {
      mockGoalRepo.findCategories.mockResolvedValue([
        { id: 2, uuid: 'cat-2', slug: 'wellness', title: 'Wellness', iconName: 'Heart', sortOrder: 0, status: 'PUBLISHED' },
      ])
      mockGoalRepo.createUserGoal.mockImplementation(async (data: Partial<UserGoal>) => ({
        id: 201,
        uuid: 'ug-201',
        ...data,
      } as UserGoal))

      const useCase = new CreateCustomGoalUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, {
        customTitle: '  Run a Marathon  ',
        categoryId: 2,
        customDescription: 'Train 5 days a week',
        targetAmountMinor: '1500000',
      })

      expect(result.id).toBe(201)
      expect(mockGoalRepo.createUserGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          goalId: null,
          categoryId: 2,
          historicalTitle: 'Run a Marathon',
          customTitle: 'Run a Marathon',
          customDescription: 'Train 5 days a week',
          status: 'ACTIVE',
          progressPct: 0,
          targetAmountMinor: 1500000n,
        }),
      )
    })

    it('rejects creation if customTitle is empty or whitespace', async () => {
      const useCase = new CreateCustomGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(
        useCase.execute(userId, { customTitle: '   ', categoryId: 2 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('rejects creation if category does not exist or is unpublished', async () => {
      mockGoalRepo.findCategories.mockResolvedValue([])
      const useCase = new CreateCustomGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(
        useCase.execute(userId, { customTitle: 'Custom Ambition', categoryId: 999 }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('GetUserGoalsUseCase', () => {
    it('supports modern pagination and filtering', async () => {
      const pagedResult = {
        items: [
          { id: 1, uuid: 'ug-1', userId, categoryId: 1, historicalTitle: 'Goal 1', status: 'ACTIVE' as const, progressPct: 20 },
        ],
        total: 1,
      }
      mockGoalRepo.findUserGoalsPaged.mockResolvedValue(pagedResult)

      const useCase = new GetUserGoalsUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, {
        status: 'ACTIVE',
        skip: 0,
        take: 10,
      })

      expect(result).toEqual(pagedResult)
      expect(mockGoalRepo.findUserGoalsPaged).toHaveBeenCalledWith(userId, {
        status: 'ACTIVE',
        includeArchived: undefined,
        categoryId: undefined,
        categorySlug: undefined,
        skip: 0,
        take: 10,
      })
    })

    it('supports legacy signature for unpaged queries', async () => {
      const goals = [
        { id: 1, uuid: 'ug-1', userId, categoryId: 1, historicalTitle: 'Goal 1', status: 'ACTIVE' as const, progressPct: 0 },
      ]
      mockGoalRepo.findUserGoals.mockResolvedValue(goals)

      const useCase = new GetUserGoalsUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 'ACTIVE')

      expect(result).toEqual(goals)
      expect(mockGoalRepo.findUserGoals).toHaveBeenCalledWith(userId, 'ACTIVE')
    })
  })

  describe('GetUserGoalDetailUseCase', () => {
    it('returns goal detail with milestones for authorized user', async () => {
      const userGoal = {
        id: 50,
        uuid: 'ug-50',
        userId,
        categoryId: 1,
        historicalTitle: 'Save for Rent',
        status: 'ACTIVE' as const,
        progressPct: 50,
        milestones: [
          { id: 1, uuid: 'm-1', userGoalId: 50, title: 'First 50k', status: 'COMPLETED' as const, sortOrder: 0 },
        ],
      }
      mockGoalRepo.findUserGoalById.mockResolvedValue(userGoal)

      const useCase = new GetUserGoalDetailUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 50)

      expect(result).toEqual(userGoal)
    })

    it('rejects access if goal belongs to another user', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 50,
        uuid: 'ug-50',
        userId: 9999, // Another user!
        categoryId: 1,
        historicalTitle: 'Secret Goal',
        status: 'ACTIVE' as const,
        progressPct: 10,
      })

      const useCase = new GetUserGoalDetailUseCase(mockGoalRepo, mockUserRepo)
      await expect(useCase.execute(userId, 50)).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException if goal does not exist', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(null)
      mockGoalRepo.findUserGoalByUuid.mockResolvedValue(null)

      const useCase = new GetUserGoalDetailUseCase(mockGoalRepo, mockUserRepo)
      await expect(useCase.execute(userId, 999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('UpdateUserGoalUseCase', () => {
    it('rejects attempts to mutate historicalTitle', async () => {
      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(
        useCase.execute(userId, 10, { historicalTitle: 'Attempt to tamper' } as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('rejects attempts to mutate categoryId', async () => {
      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(
        useCase.execute(userId, 10, { categoryId: 99 } as any),
      ).rejects.toThrow(BadRequestException)
    })

    it('rejects updating another user goal', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 10,
        uuid: 'ug-10',
        userId: 9999, // Another user
        categoryId: 1,
        historicalTitle: 'Goal',
        status: 'ACTIVE' as const,
        progressPct: 0,
      })
      mockGoalRepo.findUserGoal.mockResolvedValue(null)

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(
        useCase.execute(userId, 10, { customTitle: 'New Title' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('updates allowed editable fields and recalculates TARGET_AMOUNT progress', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 10,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Savings Goal',
        customTitle: 'My Savings',
        status: 'ACTIVE' as const,
        progressSource: 'TARGET_AMOUNT',
        progressPct: 0,
        currentAmountMinor: 0n,
        targetAmountMinor: 1000000n,
      })
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({
        id,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Savings Goal',
        ...data,
      } as UserGoal))

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 10, {
        currentAmountMinor: '400000',
        customTitle: 'Updated Savings Goal',
      })

      expect(result.customTitle).toBe('Updated Savings Goal')
      expect(result.progressPct).toBe(40) // 400,000 / 1,000,000 = 40%
    })

    it('rejects currentAmountMinor exceeding targetAmountMinor for TARGET_AMOUNT goals', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 10,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Savings Goal',
        status: 'ACTIVE',
        progressSource: 'TARGET_AMOUNT',
        progressPct: 0,
        targetAmountMinor: 1000000n,
      })

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(
        useCase.execute(userId, 10, { currentAmountMinor: '1500000' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('rejects negative or malformed monetary minor unit updates', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 10,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Savings Goal',
        status: 'ACTIVE',
        progressSource: 'TARGET_AMOUNT',
        progressPct: 0,
        targetAmountMinor: 1000000n,
      })

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(
        useCase.execute(userId, 10, { currentAmountMinor: '-500' }),
      ).rejects.toThrow(BadRequestException)

      await expect(
        useCase.execute(userId, 10, { currentAmountMinor: '100.50' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('rejects manual progressPct or balance updates for RENT_VAULT goals', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 10,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Rent Goal',
        status: 'ACTIVE',
        progressSource: 'RENT_VAULT',
        progressPct: 0,
      })

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      await expect(
        useCase.execute(userId, 10, { progressPct: 80 }),
      ).rejects.toThrow(BadRequestException)

      await expect(
        useCase.execute(userId, 10, { currentAmountMinor: '500000' }),
      ).rejects.toThrow(BadRequestException)
    })

    it('calculates RENT_VAULT progress strictly from verified principal (ignoring accrued yield)', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 10,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Rent Goal',
        status: 'ACTIVE',
        progressSource: 'RENT_VAULT',
        progressPct: 0,
        rentVaultId: 7,
        rentVault: {
          id: 7,
          uuid: 'rv-7',
          userId, // Owned by user
          targetAmountKobo: 100000000n,
          currentPrincipalKobo: 30000000n, // 30% of target
          accruedYieldKobo: 5000000n, // Must NOT be added to principal
        },
      })
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({
        id,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Rent Goal',
        ...data,
      } as UserGoal))

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 10, { notes: 'Checking progress' })

      expect(result.progressPct).toBe(30)
      expect(result.lastVerifiedBalanceMinor).toBe(30000000n)
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          progressPct: 30,
          lastVerifiedBalanceMinor: 30000000n,
          verifiedSourceUuid: 'rv-7',
        }),
      )
    })

    it('safely handles unowned or invalid vault linkage by maintaining 0% progress', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 10,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Rent Goal',
        status: 'ACTIVE',
        progressSource: 'RENT_VAULT',
        progressPct: 0,
        rentVaultId: 99,
        rentVault: {
          id: 99,
          uuid: 'rv-99',
          userId: 9999, // Unowned!
          targetAmountKobo: 100000000n,
          currentPrincipalKobo: 50000000n,
          accruedYieldKobo: 0n,
        },
      })
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({
        id,
        uuid: 'ug-10',
        userId,
        categoryId: 1,
        historicalTitle: 'Rent Goal',
        ...data,
      } as UserGoal))

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 10, { notes: 'Safe check' })

      expect(result.progressPct).toBe(0)
    })
  })

  describe('ChangeGoalStatusUseCase (Lifecycle Transitions)', () => {
    const existingActive: UserGoal = {
      id: 1,
      uuid: 'ug-1',
      userId,
      categoryId: 1,
      historicalTitle: 'Active Goal',
      status: 'ACTIVE',
      progressPct: 30,
    }

    it('pauses an active goal and sets pausedAt', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(existingActive)
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({ ...existingActive, ...data } as UserGoal))

      const useCase = new ChangeGoalStatusUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 1, 'PAUSED')

      expect(result.status).toBe('PAUSED')
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'PAUSED', pausedAt: expect.any(Date) }),
      )
    })

    it('completes an active goal and sets completedAt without fabricating progress', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(existingActive)
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({ ...existingActive, ...data } as UserGoal))

      const useCase = new ChangeGoalStatusUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 1, 'COMPLETED')

      expect(result.status).toBe('COMPLETED')
      expect(result.progressPct).toBe(30) // Progress preserved, not artificially altered
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'COMPLETED', completedAt: expect.any(Date) }),
      )
    })

    it('archives an active goal non-destructively and sets archivedAt', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(existingActive)
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({ ...existingActive, ...data } as UserGoal))

      const useCase = new ChangeGoalStatusUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 1, 'ARCHIVED')

      expect(result.status).toBe('ARCHIVED')
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'ARCHIVED', archivedAt: expect.any(Date) }),
      )
    })

    it('resumes a paused goal and clears pausedAt', async () => {
      const existingPaused: UserGoal = {
        id: 1,
        uuid: 'ug-1',
        userId,
        categoryId: 1,
        historicalTitle: 'Paused Goal',
        status: 'PAUSED',
        progressPct: 30,
        pausedAt: new Date(),
      }
      mockGoalRepo.findUserGoalById.mockResolvedValue(existingPaused)
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({ ...existingPaused, ...data } as UserGoal))

      const useCase = new ChangeGoalStatusUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 1, 'ACTIVE')

      expect(result.status).toBe('ACTIVE')
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'ACTIVE', pausedAt: null }),
      )
    })

    it('reactivates an archived goal and clears archivedAt', async () => {
      const existingArchived: UserGoal = {
        id: 1,
        uuid: 'ug-1',
        userId,
        categoryId: 1,
        historicalTitle: 'Archived Goal',
        status: 'ARCHIVED',
        progressPct: 30,
        archivedAt: new Date(),
      }
      mockGoalRepo.findUserGoalById.mockResolvedValue(existingArchived)
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({ ...existingArchived, ...data } as UserGoal))

      const useCase = new ChangeGoalStatusUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 1, 'ACTIVE')

      expect(result.status).toBe('ACTIVE')
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'ACTIVE', archivedAt: null }),
      )
    })

    it('reopens a completed goal and clears completedAt', async () => {
      const existingCompleted: UserGoal = {
        id: 1,
        uuid: 'ug-1',
        userId,
        categoryId: 1,
        historicalTitle: 'Completed Goal',
        status: 'COMPLETED',
        progressPct: 100,
        completedAt: new Date(),
      }
      mockGoalRepo.findUserGoalById.mockResolvedValue(existingCompleted)
      mockGoalRepo.updateUserGoal.mockImplementation(async (id: number, data: Partial<UserGoal>) => ({ ...existingCompleted, ...data } as UserGoal))

      const useCase = new ChangeGoalStatusUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 1, 'ACTIVE')

      expect(result.status).toBe('ACTIVE')
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: 'ACTIVE', completedAt: null }),
      )
    })

    it('rejects invalid state transitions (e.g. self-transition or archived to paused)', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(existingActive)
      const useCase = new ChangeGoalStatusUseCase(mockGoalRepo, mockUserRepo)

      // Self transition
      await expect(useCase.execute(userId, 1, 'ACTIVE')).rejects.toThrow(BadRequestException)

      // Archived to paused directly
      const archivedGoal: UserGoal = { ...existingActive, status: 'ARCHIVED' }
      mockGoalRepo.findUserGoalById.mockResolvedValue(archivedGoal)
      await expect(useCase.execute(userId, 1, 'PAUSED')).rejects.toThrow(BadRequestException)
    })
  })

  describe('Milestone Management Use Cases', () => {
    const parentGoal: UserGoal = {
      id: 10,
      uuid: 'ug-10',
      userId,
      categoryId: 1,
      historicalTitle: 'Marathon',
      status: 'ACTIVE',
      progressSource: 'MILESTONES',
      progressPct: 0,
    }

    it('CreateGoalMilestoneUseCase enforces ownership and updates parent progressPct', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(parentGoal)
      mockGoalRepo.findMilestones.mockResolvedValue([])
      mockGoalRepo.createMilestone.mockResolvedValue({
        id: 1,
        uuid: 'm-1',
        userGoalId: 10,
        title: 'Run 5k',
        status: 'PENDING',
        sortOrder: 0,
      })

      const useCase = new CreateGoalMilestoneUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 10, { title: 'Run 5k' })

      expect(result.id).toBe(1)
      expect(mockGoalRepo.createMilestone).toHaveBeenCalledWith(
        expect.objectContaining({
          userGoalId: 10,
          title: 'Run 5k',
          status: 'PENDING',
          sortOrder: 0,
        }),
      )
      // Progress remains 0% since 0 of 1 milestone is completed
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(10, { progressPct: 0 })
    })

    it('CreateGoalMilestoneUseCase rejects empty milestone title', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(parentGoal)
      const useCase = new CreateGoalMilestoneUseCase(mockGoalRepo, mockUserRepo)
      await expect(useCase.execute(userId, 10, { title: '   ' })).rejects.toThrow(BadRequestException)
    })

    it('ToggleGoalMilestoneStatusUseCase toggles completion and recalculates parent progress', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(parentGoal)
      mockGoalRepo.findMilestoneById.mockResolvedValue({
        id: 1,
        uuid: 'm-1',
        userGoalId: 10,
        title: 'Run 5k',
        status: 'PENDING',
        sortOrder: 0,
      })
      mockGoalRepo.updateMilestone.mockResolvedValue({
        id: 1,
        uuid: 'm-1',
        userGoalId: 10,
        title: 'Run 5k',
        status: 'COMPLETED',
        sortOrder: 0,
        completedAt: new Date(),
      })
      mockGoalRepo.findMilestones.mockResolvedValue([
        { id: 1, uuid: 'm-1', userGoalId: 10, title: 'Run 5k', status: 'COMPLETED', sortOrder: 0 },
        { id: 2, uuid: 'm-2', userGoalId: 10, title: 'Run 10k', status: 'PENDING', sortOrder: 1 },
      ])

      const useCase = new ToggleGoalMilestoneStatusUseCase(mockGoalRepo, mockUserRepo)
      const result = await useCase.execute(userId, 10, 1)

      expect(result.status).toBe('COMPLETED')
      // 1 of 2 milestones completed -> 50%
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(10, { progressPct: 50 })
    })

    it('DeleteGoalMilestoneUseCase deletes milestone and recalculates parent progress', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue(parentGoal)
      mockGoalRepo.findMilestoneById.mockResolvedValue({
        id: 2,
        uuid: 'm-2',
        userGoalId: 10,
        title: 'Run 10k',
        status: 'PENDING',
        sortOrder: 1,
      })
      mockGoalRepo.deleteMilestone.mockResolvedValue(undefined)
      // Remaining milestones: 1 milestone, completed
      mockGoalRepo.findMilestones.mockResolvedValue([
        { id: 1, uuid: 'm-1', userGoalId: 10, title: 'Run 5k', status: 'COMPLETED', sortOrder: 0 },
      ])

      const useCase = new DeleteGoalMilestoneUseCase(mockGoalRepo, mockUserRepo)
      await useCase.execute(userId, 10, 2)

      expect(mockGoalRepo.deleteMilestone).toHaveBeenCalledWith(2)
      // 1 of 1 milestone completed -> 100%
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(10, { progressPct: 100 })
    })

    it('rejects milestone operation when parent goal belongs to another user', async () => {
      mockGoalRepo.findUserGoalById.mockResolvedValue({
        id: 10,
        uuid: 'ug-10',
        userId: 9999, // Another user
        categoryId: 1,
        historicalTitle: 'Secret Goal',
        status: 'ACTIVE',
        progressPct: 0,
      })

      const useCase = new CreateGoalMilestoneUseCase(mockGoalRepo, mockUserRepo)
      await expect(useCase.execute(userId, 10, { title: 'Tamper' })).rejects.toThrow(NotFoundException)
    })

    it('rejects milestone creation, update, toggle, or deletion when parent goal is ARCHIVED', async () => {
      const archivedGoal: UserGoal = {
        ...parentGoal,
        status: 'ARCHIVED',
      }
      mockGoalRepo.findUserGoalById.mockResolvedValue(archivedGoal)

      const createUseCase = new CreateGoalMilestoneUseCase(mockGoalRepo, mockUserRepo)
      await expect(createUseCase.execute(userId, 10, { title: 'New' })).rejects.toThrow(BadRequestException)

      const updateUseCase = new UpdateGoalMilestoneUseCase(mockGoalRepo, mockUserRepo)
      await expect(updateUseCase.execute(userId, 10, 1, { title: 'Update' })).rejects.toThrow(BadRequestException)

      const toggleUseCase = new ToggleGoalMilestoneStatusUseCase(mockGoalRepo, mockUserRepo)
      await expect(toggleUseCase.execute(userId, 10, 1)).rejects.toThrow(BadRequestException)

      const deleteUseCase = new DeleteGoalMilestoneUseCase(mockGoalRepo, mockUserRepo)
      await expect(deleteUseCase.execute(userId, 10, 1)).rejects.toThrow(BadRequestException)
    })
  })

  describe('Response Serialization (BigInt Safety)', () => {
    it('serializeUserGoal safely converts BigInt monetary fields to string', () => {
      const ug: UserGoal = {
        id: 1,
        uuid: 'ug-1',
        userId: 10,
        categoryId: 2,
        historicalTitle: 'Furnish',
        status: 'ACTIVE',
        progressPct: 50,
        currentAmountMinor: 5000000n,
        targetAmountMinor: 10000000n,
        lastVerifiedBalanceMinor: 2500000n,
        currency: 'NGN',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      }

      const serialized = serializeUserGoal(ug)

      expect(serialized.currentAmountMinor).toBe('5000000')
      expect(serialized.targetAmountMinor).toBe('10000000')
      expect(serialized.lastVerifiedBalanceMinor).toBe('2500000')

      // Must be safely JSON serializable without throwing TypeError
      expect(() => JSON.stringify(serialized)).not.toThrow()
    })

    it('serializeGoalMilestone formats milestone cleanly', () => {
      const m: GoalMilestone = {
        id: 1,
        uuid: 'm-1',
        userGoalId: 10,
        title: 'Step 1',
        status: 'COMPLETED',
        sortOrder: 0,
        targetDate: new Date('2026-06-01'),
        completedAt: new Date('2026-05-15'),
      }

      const serialized = serializeGoalMilestone(m)

      expect(serialized.title).toBe('Step 1')
      expect(serialized.status).toBe('COMPLETED')
      expect(() => JSON.stringify(serialized)).not.toThrow()
    })
  })
})
