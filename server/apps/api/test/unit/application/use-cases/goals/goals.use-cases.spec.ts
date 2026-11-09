import { Test, TestingModule } from '@nestjs/testing'
import { GetGoalCategoriesUseCase } from '@application/goals/use-cases/get-goal-categories.use-case'
import { GetGoalsUseCase } from '@application/goals/use-cases/get-goals.use-case'
import { GetGoalDetailUseCase } from '@application/goals/use-cases/get-goal-detail.use-case'
import { GetUserGoalsUseCase } from '@application/goals/use-cases/get-user-goals.use-case'
import { SetUserGoalsUseCase } from '@application/goals/use-cases/set-user-goals.use-case'
import { UpdateUserGoalUseCase } from '@application/goals/use-cases/update-user-goal.use-case'
import { RemoveUserGoalUseCase } from '@application/goals/use-cases/remove-user-goal.use-case'
import { GetOfferingsUseCase } from '@application/goals/use-cases/get-offerings.use-case'
import { GetOfferingDetailUseCase } from '@application/goals/use-cases/get-offering-detail.use-case'
import { AdminManageCategoriesUseCase } from '@application/goals/use-cases/admin/admin-manage-categories.use-case'
import { AdminManageGoalsUseCase } from '@application/goals/use-cases/admin/admin-manage-goals.use-case'
import { AdminManageOfferingsUseCase } from '@application/goals/use-cases/admin/admin-manage-offerings.use-case'
import { AdminGetGoalsOverviewUseCase } from '@application/goals/use-cases/admin/admin-get-goals-overview.use-case'
import { GOAL_REPOSITORY, GoalRepository } from '@domains/goals/goal.repository'
import { OFFERING_REPOSITORY, OfferingRepository } from '@domains/goals/offering.repository'
import { VENDOR_REPOSITORY, VendorRepository } from '@domains/goals/vendor.repository'
import { NotFoundException, BadRequestException } from '@nestjs/common'

describe('Goals Domain Use Cases', () => {
  let mockGoalRepo: Partial<jest.Mocked<GoalRepository>>
  let mockOfferingRepo: Partial<jest.Mocked<OfferingRepository>>
  let mockVendorRepo: Partial<jest.Mocked<VendorRepository>>

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
      findUserGoal: jest.fn(),
      setUserGoals: jest.fn(),
      updateUserGoal: jest.fn(),
      removeUserGoal: jest.fn(),
      findCollections: jest.fn(),
      findCollectionByUuid: jest.fn(),
      createCollection: jest.fn(),
      updateCollection: jest.fn(),
      deleteCollection: jest.fn(),
      linkOfferingToGoal: jest.fn(),
      unlinkOfferingFromGoal: jest.fn(),
      getGoalsOverview: jest.fn(),
    }

    mockOfferingRepo = {
      findOfferings: jest.fn(),
      findOfferingById: jest.fn(),
      findOfferingByUuid: jest.fn(),
      createOffering: jest.fn(),
      updateOffering: jest.fn(),
      deleteOffering: jest.fn(),
      addMedia: jest.fn(),
      removeMedia: jest.fn(),
      setPackageItems: jest.fn(),
    }

    mockVendorRepo = {
      findVendors: jest.fn(),
      findVendorById: jest.fn(),
      findVendorByUuid: jest.fn(),
      findVendorBySlug: jest.fn(),
      createVendor: jest.fn(),
      updateVendor: jest.fn(),
      deleteVendor: jest.fn(),
    }
  })

  describe('GetGoalCategoriesUseCase', () => {
    it('returns published categories by default', async () => {
      const mockCategories = [
        {
          uuid: 'cat-1',
          slug: 'home-living',
          title: 'Home & Living',
          sortOrder: 0,
          status: 'PUBLISHED' as const,
          iconName: 'Home',
        },
      ]
      mockGoalRepo.findCategories!.mockResolvedValue(mockCategories)

      const useCase = new GetGoalCategoriesUseCase(mockGoalRepo as GoalRepository)
      const result = await useCase.execute()

      expect(result).toEqual(mockCategories)
      expect(mockGoalRepo.findCategories).toHaveBeenCalledWith({
        status: 'PUBLISHED',
        includeGoals: false,
      })
    })
  })

  describe('GetGoalsUseCase', () => {
    it('queries published goals with default pagination', async () => {
      const mockResult = {
        items: [
          {
            uuid: 'goal-1',
            categoryId: 1,
            slug: 'redecorate-space',
            title: 'Redecorate my space',
            sortOrder: 0,
            status: 'PUBLISHED' as const,
            isFeatured: true,
          },
        ],
        total: 1,
      }
      mockGoalRepo.findGoals!.mockResolvedValue(mockResult)

      const useCase = new GetGoalsUseCase(mockGoalRepo as GoalRepository)
      const result = await useCase.execute()

      expect(result).toEqual(mockResult)
      expect(mockGoalRepo.findGoals).toHaveBeenCalledWith({
        categoryId: undefined,
        categorySlug: undefined,
        status: 'PUBLISHED',
        isFeatured: undefined,
        search: undefined,
        skip: 0,
        take: 20,
      })
    })
  })

  describe('GetGoalDetailUseCase', () => {
    it('resolves goal by slug including details', async () => {
      const mockGoal = {
        uuid: 'goal-uuid-1',
        categoryId: 1,
        slug: 'upgrade-workspace',
        title: 'Upgrade my workspace',
        sortOrder: 0,
        status: 'PUBLISHED' as const,
        isFeatured: false,
      }
      mockGoalRepo.findGoalBySlug!.mockResolvedValue(mockGoal)

      const useCase = new GetGoalDetailUseCase(mockGoalRepo as GoalRepository)
      const result = await useCase.execute('upgrade-workspace')

      expect(result).toEqual(mockGoal)
      expect(mockGoalRepo.findGoalBySlug).toHaveBeenCalledWith('upgrade-workspace', {
        includeDetails: true,
      })
    })

    it('throws NotFoundException if goal does not exist', async () => {
      mockGoalRepo.findGoalBySlug!.mockResolvedValue(null)

      const useCase = new GetGoalDetailUseCase(mockGoalRepo as GoalRepository)
      await expect(useCase.execute('non-existent-goal')).rejects.toThrow(NotFoundException)
    })
  })

  describe('SetUserGoalsUseCase', () => {
    it('saves user goals successfully', async () => {
      const mockUserGoals = [
        { uuid: 'ug-1', userId: 10, goalId: 1, status: 'ACTIVE' as const, progressPct: 0 },
        { uuid: 'ug-2', userId: 10, goalId: 2, status: 'ACTIVE' as const, progressPct: 0 },
      ]
      mockGoalRepo.setUserGoals!.mockResolvedValue(mockUserGoals)

      const useCase = new SetUserGoalsUseCase(mockGoalRepo as GoalRepository)
      const result = await useCase.execute(10, [1, 2])

      expect(result).toEqual(mockUserGoals)
      expect(mockGoalRepo.setUserGoals).toHaveBeenCalledWith(10, [1, 2])
    })

    it('allows empty goalIds list to clear goals', async () => {
      mockGoalRepo.setUserGoals!.mockResolvedValue([])
      const useCase = new SetUserGoalsUseCase(mockGoalRepo as GoalRepository)
      const result = await useCase.execute(10, [])
      expect(result).toEqual([])
      expect(mockGoalRepo.setUserGoals).toHaveBeenCalledWith(10, [])
    })

    it('rejects non-array goalIds', async () => {
      const useCase = new SetUserGoalsUseCase(mockGoalRepo as GoalRepository)
      await expect(useCase.execute(10, 'invalid' as any)).rejects.toThrow(BadRequestException)
    })
  })

  describe('UpdateUserGoalUseCase', () => {
    it('updates user goal progress and completed status', async () => {
      const existingUserGoal = {
        id: 5,
        uuid: 'ug-5',
        userId: 10,
        goalId: 1,
        status: 'ACTIVE' as const,
        progressPct: 20,
      }
      mockGoalRepo.findUserGoal!.mockResolvedValue(existingUserGoal)
      mockGoalRepo.updateUserGoal!.mockResolvedValue({
        ...existingUserGoal,
        progressPct: 100,
        status: 'COMPLETED' as const,
      })

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo as GoalRepository)
      const result = await useCase.execute(10, 1, { progressPct: 100, status: 'COMPLETED' })

      expect(result.progressPct).toBe(100)
      expect(result.status).toBe('COMPLETED')
      expect(mockGoalRepo.updateUserGoal).toHaveBeenCalledWith(5, {
        progressPct: 100,
        status: 'COMPLETED',
      })
    })

    it('throws NotFoundException if user goal does not exist', async () => {
      mockGoalRepo.findUserGoal!.mockResolvedValue(null)

      const useCase = new UpdateUserGoalUseCase(mockGoalRepo as GoalRepository)
      await expect(useCase.execute(10, 999, { progressPct: 50 })).rejects.toThrow(NotFoundException)
    })
  })

  describe('RemoveUserGoalUseCase', () => {
    it('removes existing user goal', async () => {
      const existingUserGoal = {
        id: 5,
        uuid: 'ug-5',
        userId: 10,
        goalId: 1,
        status: 'ACTIVE' as const,
        progressPct: 20,
      }
      mockGoalRepo.findUserGoal!.mockResolvedValue(existingUserGoal)
      mockGoalRepo.removeUserGoal!.mockResolvedValue(undefined)

      const useCase = new RemoveUserGoalUseCase(mockGoalRepo as GoalRepository)
      await useCase.execute(10, 1)

      expect(mockGoalRepo.removeUserGoal).toHaveBeenCalledWith(10, 1)
    })

    it('throws NotFoundException if user goal does not exist to remove', async () => {
      mockGoalRepo.findUserGoal!.mockResolvedValue(null)

      const useCase = new RemoveUserGoalUseCase(mockGoalRepo as GoalRepository)
      await expect(useCase.execute(10, 999)).rejects.toThrow(NotFoundException)
    })
  })

  describe('GetOfferingsUseCase', () => {
    it('queries published offerings', async () => {
      const mockResult = {
        items: [
          {
            uuid: 'offering-1',
            type: 'PRODUCT' as const,
            pricingModel: 'FIXED' as const,
            title: 'Ergonomic Chair',
            currency: 'NGN',
            price: 150000,
            inStock: true,
            deliveryAvailable: true,
            status: 'PUBLISHED' as const,
            isFeatured: true,
          },
        ],
        total: 1,
      }
      mockOfferingRepo.findOfferings!.mockResolvedValue(mockResult)

      const useCase = new GetOfferingsUseCase(mockOfferingRepo as OfferingRepository)
      const result = await useCase.execute()

      expect(result).toEqual(mockResult)
      expect(mockOfferingRepo.findOfferings).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PUBLISHED', skip: 0, take: 20 }),
      )
    })
  })

  describe('AdminGetGoalsOverviewUseCase', () => {
    it('returns aggregated analytics overview', async () => {
      const mockOverview = {
        totalCategories: 4,
        totalGoals: 18,
        totalActiveUserGoals: 420,
        topGoals: [
          { goalId: 1, title: 'Upgrade my workspace', count: 120 },
          { goalId: 2, title: 'Redecorate my space', count: 95 },
        ],
      }
      mockGoalRepo.getGoalsOverview!.mockResolvedValue(mockOverview)

      const useCase = new AdminGetGoalsOverviewUseCase(mockGoalRepo as GoalRepository)
      const result = await useCase.execute()

      expect(result).toEqual(mockOverview)
      expect(mockGoalRepo.getGoalsOverview).toHaveBeenCalled()
    })
  })
})
