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
  GetDocumentSignatureContextUseCase,
  UploadPmSignatureUseCase,
  GetPmSignaturesUseCase,
  SavePmSignatureUseCase,
  SetDefaultPmSignatureUseCase,
  DeletePmSignatureUseCase,
} from '../../../application/pm/use-cases/branding'

@Controller('pm/signatures')
@UseGuards(JwtAuthGuard)
export class PmSignatureController {
  constructor(
    private readonly getDocumentSignatureContextUc: GetDocumentSignatureContextUseCase,
    private readonly uploadPmSignatureUc: UploadPmSignatureUseCase,
    private readonly getPmSignaturesUc: GetPmSignaturesUseCase,
    private readonly savePmSignatureUc: SavePmSignatureUseCase,
    private readonly setDefaultPmSignatureUc: SetDefaultPmSignatureUseCase,
    private readonly deletePmSignatureUc: DeletePmSignatureUseCase,
  ) {}

  @Get('document-context')
  @HttpCode(HttpStatus.OK)
  async getDocumentSignatureContext(
    @CurrentPmId() actorPmId: number,
    @Query('unitUuid') unitUuid?: string,
    @Query('tenantUuid') tenantUuid?: string,
  ) {
    return this.getDocumentSignatureContextUc.execute({
      actorPmId,
      unitUuid,
      tenantUuid,
    })
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async uploadSignature(
    @CurrentPmId() pmId: number,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    return this.uploadPmSignatureUc.execute({
      pmId,
      base64Data: body.base64Data,
      contentType: body.contentType,
    })
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSignatures(@CurrentPmId() pmId: number) {
    return this.getPmSignaturesUc.execute(pmId)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async saveSignature(@CurrentPmId() pmId: number, @Body() body: any) {
    return this.savePmSignatureUc.execute({
      pmId,
      name: body.name,
      type: body.type,
      fileKey: body.fileKey,
      content: body.content,
      isDefault: body.isDefault,
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
    return this.setDefaultPmSignatureUc.execute(pmId, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async deleteSignature(
    @CurrentPmId() pmId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.deletePmSignatureUc.execute(pmId, id)
  }
}
