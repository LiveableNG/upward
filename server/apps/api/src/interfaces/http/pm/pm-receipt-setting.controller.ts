import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common'
import { FastifyReply } from 'fastify'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { SubscriptionGateGuard } from '../../../application/auth/guards/subscription-gate.guard'
import { RequireFeature } from '../../../application/auth/decorators/require-feature.decorator'
import { FeatureKey } from '../../../domains/subscription/subscription.service'

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { GetPmReceiptSettingsUseCase } from '../../../application/pm/use-cases/receipt-settings/get-pm-receipt-settings.use-case'
import { UpdatePmReceiptSettingsUseCase, UpdateReceiptSettingDto } from '../../../application/pm/use-cases/receipt-settings/update-pm-receipt-settings.use-case'
import { PreviewPmReceiptUseCase, PreviewReceiptSettingDto } from '../../../application/pm/use-cases/receipt-settings/preview-pm-receipt.use-case'
import { UploadPmReceiptLogoUseCase } from '../../../application/pm/use-cases/receipt-settings/upload-pm-receipt-logo.use-case'

interface FastifyRequest {
  user?: {
    sub: string
    email?: string
    role?: string
    ownerPmId?: number
    staffId?: number
    employeeId?: number
  }
}

@Controller('pm/receipt-settings')
@UseGuards(JwtAuthGuard)
export class PmReceiptSettingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getPmReceiptSettingsUseCase: GetPmReceiptSettingsUseCase,
    private readonly updatePmReceiptSettingsUseCase: UpdatePmReceiptSettingsUseCase,
    private readonly previewPmReceiptUseCase: PreviewPmReceiptUseCase,
    private readonly uploadPmReceiptLogoUseCase: UploadPmReceiptLogoUseCase,
  ) {}

  private async getPm(req: FastifyRequest) {
    if (!req.user?.sub) throw new UnauthorizedException()
    if (req.user.role === 'PM_EMPLOYEE') {
      let ownerPmId = (req.user as any).ownerPmId
      if (!ownerPmId) {
        const employee = await (this.prisma as any).upward_pm_employee.findUnique({
          where: { uuid: req.user.sub },
          select: { ownerPmId: true },
        })
        ownerPmId = employee?.ownerPmId
      }
      if (ownerPmId) {
        const pm = await this.prisma.upward_property_manager.findUnique({
          where: { id: ownerPmId },
        })
        if (pm) return pm
      }
    }
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')
    return pm
  }

  @Get()
  async getSettings(@Req() req: FastifyRequest) {
    const pm = await this.getPm(req)
    return this.getPmReceiptSettingsUseCase.execute(pm.uuid)
  }

  @Patch()
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async updateSettings(
    @Req() req: FastifyRequest,
    @Body() body: UpdateReceiptSettingDto
  ) {
    const pm = await this.getPm(req)
    return this.updatePmReceiptSettingsUseCase.execute(pm.uuid, body)
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewReceipt(
    @Req() req: FastifyRequest,
    @Body() body: PreviewReceiptSettingDto,
    @Res() res: FastifyReply
  ) {
    const pm = await this.getPm(req)
    const pdfBuffer = await this.previewPmReceiptUseCase.execute(pm.uuid, body)
    
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', 'inline; filename="receipt-preview.pdf"')
    res.send(pdfBuffer)
  }

  @Post('logo-upload')
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async uploadLogo(
    @Req() req: FastifyRequest,
    @Body() body: { base64Data: string; contentType: string }
  ) {
    if (!body.base64Data || !body.contentType) {
      throw new UnauthorizedException('Invalid request data')
    }
    const pm = await this.getPm(req)
    return this.uploadPmReceiptLogoUseCase.execute(
      pm.uuid,
      body.base64Data,
      body.contentType
    )
  }
}
