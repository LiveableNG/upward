import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'

import {
  GetPmEmailSettingsUseCase,
  SavePmEmailConfigUseCase,
  UploadPmEmailLogoUseCase,
  CreatePmEmailDomainUseCase,
  VerifyPmEmailDomainUseCase,
  SendPmTestEmailUseCase,
} from '../../../application/pm/use-cases/email-settings'

interface FastifyRequest {
  user?: {
    sub: string
    email: string
    role: string
  }
}

@Controller('pm/email-settings')
@UseGuards(JwtAuthGuard)
export class PmEmailSettingController {
  constructor(
    private readonly getPmEmailSettingsUseCase: GetPmEmailSettingsUseCase,
    private readonly savePmEmailConfigUseCase: SavePmEmailConfigUseCase,
    private readonly uploadPmEmailLogoUseCase: UploadPmEmailLogoUseCase,
    private readonly createPmEmailDomainUseCase: CreatePmEmailDomainUseCase,
    private readonly verifyPmEmailDomainUseCase: VerifyPmEmailDomainUseCase,
    private readonly sendPmTestEmailUseCase: SendPmTestEmailUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSettings(@Req() req: FastifyRequest) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.getPmEmailSettingsUseCase.execute(req.user.sub)
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  async saveConfig(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.savePmEmailConfigUseCase.execute(req.user.sub, body)
  }

  @Post('logo-upload')
  @HttpCode(HttpStatus.OK)
  async uploadLogo(
    @Req() req: FastifyRequest,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.uploadPmEmailLogoUseCase.execute(
      req.user.sub,
      body.base64Data,
      body.contentType,
    )
  }

  @Post('domain')
  @HttpCode(HttpStatus.OK)
  async createDomain(@Req() req: FastifyRequest, @Body() body: { domain: string }) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.createPmEmailDomainUseCase.execute(req.user.sub, body.domain)
  }

  @Post('verify-domain')
  @HttpCode(HttpStatus.OK)
  async verifyDomain(@Req() req: FastifyRequest, @Body() body: { domain: string }) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.verifyPmEmailDomainUseCase.execute(req.user.sub, body.domain)
  }

  @Post('send-test-email')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Req() req: FastifyRequest, @Body() body: { email: string }) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.sendPmTestEmailUseCase.execute(req.user.sub, body.email)
  }
}
