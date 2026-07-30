import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { SubscriptionGateGuard } from '../../../application/auth/guards/subscription-gate.guard'
import { RequireFeature } from '../../../application/auth/decorators/require-feature.decorator'
import { FeatureKey } from '../../../domains/subscription/subscription.service'
import {
  PROPERTY_MANAGER_REPOSITORY,
  PropertyManagerRepository,
} from '../../../domains/pm/property-manager.repository'
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
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  private async getPmId(req: any): Promise<number> {
    const uuid = req.user?.sub
    if (!uuid) throw new UnauthorizedException('Invalid user context')
    const pm = await this.pmRepository.findByUuid(uuid)
    if (!pm || !pm.id) throw new UnauthorizedException('Property Manager not found')
    return pm.id
  }

  @Get()
  async list(@Req() req: any) {
    const pmId = await this.getPmId(req)
    return this.listPmHomeRequestsUseCase.execute(pmId)
  }

  @Get(':uuid')
  async getOne(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getPmId(req)
    return this.getPmHomeRequestUseCase.execute(pmId, uuid)
  }

  @Post(':uuid/reveal-contact')
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.LISTING_BROKERAGE)
  async revealContact(@Req() req: any, @Param('uuid') uuid: string) {
    const pmId = await this.getPmId(req)
    const limit = (req as any).featureLimit
    return this.revealPmHomeRequestContactUseCase.execute(pmId, uuid, limit)
  }
}
