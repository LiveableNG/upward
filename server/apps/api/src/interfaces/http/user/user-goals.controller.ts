import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { GetUserGoalsUseCase } from '../../../application/goals/use-cases/get-user-goals.use-case'
import { GetUserGoalDetailUseCase } from '../../../application/goals/use-cases/get-user-goal-detail.use-case'
import { AdoptCatalogueGoalUseCase } from '../../../application/goals/use-cases/adopt-catalogue-goal.use-case'
import { CreateCustomGoalUseCase } from '../../../application/goals/use-cases/create-custom-goal.use-case'
import { SetUserGoalsUseCase } from '../../../application/goals/use-cases/set-user-goals.use-case'
import { UpdateUserGoalUseCase } from '../../../application/goals/use-cases/update-user-goal.use-case'
import { ChangeGoalStatusUseCase } from '../../../application/goals/use-cases/change-goal-status.use-case'
import { RemoveUserGoalUseCase } from '../../../application/goals/use-cases/remove-user-goal.use-case'
import { CreateGoalMilestoneUseCase } from '../../../application/goals/use-cases/milestones/create-goal-milestone.use-case'
import { GetGoalMilestonesUseCase } from '../../../application/goals/use-cases/milestones/get-goal-milestones.use-case'
import { UpdateGoalMilestoneUseCase } from '../../../application/goals/use-cases/milestones/update-goal-milestone.use-case'
import { ToggleGoalMilestoneStatusUseCase } from '../../../application/goals/use-cases/milestones/toggle-goal-milestone-status.use-case'
import { DeleteGoalMilestoneUseCase } from '../../../application/goals/use-cases/milestones/delete-goal-milestone.use-case'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { UserGoalsUpdatedEvent } from '../../../application/events/definition/user-goals-updated.event'
import {
  AdoptCatalogueGoalDto,
  CreateCustomGoalDto,
  CreateGoalMilestoneDto,
  CreateUserGoalDto,
  GetUserGoalsQueryDto,
  serializeGoalMilestone,
  serializeUserGoal,
  SetUserGoalsDto,
  UpdateGoalMilestoneDto,
  UpdateUserGoalDto,
} from '../../../application/goals/dto/user-goal.dto'

@Controller('user/goals')
@UseGuards(JwtAuthGuard)
export class UserGoalsController {
  constructor(
    private readonly getUserGoalsUseCase: GetUserGoalsUseCase,
    private readonly getUserGoalDetailUseCase: GetUserGoalDetailUseCase,
    private readonly adoptCatalogueGoalUseCase: AdoptCatalogueGoalUseCase,
    private readonly createCustomGoalUseCase: CreateCustomGoalUseCase,
    private readonly setUserGoalsUseCase: SetUserGoalsUseCase,
    private readonly updateUserGoalUseCase: UpdateUserGoalUseCase,
    private readonly changeGoalStatusUseCase: ChangeGoalStatusUseCase,
    private readonly removeUserGoalUseCase: RemoveUserGoalUseCase,
    private readonly createGoalMilestoneUseCase: CreateGoalMilestoneUseCase,
    private readonly getGoalMilestonesUseCase: GetGoalMilestonesUseCase,
    private readonly updateGoalMilestoneUseCase: UpdateGoalMilestoneUseCase,
    private readonly toggleGoalMilestoneStatusUseCase: ToggleGoalMilestoneStatusUseCase,
    private readonly deleteGoalMilestoneUseCase: DeleteGoalMilestoneUseCase,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  private extractUserUuid(req: any): string {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }
    return String(userUuid)
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserGoals(@Req() req: any, @Query() query: GetUserGoalsQueryDto) {
    const userUuid = this.extractUserUuid(req)
    const result = await this.getUserGoalsUseCase.execute(userUuid, query)

    if (Array.isArray(result)) {
      return { data: result.map(serializeUserGoal) }
    }

    return {
      data: result.items.map(serializeUserGoal),
      meta: {
        total: result.total,
        skip: query.skip || 0,
        take: query.take || 20,
      },
    }
  }

  @Get(':identifier')
  @HttpCode(HttpStatus.OK)
  async getUserGoalDetail(@Req() req: any, @Param('identifier') identifier: string) {
    const userUuid = this.extractUserUuid(req)
    const goal = await this.getUserGoalDetailUseCase.execute(userUuid, identifier)
    return { data: serializeUserGoal(goal) }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGoal(@Req() req: any, @Body() dto: CreateUserGoalDto) {
    const userUuid = this.extractUserUuid(req)

    if (dto.goalId && (dto.customTitle || dto.categoryId)) {
      throw new BadRequestException(
        'Ambiguous goal payload: cannot provide both catalogue goalId and custom goal fields (customTitle/categoryId)',
      )
    }

    let goal
    if (dto.goalId) {
      goal = await this.adoptCatalogueGoalUseCase.execute(userUuid, {
        goalId: dto.goalId,
        targetDate: dto.targetDate,
        notes: dto.notes,
        targetAmountMinor: dto.targetAmountMinor,
        currency: dto.currency,
        progressSource: dto.progressSource,
      })
    } else if (dto.customTitle && dto.categoryId) {
      goal = await this.createCustomGoalUseCase.execute(userUuid, {
        customTitle: dto.customTitle,
        categoryId: dto.categoryId,
        customDescription: dto.customDescription,
        targetDate: dto.targetDate,
        notes: dto.notes,
        targetAmountMinor: dto.targetAmountMinor,
        currency: dto.currency,
        progressSource: dto.progressSource,
      })
    } else {
      throw new BadRequestException(
        'Incomplete payload: either goalId (to adopt a catalogue goal) or both customTitle and categoryId (for a custom goal) must be provided',
      )
    }

    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeUserGoal(goal), message: 'Goal created successfully' }
  }

  @Post('adopt')
  @HttpCode(HttpStatus.CREATED)
  async adoptCatalogueGoal(@Req() req: any, @Body() dto: AdoptCatalogueGoalDto) {
    const userUuid = this.extractUserUuid(req)
    const goal = await this.adoptCatalogueGoalUseCase.execute(userUuid, dto)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeUserGoal(goal), message: 'Catalogue goal adopted successfully' }
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  async createCustomGoal(@Req() req: any, @Body() dto: CreateCustomGoalDto) {
    const userUuid = this.extractUserUuid(req)
    const goal = await this.createCustomGoalUseCase.execute(userUuid, dto)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeUserGoal(goal), message: 'Custom goal created successfully' }
  }

  @Post('set')
  @HttpCode(HttpStatus.OK)
  async setUserGoals(@Req() req: any, @Body() dto: SetUserGoalsDto) {
    const userUuid = this.extractUserUuid(req)
    const data = await this.setUserGoalsUseCase.execute(userUuid, dto.goalIds)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: data.map(serializeUserGoal), message: 'Goals updated successfully' }
  }

  @Patch(':identifier')
  @HttpCode(HttpStatus.OK)
  async updateUserGoal(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Body() dto: UpdateUserGoalDto,
  ) {
    const userUuid = this.extractUserUuid(req)
    const data = await this.updateUserGoalUseCase.execute(userUuid, identifier, dto)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeUserGoal(data), message: 'Goal updated successfully' }
  }

  @Post(':identifier/activate')
  @HttpCode(HttpStatus.OK)
  async activateGoal(@Req() req: any, @Param('identifier') identifier: string) {
    const userUuid = this.extractUserUuid(req)
    const data = await this.changeGoalStatusUseCase.execute(userUuid, identifier, 'ACTIVE')
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeUserGoal(data), message: 'Goal activated successfully' }
  }

  @Post(':identifier/pause')
  @HttpCode(HttpStatus.OK)
  async pauseGoal(@Req() req: any, @Param('identifier') identifier: string) {
    const userUuid = this.extractUserUuid(req)
    const data = await this.changeGoalStatusUseCase.execute(userUuid, identifier, 'PAUSED')
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeUserGoal(data), message: 'Goal paused successfully' }
  }

  @Post(':identifier/complete')
  @HttpCode(HttpStatus.OK)
  async completeGoal(@Req() req: any, @Param('identifier') identifier: string) {
    const userUuid = this.extractUserUuid(req)
    const data = await this.changeGoalStatusUseCase.execute(userUuid, identifier, 'COMPLETED')
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeUserGoal(data), message: 'Goal marked completed successfully' }
  }

  @Post(':identifier/archive')
  @HttpCode(HttpStatus.OK)
  async archiveGoal(@Req() req: any, @Param('identifier') identifier: string) {
    const userUuid = this.extractUserUuid(req)
    const data = await this.changeGoalStatusUseCase.execute(userUuid, identifier, 'ARCHIVED')
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeUserGoal(data), message: 'Goal archived successfully' }
  }

  @Delete(':identifier')
  @HttpCode(HttpStatus.OK)
  async removeUserGoal(@Req() req: any, @Param('identifier') identifier: string) {
    const userUuid = this.extractUserUuid(req)
    await this.removeUserGoalUseCase.execute(userUuid, identifier)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { success: true, message: 'Goal removed successfully' }
  }

  // Milestones Endpoints
  @Get(':identifier/milestones')
  @HttpCode(HttpStatus.OK)
  async getGoalMilestones(@Req() req: any, @Param('identifier') identifier: string) {
    const userUuid = this.extractUserUuid(req)
    const milestones = await this.getGoalMilestonesUseCase.execute(userUuid, identifier)
    return { data: milestones.map(serializeGoalMilestone) }
  }

  @Post(':identifier/milestones')
  @HttpCode(HttpStatus.CREATED)
  async createGoalMilestone(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Body() dto: CreateGoalMilestoneDto,
  ) {
    const userUuid = this.extractUserUuid(req)
    const milestone = await this.createGoalMilestoneUseCase.execute(userUuid, identifier, dto)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeGoalMilestone(milestone), message: 'Milestone created successfully' }
  }

  @Patch(':identifier/milestones/:milestoneId')
  @HttpCode(HttpStatus.OK)
  async updateGoalMilestone(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Param('milestoneId') milestoneId: string,
    @Body() dto: UpdateGoalMilestoneDto,
  ) {
    const userUuid = this.extractUserUuid(req)
    const milestone = await this.updateGoalMilestoneUseCase.execute(
      userUuid,
      identifier,
      milestoneId,
      dto,
    )
    return { data: serializeGoalMilestone(milestone), message: 'Milestone updated successfully' }
  }

  @Post(':identifier/milestones/:milestoneId/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleGoalMilestoneStatus(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    const userUuid = this.extractUserUuid(req)
    const milestone = await this.toggleGoalMilestoneStatusUseCase.execute(
      userUuid,
      identifier,
      milestoneId,
    )
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { data: serializeGoalMilestone(milestone), message: 'Milestone status toggled successfully' }
  }

  @Delete(':identifier/milestones/:milestoneId')
  @HttpCode(HttpStatus.OK)
  async deleteGoalMilestone(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    const userUuid = this.extractUserUuid(req)
    await this.deleteGoalMilestoneUseCase.execute(userUuid, identifier, milestoneId)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || userUuid))
    return { success: true, message: 'Milestone deleted successfully' }
  }
}
