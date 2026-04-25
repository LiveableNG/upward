import {
  Controller,
  Patch,
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
import { UpdatePmProfileUseCase } from '../../../application/use-cases/pm/update-pm-profile.use-case'
import { UpdatePmBankInfoUseCase } from '../../../application/use-cases/pm/update-pm-bank-info.use-case'
import { ChangePmPasswordUseCase } from '../../../application/use-cases/pm/change-pm-password.use-case'
import { GetPmAvatarUploadUrlUseCase } from '../../../application/use-cases/pm/get-pm-avatar-upload-url.use-case'
import { VerifyAccountUseCase, GetBanksUseCase } from '../../../application/use-cases/payments/payment.use-cases'

interface FastifyRequest {
  user?: {
    sub: string
    email: string
    role: string
  }
}

@Controller('pm/profile')
@UseGuards(JwtAuthGuard)
export class PmProfileController {
  constructor(
    private readonly updateProfileUseCase: UpdatePmProfileUseCase,
    private readonly updateBankInfoUseCase: UpdatePmBankInfoUseCase,
    private readonly changePasswordUseCase: ChangePmPasswordUseCase,
    private readonly getAvatarUrlUseCase: GetPmAvatarUploadUrlUseCase,
    private readonly verifyAccountUseCase: VerifyAccountUseCase,
    private readonly getBanksUseCase: GetBanksUseCase,
  ) {}

  @Get('banks')
  @HttpCode(HttpStatus.OK)
  async getBanks() {
    return this.getBanksUseCase.execute()
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.updateProfileUseCase.execute(req.user.sub, body)
  }

  @Post('verify-bank')
  @HttpCode(HttpStatus.OK)
  async verifyBank(@Body() body: { accountNumber: string; bankCode: string }) {
    return this.verifyAccountUseCase.execute(body.accountNumber, body.bankCode)
  }

  @Patch('bank-info')
  @HttpCode(HttpStatus.OK)
  async updateBankInfo(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.updateBankInfoUseCase.execute(req.user.sub, body)
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.changePasswordUseCase.execute(req.user.sub, body)
  }

  @Post('avatar-url')
  @HttpCode(HttpStatus.OK)
  async getAvatarUrl(
    @Req() req: FastifyRequest,
    @Body() body: { contentType: string; filename: string },
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.getAvatarUrlUseCase.execute(req.user.sub, body.contentType, body.filename)
  }
}
