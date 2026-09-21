import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { CurrentPmUuid } from '../../../application/auth/decorators/current-pm-actor.decorator'
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
    private readonly verifyPmOffice365ConfigUseCase: VerifyPmOffice365ConfigUseCase,
    private readonly verifyPmGmailConfigUseCase: VerifyPmGmailConfigUseCase,
    private readonly verifyPmOauthConfigUseCase: VerifyPmOauthConfigUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSettings(@CurrentPmUuid() pmUuid: string) {
    return this.getPmEmailSettingsUseCase.execute(pmUuid)
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  async saveConfig(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: any,
  ) {
    return this.savePmEmailConfigUseCase.execute(pmUuid, body)
  }

  @Post('logo-upload')
  @HttpCode(HttpStatus.OK)
  async uploadLogo(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    return this.uploadPmEmailLogoUseCase.execute(
      pmUuid,
      body.base64Data,
      body.contentType,
    )
  }

  @Post('domain')
  @HttpCode(HttpStatus.OK)
  async createDomain(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: { domain: string },
  ) {
    return this.createPmEmailDomainUseCase.execute(pmUuid, body.domain)
  }

  @Post('verify-domain')
  @HttpCode(HttpStatus.OK)
  async verifyDomain(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: { domain: string },
  ) {
    return this.verifyPmEmailDomainUseCase.execute(pmUuid, body.domain)
  }

  @Post('send-test-email')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: { email: string },
  ) {
    return this.sendPmTestEmailUseCase.execute(pmUuid, body.email)
  }

  @Post('office365/verify-config')
  @HttpCode(HttpStatus.OK)
  async verifyOffice365(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: any,
  ) {
    return this.verifyPmOffice365ConfigUseCase.execute(pmUuid, body)
  }

  @Post('gmail/verify-config')
  @HttpCode(HttpStatus.OK)
  async verifyGmail(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: any,
  ) {
    return this.verifyPmGmailConfigUseCase.execute(pmUuid, body)
  }

  @Post('oauth/verify-config')
  @HttpCode(HttpStatus.OK)
  async verifyOauth(
    @CurrentPmUuid() pmUuid: string,
    @Body() body: any,
  ) {
    return this.verifyPmOauthConfigUseCase.execute(pmUuid, body)
  }
}
