import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { SubscriptionGateGuard } from '../../../application/auth/guards/subscription-gate.guard'
import { RequireFeature } from '../../../application/auth/decorators/require-feature.decorator'
import { FeatureKey } from '../../../domains/subscription/subscription.service'
import { CurrentPmId } from '../../../application/auth/decorators/current-pm-actor.decorator'
import {
  GetPmHomeRequestUseCase,
  ListPmHomeRequestsUseCase,
  RevealPmHomeRequestContactUseCase,
} from '../../../application/pm/use-cases/home-requests/pm-home-request.use-cases'

@Controller('pm/home-requests')
@UseGuards(JwtAuthGuard)
export class PmHomeRequestController {
  constructor(
    private readonly listPmHomeRequestsUseCase: ListPmHomeRequestsUseCase,
    private readonly getPmHomeRequestUseCase: GetPmHomeRequestUseCase,
    private readonly revealPmHomeRequestContactUseCase: RevealPmHomeRequestContactUseCase,
  ) {}

  @Get()
  async list(@CurrentPmId() pmId: number) {
    return this.listPmHomeRequestsUseCase.execute(pmId)
  }

  @Get(':uuid')
  async getOne(@CurrentPmId() pmId: number, @Param('uuid') uuid: string) {
    return this.getPmHomeRequestUseCase.execute(pmId, uuid)
  }

  @Post(':uuid/reveal-contact')
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.LISTING_BROKERAGE)
  async revealContact(
    @CurrentPmId() pmId: number,
    @Param('uuid') uuid: string,
    @Req() req: any,
  ) {
    const limit = (req as any).featureLimit
    return this.revealPmHomeRequestContactUseCase.execute(pmId, uuid, limit)
  }
}
