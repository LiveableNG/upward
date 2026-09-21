import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { SubscriptionGateGuard } from '../../../application/auth/guards/subscription-gate.guard'
import { RequireFeature } from '../../../application/auth/decorators/require-feature.decorator'
import { FeatureKey } from '../../../domains/subscription/subscription.service'
import { CurrentPmUuid } from '../../../application/auth/decorators/current-pm-actor.decorator'
import {
  GetPmReceiptSettingsUseCase,
} from '../../../application/pm/use-cases/receipt-settings/get-pm-receipt-settings.use-case'
import {
  UpdatePmReceiptSettingsUseCase,
  UpdateReceiptSettingDto,
} from '../../../application/pm/use-cases/receipt-settings/update-pm-receipt-settings.use-case'
import {
  PreviewPmReceiptUseCase,
  PreviewReceiptSettingDto,
} from '../../../application/pm/use-cases/receipt-settings/preview-pm-receipt.use-case'
import { UploadPmReceiptLogoUseCase } from '../../../application/pm/use-cases/receipt-settings/upload-pm-receipt-logo.use-case'

@Controller('pm/receipt-settings')
@UseGuards(JwtAuthGuard)
export class PmReceiptSettingController {
  constructor(
    private readonly getPmReceiptSettingsUseCase: GetPmReceiptSettingsUseCase,
    private readonly updatePmReceiptSettingsUseCase: UpdatePmReceiptSettingsUseCase,
    private readonly previewPmReceiptUseCase: PreviewPmReceiptUseCase,
    private readonly uploadPmReceiptLogoUseCase: UploadPmReceiptLogoUseCase,
  ) {}

  @Get()
  async getSettings(@CurrentPmUuid() pmUuid: string) {
    return this.getPmReceiptSettingsUseCase.execute(pmUuid)
  }

  @Patch()
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async updateSettings(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: UpdateReceiptSettingDto,
  ) {
    return this.updatePmReceiptSettingsUseCase.execute(pmUuid, body)
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewReceipt(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: PreviewReceiptSettingDto,
    @Res() res: FastifyReply,
  ) {
    const pdfBuffer = await this.previewPmReceiptUseCase.execute(pmUuid, body)

    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', 'inline; filename="receipt-preview.pdf"')
    res.send(pdfBuffer)
  }

  @Post('logo-upload')
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async uploadLogo(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    if (!body.base64Data || !body.contentType) {
      throw new BadRequestException('Invalid request data')
    }
    return this.uploadPmReceiptLogoUseCase.execute(
      pmUuid,
      body.base64Data,
      body.contentType,
    )
  }
}
