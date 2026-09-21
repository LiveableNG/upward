import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { SubscriptionGateGuard } from '../../../application/auth/guards/subscription-gate.guard'
import { RequireFeature } from '../../../application/auth/decorators/require-feature.decorator'
import { FeatureKey } from '../../../domains/subscription/subscription.service'
import { CurrentPmId } from '../../../application/auth/decorators/current-pm-actor.decorator'
import {
  GetDocumentLetterheadContextUseCase,
  GetPmLetterheadsUseCase,
  SavePmLetterheadUseCase,
  SetDefaultPmLetterheadUseCase,
  UpdatePmLetterheadUseCase,
  DeletePmLetterheadUseCase,
} from '../../../application/pm/use-cases/branding'

@Controller('pm/letterheads')
@UseGuards(JwtAuthGuard)
export class PmLetterheadController {
  constructor(
    private readonly getDocumentLetterheadContextUc: GetDocumentLetterheadContextUseCase,
    private readonly getPmLetterheadsUc: GetPmLetterheadsUseCase,
    private readonly savePmLetterheadUc: SavePmLetterheadUseCase,
    private readonly setDefaultPmLetterheadUc: SetDefaultPmLetterheadUseCase,
    private readonly updatePmLetterheadUc: UpdatePmLetterheadUseCase,
    private readonly deletePmLetterheadUc: DeletePmLetterheadUseCase,
  ) {}

  @Get('document-context')
  @HttpCode(HttpStatus.OK)
  async getDocumentLetterheadContext(
    @CurrentPmId() actorPmId: number,
    @Query('unitUuid') unitUuid?: string,
    @Query('tenantUuid') tenantUuid?: string,
  ) {
    return this.getDocumentLetterheadContextUc.execute({
      actorPmId,
      unitUuid,
      tenantUuid,
    })
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getLetterheads(@CurrentPmId() pmId: number) {
    return this.getPmLetterheadsUc.execute(pmId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async saveLetterhead(@CurrentPmId() pmId: number, @Body() body: any) {
    return this.savePmLetterheadUc.execute({
      pmId,
      isDefault: body.isDefault,
      pageCount: body.pageCount,
      templateFileKey: body.templateFileKey,
      previewFirstPageKey: body.previewFirstPageKey,
      previewContinuationPageKey: body.previewContinuationPageKey,
      templateConfig: body.templateConfig,
    })
  }

  @Patch(':id/set-as-default')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async setAsDefault(
    @CurrentPmId() pmId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.setDefaultPmLetterheadUc.execute(pmId, id)
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async updateLetterhead(
    @CurrentPmId() pmId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.updatePmLetterheadUc.execute(pmId, id, body.templateConfig)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async deleteLetterhead(
    @CurrentPmId() pmId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.deletePmLetterheadUc.execute(pmId, id)
  }
}
