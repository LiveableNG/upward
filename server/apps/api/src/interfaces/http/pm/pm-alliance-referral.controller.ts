import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import {
  ListAllianceReferralsQueryDto,
  UpdateAllianceLeadStageDto,
} from '../../../application/alliance/dtos/alliance-referral.dto';
import { ListPmAllianceReferralsUseCase } from '../../../application/alliance/use-cases/list-pm-alliance-referrals.use-case';
import { GetAllianceReferralDetailUseCase } from '../../../application/alliance/use-cases/get-alliance-referral-detail.use-case';
import { UpdateAllianceLeadStageUseCase } from '../../../application/alliance/use-cases/update-alliance-lead-stage.use-case';
import { CloseAllianceReferralUseCase } from '../../../application/alliance/use-cases/close-alliance-referral.use-case';

@Controller('pm/alliance/referrals')
@UseGuards(JwtAuthGuard)
export class PmAllianceReferralController {
  constructor(
    private readonly listReferralsUseCase: ListPmAllianceReferralsUseCase,
    private readonly getReferralDetailUseCase: GetAllianceReferralDetailUseCase,
    private readonly updateLeadStageUseCase: UpdateAllianceLeadStageUseCase,
    private readonly closeReferralUseCase: CloseAllianceReferralUseCase,
  ) {}

  @Get()
  async list(
    @Query() query: ListAllianceReferralsQueryDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.listReferralsUseCase.execute(query, actor);
  }

  @Get(':uuid')
  async getOne(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.getReferralDetailUseCase.execute(uuid, actor);
  }

  @Patch(':uuid/stage')
  async updateStage(
    @Param('uuid') uuid: string,
    @Body() dto: UpdateAllianceLeadStageDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.updateLeadStageUseCase.execute(uuid, dto, actor);
  }

  @Post(':uuid/close')
  async close(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.closeReferralUseCase.execute(uuid, actor);
  }
}
