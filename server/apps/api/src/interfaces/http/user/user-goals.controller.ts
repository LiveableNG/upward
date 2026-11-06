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
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event'
import { UserGoalsUpdatedEvent } from '../../../application/events/definition/user-goals-updated.event'
import {
  SetUserGoalsDto,
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

