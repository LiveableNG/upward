import { UnauthorizedException, BadRequestException } from '@nestjs/common'
import { UserGoalsController } from '../../../src/interfaces/http/user/user-goals.controller'
import { GetUserGoalsUseCase } from '../../../src/application/goals/use-cases/get-user-goals.use-case'
import { GetUserGoalDetailUseCase } from '../../../src/application/goals/use-cases/get-user-goal-detail.use-case'
import { AdoptCatalogueGoalUseCase } from '../../../src/application/goals/use-cases/adopt-catalogue-goal.use-case'
import { CreateCustomGoalUseCase } from '../../../src/application/goals/use-cases/create-custom-goal.use-case'
import { SetUserGoalsUseCase } from '../../../src/application/goals/use-cases/set-user-goals.use-case'
import { UpdateUserGoalUseCase } from '../../../src/application/goals/use-cases/update-user-goal.use-case'
import { ChangeGoalStatusUseCase } from '../../../src/application/goals/use-cases/change-goal-status.use-case'
import { RemoveUserGoalUseCase } from '../../../src/application/goals/use-cases/remove-user-goal.use-case'
import { CreateGoalMilestoneUseCase } from '../../../src/application/goals/use-cases/milestones/create-goal-milestone.use-case'
import { GetGoalMilestonesUseCase } from '../../../src/application/goals/use-cases/milestones/get-goal-milestones.use-case'
import { UpdateGoalMilestoneUseCase } from '../../../src/application/goals/use-cases/milestones/update-goal-milestone.use-case'
import { ToggleGoalMilestoneStatusUseCase } from '../../../src/application/goals/use-cases/milestones/toggle-goal-milestone-status.use-case'
import { DeleteGoalMilestoneUseCase } from '../../../src/application/goals/use-cases/milestones/delete-goal-milestone.use-case'
import { EventBus } from '../../../src/application/events/domain-event'
import { UserGoalsUpdatedEvent } from '../../../src/application/events/definition/user-goals-updated.event'
import { UserGoal } from '../../../src/domains/goals/goal.repository'

describe('UserGoalsController', () => {
  let controller: UserGoalsController
  let mockGetUserGoals: jest.Mocked<GetUserGoalsUseCase>
  let mockGetUserGoalDetail: jest.Mocked<GetUserGoalDetailUseCase>
  let mockAdoptCatalogueGoal: jest.Mocked<AdoptCatalogueGoalUseCase>
  let mockCreateCustomGoal: jest.Mocked<CreateCustomGoalUseCase>
  let mockSetUserGoals: jest.Mocked<SetUserGoalsUseCase>
  let mockUpdateUserGoal: jest.Mocked<UpdateUserGoalUseCase>
  let mockChangeGoalStatus: jest.Mocked<ChangeGoalStatusUseCase>
  let mockRemoveUserGoal: jest.Mocked<RemoveUserGoalUseCase>
  let mockCreateMilestone: jest.Mocked<CreateGoalMilestoneUseCase>
  let mockGetMilestones: jest.Mocked<GetGoalMilestonesUseCase>
  let mockUpdateMilestone: jest.Mocked<UpdateGoalMilestoneUseCase>
  let mockToggleMilestone: jest.Mocked<ToggleGoalMilestoneStatusUseCase>
  let mockDeleteMilestone: jest.Mocked<DeleteGoalMilestoneUseCase>
  let mockEventBus: jest.Mocked<EventBus>

  const reqWithUser = { user: { id: 'usr-uuid-1', uuid: 'usr-uuid-1' } }
  const reqUnauth = { user: null }

  beforeEach(() => {
    mockGetUserGoals = { execute: jest.fn() } as any
    mockGetUserGoalDetail = { execute: jest.fn() } as any
    mockAdoptCatalogueGoal = { execute: jest.fn() } as any
    mockCreateCustomGoal = { execute: jest.fn() } as any
    mockSetUserGoals = { execute: jest.fn() } as any
    mockUpdateUserGoal = { execute: jest.fn() } as any
    mockChangeGoalStatus = { execute: jest.fn() } as any
    mockRemoveUserGoal = { execute: jest.fn() } as any
    mockCreateMilestone = { execute: jest.fn() } as any
    mockGetMilestones = { execute: jest.fn() } as any
    mockUpdateMilestone = { execute: jest.fn() } as any
    mockToggleMilestone = { execute: jest.fn() } as any
    mockDeleteMilestone = { execute: jest.fn() } as any
    mockEventBus = { publish: jest.fn() } as any

    controller = new UserGoalsController(
      mockGetUserGoals,
      mockGetUserGoalDetail,
      mockAdoptCatalogueGoal,
      mockCreateCustomGoal,
      mockSetUserGoals,
      mockUpdateUserGoal,
      mockChangeGoalStatus,
      mockRemoveUserGoal,
      mockCreateMilestone,
      mockGetMilestones,
      mockUpdateMilestone,
      mockToggleMilestone,
      mockDeleteMilestone,
      mockEventBus,
    )
  })

  describe('Authentication extraction', () => {
    it('throws UnauthorizedException when user context is missing', async () => {
      await expect(controller.getUserGoals(reqUnauth, {})).rejects.toThrow(UnauthorizedException)
      await expect(controller.getUserGoalDetail(reqUnauth, '1')).rejects.toThrow(UnauthorizedException)
      await expect(controller.createGoal(reqUnauth, { goalId: 1 })).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('Goal endpoints', () => {
    it('getUserGoals returns paged data with meta', async () => {
      mockGetUserGoals.execute.mockResolvedValue({
        items: [
          { id: 1, uuid: 'ug-1', userId: 10, categoryId: 1, historicalTitle: 'Goal 1', status: 'ACTIVE', progressPct: 0 } as UserGoal,
        ],
        total: 1,
      })

      const response = await controller.getUserGoals(reqWithUser, { skip: 0, take: 10 })

      expect(response.data).toHaveLength(1)
      expect(response.meta).toEqual({ total: 1, skip: 0, take: 10 })
    })

    it('createGoal delegates to adoptCatalogueGoal when goalId provided', async () => {
      mockAdoptCatalogueGoal.execute.mockResolvedValue({
        id: 1,
        uuid: 'ug-1',
        userId: 10,
        goalId: 5,
        categoryId: 1,
        historicalTitle: 'Catalogue Goal',
        status: 'ACTIVE',
        progressPct: 0,
      } as UserGoal)

      const response = await controller.createGoal(reqWithUser, { goalId: 5 })

      expect(response.message).toBe('Goal created successfully')
      expect(mockAdoptCatalogueGoal.execute).toHaveBeenCalledWith('usr-uuid-1', expect.objectContaining({ goalId: 5 }))
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserGoalsUpdatedEvent))
    })

    it('createGoal delegates to createCustomGoal when customTitle and categoryId provided', async () => {
      mockCreateCustomGoal.execute.mockResolvedValue({
        id: 2,
        uuid: 'ug-2',
        userId: 10,
        goalId: null,
        categoryId: 2,
        historicalTitle: 'My Custom Ambition',
        customTitle: 'My Custom Ambition',
        status: 'ACTIVE',
        progressPct: 0,
      } as UserGoal)

      const response = await controller.createGoal(reqWithUser, {
        customTitle: 'My Custom Ambition',
        categoryId: 2,
      })

      expect(response.message).toBe('Goal created successfully')
      expect(mockCreateCustomGoal.execute).toHaveBeenCalledWith(
        'usr-uuid-1',
        expect.objectContaining({ customTitle: 'My Custom Ambition', categoryId: 2 }),
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserGoalsUpdatedEvent))
    })

    it('createGoal throws BadRequestException when neither goalId nor customTitle+categoryId provided', async () => {
      await expect(controller.createGoal(reqWithUser, {})).rejects.toThrow(BadRequestException)
    })

    it('createGoal throws BadRequestException on ambiguous payload (both goalId and customTitle provided)', async () => {
      await expect(
        controller.createGoal(reqWithUser, {
          goalId: 5,
          customTitle: 'Ambiguous',
          categoryId: 1,
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('lifecycle operations trigger changeGoalStatus and publish event', async () => {
      const dummyGoal = { id: 1, uuid: 'ug-1', userId: 10, categoryId: 1, historicalTitle: 'G', status: 'PAUSED', progressPct: 0 } as UserGoal
      mockChangeGoalStatus.execute.mockResolvedValue(dummyGoal)

      const pauseRes = await controller.pauseGoal(reqWithUser, 'ug-1')
      expect(pauseRes.message).toBe('Goal paused successfully')
      expect(mockChangeGoalStatus.execute).toHaveBeenCalledWith('usr-uuid-1', 'ug-1', 'PAUSED')
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserGoalsUpdatedEvent))

      mockChangeGoalStatus.execute.mockResolvedValue({ ...dummyGoal, status: 'ACTIVE' })
      const actRes = await controller.activateGoal(reqWithUser, 'ug-1')
      expect(actRes.message).toBe('Goal activated successfully')
      expect(mockChangeGoalStatus.execute).toHaveBeenCalledWith('usr-uuid-1', 'ug-1', 'ACTIVE')

      mockChangeGoalStatus.execute.mockResolvedValue({ ...dummyGoal, status: 'COMPLETED' })
      const compRes = await controller.completeGoal(reqWithUser, 'ug-1')
      expect(compRes.message).toBe('Goal marked completed successfully')
      expect(mockChangeGoalStatus.execute).toHaveBeenCalledWith('usr-uuid-1', 'ug-1', 'COMPLETED')

      mockChangeGoalStatus.execute.mockResolvedValue({ ...dummyGoal, status: 'ARCHIVED' })
      const archRes = await controller.archiveGoal(reqWithUser, 'ug-1')
      expect(archRes.message).toBe('Goal archived successfully')
      expect(mockChangeGoalStatus.execute).toHaveBeenCalledWith('usr-uuid-1', 'ug-1', 'ARCHIVED')
    })
  })

  describe('Milestone endpoints', () => {
    it('createGoalMilestone creates milestone and publishes event', async () => {
      mockCreateMilestone.execute.mockResolvedValue({
        id: 1,
        uuid: 'm-1',
        userGoalId: 1,
        title: 'Step 1',
        status: 'PENDING',
        sortOrder: 0,
      })

      const response = await controller.createGoalMilestone(reqWithUser, 'ug-1', { title: 'Step 1' })

      expect(response.message).toBe('Milestone created successfully')
      expect(response.data.title).toBe('Step 1')
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserGoalsUpdatedEvent))
    })

    it('toggleGoalMilestoneStatus toggles status and publishes event', async () => {
      mockToggleMilestone.execute.mockResolvedValue({
        id: 1,
        uuid: 'm-1',
        userGoalId: 1,
        title: 'Step 1',
        status: 'COMPLETED',
        sortOrder: 0,
      })

      const response = await controller.toggleGoalMilestoneStatus(reqWithUser, 'ug-1', '1')

      expect(response.message).toBe('Milestone status toggled successfully')
      expect(response.data.status).toBe('COMPLETED')
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserGoalsUpdatedEvent))
    })

    it('deleteGoalMilestone deletes milestone and publishes event', async () => {
      mockDeleteMilestone.execute.mockResolvedValue(undefined)

      const response = await controller.deleteGoalMilestone(reqWithUser, 'ug-1', '1')

      expect(response.success).toBe(true)
      expect(mockEventBus.publish).toHaveBeenCalledWith(expect.any(UserGoalsUpdatedEvent))
    })
  })
})
