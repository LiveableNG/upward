import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserGoals(@Req() req: any) {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedException('Authentication required')
    const data = await this.getUserGoalsUseCase.execute(userId)
    return { data }
  }

  @Post('set')
  @HttpCode(HttpStatus.OK)
  async setUserGoals(@Req() req: any, @Body() dto: SetUserGoalsDto) {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedException('Authentication required')
    const data = await this.setUserGoalsUseCase.execute(userId, dto.goalIds)
    return { data, message: 'Goals updated successfully' }
  }

  @Patch(':goalId')
  @HttpCode(HttpStatus.OK)
  async updateUserGoal(
    @Req() req: any,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateUserGoalDto,
  ) {
    const userId = req.user?.id
    if (!userId) throw new UnauthorizedException('Authentication required')
    const data = await this.updateUserGoalUseCase.execute(userId, Number(goalId), dto)
    return { data, message: 'Goal progress updated' }
  }
}

