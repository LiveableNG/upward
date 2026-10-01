import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { DiscoverAllianceListingsQueryDto } from '../../../application/alliance/dtos/alliance-listing.dto';
import { DiscoverAllianceListingsUseCase } from '../../../application/alliance/use-cases/discover-alliance-listings.use-case';
import { GetDiscoveredAllianceListingDetailUseCase } from '../../../application/alliance/use-cases/get-discovered-alliance-listing-detail.use-case';

@Controller('pm/alliance/discover')
@UseGuards(JwtAuthGuard)
export class PmAllianceDiscoverController {
  constructor(
    private readonly discoverListingsUseCase: DiscoverAllianceListingsUseCase,
    private readonly getDiscoveredDetailUseCase: GetDiscoveredAllianceListingDetailUseCase,
  ) {}

  @Get()
  async discover(
    @Query() query: DiscoverAllianceListingsQueryDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.discoverListingsUseCase.execute(query, actor);
  }

  @Get(':uuid')
  async getDetail(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.getDiscoveredDetailUseCase.execute(uuid, actor);
  }
}
