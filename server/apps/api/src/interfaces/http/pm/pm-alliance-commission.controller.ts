import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import {
  ConvertAllianceReferralDto,
  ListAllianceCommissionsQueryDto,
} from '../../../application/alliance/dtos/alliance-commission.dto';
import { ConvertAllianceReferralUseCase } from '../../../application/alliance/use-cases/convert-alliance-referral.use-case';
import { ListPmAllianceCommissionsUseCase } from '../../../application/alliance/use-cases/list-pm-alliance-commissions.use-case';
import { GetAllianceCommissionDetailUseCase } from '../../../application/alliance/use-cases/get-alliance-commission-detail.use-case';

@Controller('pm/alliance')
@UseGuards(JwtAuthGuard)
export class PmAllianceCommissionController {
  constructor(
    private readonly listCommissionsUseCase: ListPmAllianceCommissionsUseCase,
    private readonly getCommissionDetailUseCase: GetAllianceCommissionDetailUseCase,
    private readonly convertReferralUseCase: ConvertAllianceReferralUseCase,
  ) {}

  @Get('commissions')
  async listCommissions(
    @Query() query: ListAllianceCommissionsQueryDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.listCommissionsUseCase.execute(query, actor);
  }

  @Get('commissions/:uuid')
  async getCommissionDetail(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.getCommissionDetailUseCase.execute(uuid, actor);
  }

  @Post('referrals/:uuid/convert')
  async convertReferral(
    @Param('uuid') referralUuid: string,
    @Body() dto: ConvertAllianceReferralDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.convertReferralUseCase.execute(referralUuid, dto, actor);
  }
}
