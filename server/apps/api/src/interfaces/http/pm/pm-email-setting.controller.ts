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
  VerifyPmOffice365ConfigUseCase,
  VerifyPmGmailConfigUseCase,
  VerifyPmOauthConfigUseCase,
} from '../../../application/pm/use-cases/email-settings'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

interface FastifyRequest {
  user?: {
    sub: string
    email: string
    role: string
    ownerPmId?: number
    staffId?: number
    employeeId?: number
  }
}

@Controller('pm/email-settings')
@UseGuards(JwtAuthGuard)
export class PmEmailSettingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getPmEmailSettingsUseCase: GetPmEmailSettingsUseCase,
    private readonly savePmEmailConfigUseCase: SavePmEmailConfigUseCase,
    private readonly uploadPmEmailLogoUseCase: UploadPmEmailLogoUseCase,
    private readonly createPmEmailDomainUseCase: CreatePmEmailDomainUseCase,
    private readonly verifyPmEmailDomainUseCase: VerifyPmEmailDomainUseCase,
    private readonly sendPmTestEmailUseCase: SendPmTestEmailUseCase,
    private readonly verifyPmOffice365ConfigUseCase: VerifyPmOffice365ConfigUseCase,
    private readonly verifyPmGmailConfigUseCase: VerifyPmGmailConfigUseCase,
    private readonly verifyPmOauthConfigUseCase: VerifyPmOauthConfigUseCase,
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
  @HttpCode(HttpStatus.OK)
  async getSettings(@Req() req: FastifyRequest) {
    const pm = await this.getPm(req)
    return this.getPmEmailSettingsUseCase.execute(pm.uuid)
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  async saveConfig(@Req() req: FastifyRequest, @Body() body: any) {
    const pm = await this.getPm(req)
    return this.savePmEmailConfigUseCase.execute(pm.uuid, body)
  }

  @Post('logo-upload')
  @HttpCode(HttpStatus.OK)
  async uploadLogo(
    @Req() req: FastifyRequest,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    const pm = await this.getPm(req)
    return this.uploadPmEmailLogoUseCase.execute(
      pm.uuid,
      body.base64Data,
      body.contentType,
    )
  }

  @Post('domain')
  @HttpCode(HttpStatus.OK)
  async createDomain(@Req() req: FastifyRequest, @Body() body: { domain: string }) {
    const pm = await this.getPm(req)
    return this.createPmEmailDomainUseCase.execute(pm.uuid, body.domain)
  }

  @Post('verify-domain')
  @HttpCode(HttpStatus.OK)
  async verifyDomain(@Req() req: FastifyRequest, @Body() body: { domain: string }) {
    const pm = await this.getPm(req)
    return this.verifyPmEmailDomainUseCase.execute(pm.uuid, body.domain)
  }

  @Post('send-test-email')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Req() req: FastifyRequest, @Body() body: { email: string }) {
    const pm = await this.getPm(req)
    return this.sendPmTestEmailUseCase.execute(pm.uuid, body.email)
  }

  @Post('office365/verify-config')
  @HttpCode(HttpStatus.OK)
  async verifyOffice365(@Req() req: FastifyRequest, @Body() body: any) {
    const pm = await this.getPm(req)
    return this.verifyPmOffice365ConfigUseCase.execute(pm.uuid, body)
  }

  @Post('gmail/verify-config')
  @HttpCode(HttpStatus.OK)
  async verifyGmail(@Req() req: FastifyRequest, @Body() body: any) {
    const pm = await this.getPm(req)
    return this.verifyPmGmailConfigUseCase.execute(pm.uuid, body)
  }

  @Post('oauth/verify-config')
  @HttpCode(HttpStatus.OK)
  async verifyOauth(@Req() req: FastifyRequest, @Body() body: any) {
    const pm = await this.getPm(req)
    return this.verifyPmOauthConfigUseCase.execute(pm.uuid, body)
  }
}
