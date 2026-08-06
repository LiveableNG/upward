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

import { GetPmReceiptSettingsUseCase } from '../../../application/pm/use-cases/receipt-settings/get-pm-receipt-settings.use-case'
import { UpdatePmReceiptSettingsUseCase, UpdateReceiptSettingDto } from '../../../application/pm/use-cases/receipt-settings/update-pm-receipt-settings.use-case'
import { PreviewPmReceiptUseCase, PreviewReceiptSettingDto } from '../../../application/pm/use-cases/receipt-settings/preview-pm-receipt.use-case'
import { UploadPmReceiptLogoUseCase } from '../../../application/pm/use-cases/receipt-settings/upload-pm-receipt-logo.use-case'

interface FastifyRequest {
  user?: {
    sub: string
  }
}

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
  async getSettings(@Req() req: FastifyRequest) {
    if (!req.user) throw new UnauthorizedException()
    return this.getPmReceiptSettingsUseCase.execute(req.user.sub)
  }

  @Patch()
  async updateSettings(
    @Req() req: FastifyRequest,
    @Body() body: UpdateReceiptSettingDto
  ) {
    if (!req.user) throw new UnauthorizedException()
    return this.updatePmReceiptSettingsUseCase.execute(req.user.sub, body)
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewReceipt(
    @Req() req: FastifyRequest,
    @Body() body: PreviewReceiptSettingDto,
    @Res() res: FastifyReply
  ) {
    if (!req.user) throw new UnauthorizedException()
    console.log('Preview Payload body:', body)
    const pdfBuffer = await this.previewPmReceiptUseCase.execute(req.user.sub, body)
    
    res.header('Content-Type', 'application/pdf')
    res.header('Content-Disposition', 'inline; filename="receipt-preview.pdf"')
    res.send(pdfBuffer)
  }

  @Post('logo-upload')
  async uploadLogo(
    @Req() req: FastifyRequest,
    @Body() body: { base64Data: string; contentType: string }
  ) {
    if (!req.user) throw new UnauthorizedException()
    if (!body.base64Data || !body.contentType) {
      throw new UnauthorizedException('Invalid request data')
    }
    return this.uploadPmReceiptLogoUseCase.execute(
      req.user.sub,
      body.base64Data,
      body.contentType
    )
  }
}
