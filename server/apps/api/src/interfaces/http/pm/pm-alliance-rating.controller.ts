import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import {
  SubmitAllianceRatingDto,
  ListAllianceRatingsQueryDto,
} from '../../../application/alliance/dtos/alliance-rating.dto';
import { SubmitAllianceRatingUseCase } from '../../../application/alliance/use-cases/submit-alliance-rating.use-case';
import { GetSubjectRatingSummaryUseCase } from '../../../application/alliance/use-cases/get-subject-rating-summary.use-case';
import { ListSubjectRatingsUseCase } from '../../../application/alliance/use-cases/list-subject-ratings.use-case';
import { AllianceRatingSubjectType } from '../../../domains/alliance/alliance.entity';

@Controller('pm/alliance/ratings')
@UseGuards(JwtAuthGuard)
export class PmAllianceRatingController {
  constructor(
    private readonly submitRatingUseCase: SubmitAllianceRatingUseCase,
    private readonly getSubjectRatingSummaryUseCase: GetSubjectRatingSummaryUseCase,
    private readonly listSubjectRatingsUseCase: ListSubjectRatingsUseCase,
  ) {}

  @Post()
  async submitRating(
    @Body() dto: SubmitAllianceRatingDto,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.submitRatingUseCase.execute(dto, {
      type: 'PM',
      pmActor: actor,
    });
  }

  @Get('summary')
  async getSummary(
    @Query('subjectType') subjectType: AllianceRatingSubjectType,
    @Query('subjectId') subjectId: number,
  ) {
    return this.getSubjectRatingSummaryUseCase.execute(subjectType, Number(subjectId));
  }

  @Get()
  async listRatings(@Query() query: ListAllianceRatingsQueryDto) {
    return this.listSubjectRatingsUseCase.execute(query);
  }
}
