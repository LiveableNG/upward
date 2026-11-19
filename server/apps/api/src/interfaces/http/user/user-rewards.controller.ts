import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { GetUserRewardsSummaryUseCase } from '../../../application/rewards/use-cases/get-user-rewards-summary.use-case'
import { TriggerAutomatedRewardUseCase } from '../../../application/rewards/use-cases/trigger-automated-reward.use-case'
import { CompleteRewardActivityDto } from '../../../application/rewards/dto/rewards.dto'

@Controller('user/rewards')
@UseGuards(JwtAuthGuard)
export class UserRewardsController {
  constructor(
    private readonly getUserRewardsSummaryUseCase: GetUserRewardsSummaryUseCase,
    private readonly triggerAutomatedRewardUseCase: TriggerAutomatedRewardUseCase,
  ) {}

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  async getRewardsSummary(@Req() req: any) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }
    const data = await this.getUserRewardsSummaryUseCase.execute(userUuid)
    return { data }
  }

  @Post('complete-activity')
  @HttpCode(HttpStatus.OK)
  async completeActivity(@Req() req: any, @Body() dto: CompleteRewardActivityDto) {
    const userUuid = req.user?.id || req.user?.sub
    if (!userUuid) {
      throw new UnauthorizedException('Authentication required')
    }
    const qualifyingAmountKobo =
      dto.qualifyingAmountNaira != null
        ? BigInt(Math.round(dto.qualifyingAmountNaira * 100))
        : undefined

    const data = await this.triggerAutomatedRewardUseCase.execute({
      userUuid: String(userUuid),
      triggerKey: dto.triggerKey.trim(),
      qualifyingAmountKobo,
      campaignTag: dto.campaignTag?.trim(),
      notes: dto.notes?.trim(),
    })
    return { data }
  }
}
