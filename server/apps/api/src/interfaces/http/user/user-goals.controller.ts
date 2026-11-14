import {
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
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { GetUserGoalsUseCase } from '../../../application/goals/use-cases/get-user-goals.use-case'
import { SetUserGoalsUseCase } from '../../../application/goals/use-cases/set-user-goals.use-case'
import { UpdateUserGoalUseCase } from '../../../application/goals/use-cases/update-user-goal.use-case'
import { RemoveUserGoalUseCase } from '../../../application/goals/use-cases/remove-user-goal.use-case'
import { CreateCustomGoalUseCase } from '../../../application/goals/use-cases/create-custom-goal.use-case'
import { ToggleGoalActionUseCase } from '../../../application/goals/use-cases/toggle-goal-action.use-case'
import { SubmitGoalQuestionnaireUseCase } from '../../../application/goals/use-cases/submit-goal-questionnaire.use-case'
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { UserGoalsUpdatedEvent } from '../../../application/events/definition/user-goals-updated.event'
import {
  CreateCustomGoalDto,
  SetUserGoalsDto,
  SubmitGoalQuestionnaireDto,
  UpdateUserGoalDto,
} from '../../../application/goals/dto/user-goal.dto'

@Controller('user/goals')
@UseGuards(JwtAuthGuard)
export class UserGoalsController {
  constructor(
    private readonly getUserGoalsUseCase: GetUserGoalsUseCase,
    private readonly setUserGoalsUseCase: SetUserGoalsUseCase,
    private readonly updateUserGoalUseCase: UpdateUserGoalUseCase,
    private readonly removeUserGoalUseCase: RemoveUserGoalUseCase,
    private readonly createCustomGoalUseCase: CreateCustomGoalUseCase,
    private readonly toggleGoalActionUseCase: ToggleGoalActionUseCase,
    private readonly submitGoalQuestionnaireUseCase: SubmitGoalQuestionnaireUseCase,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserGoals(@Req() req: any) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) throw new UnauthorizedException('Authentication required')
    const data = await this.getUserGoalsUseCase.execute(userUuid)
    return { data }
  }

  @Post('set')
  @HttpCode(HttpStatus.OK)
  async setUserGoals(@Req() req: any, @Body() dto: SetUserGoalsDto) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) throw new UnauthorizedException('Authentication required')
    const data = await this.setUserGoalsUseCase.execute(userUuid, dto.goalIds)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || String(userUuid)))
    return { data, message: 'Goals updated successfully' }
  }

  @Post('custom')
  @HttpCode(HttpStatus.CREATED)
  async createCustomGoal(@Req() req: any, @Body() dto: CreateCustomGoalDto) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) throw new UnauthorizedException('Authentication required')
    const data = await this.createCustomGoalUseCase.execute(userUuid, dto)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || String(userUuid)))
    return { data, message: 'Custom goal created successfully' }
  }

  @Post('questionnaire')
  @HttpCode(HttpStatus.CREATED)
  async submitGoalQuestionnaire(@Req() req: any, @Body() dto: SubmitGoalQuestionnaireDto) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) throw new UnauthorizedException('Authentication required')
    const data = await this.submitGoalQuestionnaireUseCase.execute(userUuid, dto)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || String(userUuid)))
    return { data, message: 'Goal established from questionnaire' }
  }

  @Patch(':goalUuid/actions/:actionId/toggle')
  @HttpCode(HttpStatus.OK)
  async toggleAction(
    @Req() req: any,
    @Param('goalUuid') goalUuid: string,
    @Param('actionId') actionId: string,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) throw new UnauthorizedException('Authentication required')
    const data = await this.toggleGoalActionUseCase.execute(userUuid, goalUuid, actionId)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || String(userUuid)))
    return { data, message: 'Goal action toggled' }
  }

  @Patch(':goalId')
  @HttpCode(HttpStatus.OK)
  async updateUserGoal(
    @Req() req: any,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateUserGoalDto,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) throw new UnauthorizedException('Authentication required')
    const data = await this.updateUserGoalUseCase.execute(userUuid, Number(goalId), dto)
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || String(userUuid)))
    return { data, message: 'Goal progress updated' }
  }

  @Delete(':goalId')
  @HttpCode(HttpStatus.OK)
  async removeUserGoal(
    @Req() req: any,
    @Param('goalId') goalId: string,
  ) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) throw new UnauthorizedException('Authentication required')
    await this.removeUserGoalUseCase.execute(userUuid, Number(goalId))
    this.eventBus.publish(new UserGoalsUpdatedEvent(userUuid, req.user?.uuid || String(userUuid)))
    return { success: true, message: 'Goal removed successfully' }
  }
}

