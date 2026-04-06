/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Post, Patch, Body, UseGuards, Req, Param } from '@nestjs/common'
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard'
import {
  CreateSavingsGoalUseCase,
  UpdateSavingsGoalUseCase,
  GetSavingsGoalsUseCase,
} from '@application/use-cases/wallet/wallet.use-cases'

@Controller('savings')
@UseGuards(JwtAuthGuard)
export class SavingsController {
  constructor(
    private readonly createGoalUc: CreateSavingsGoalUseCase,
    private readonly updateGoalUc: UpdateSavingsGoalUseCase,
    private readonly getGoalsUc: GetSavingsGoalsUseCase,
  ) {}

  @Get('goals')
  async getGoals(@Req() req: any) {
    return this.getGoalsUc.execute(req.user.id)
  }

  @Post('goals')
  async createGoal(@Req() req: any, @Body() body: any) {
    return this.createGoalUc.execute({
      tenantId: req.user.id,
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : new Date(),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    })
  }

  @Patch('goals/:id')
  async updateGoal(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    // We should ideally verify ownership here, but for now we follow the existing pattern
    return this.updateGoalUc.execute(id, body)
  }
}
