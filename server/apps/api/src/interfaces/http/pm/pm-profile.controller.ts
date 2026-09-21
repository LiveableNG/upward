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
  ForbiddenException,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { UpdatePmProfileUseCase } from '../../../application/use-cases/pm/update-pm-profile.use-case'
import { UpdatePmBankInfoUseCase } from '../../../application/use-cases/pm/update-pm-bank-info.use-case'
import { ChangePmPasswordUseCase } from '../../../application/use-cases/pm/change-pm-password.use-case'
import { CurrentPmId } from '../../../application/auth/decorators/current-pm-actor.decorator'
import { SubmitPmVerificationUseCase } from '../../../application/pm/use-cases/verification/submit-pm-verification.use-case'
import { GetPmVerificationStatusUseCase } from '../../../application/pm/use-cases/verification/get-pm-verification-status.use-case'
import { GetPmAvatarUploadUrlUseCase } from '../../../application/use-cases/pm/get-pm-avatar-upload-url.use-case'
import { UploadPmAvatarUseCase } from '../../../application/use-cases/pm/upload-pm-avatar.use-case'
import { GetPmLetterheadUploadUrlUseCase } from '../../../application/use-cases/pm/get-pm-letterhead-upload-url.use-case'
import { UploadPmLetterheadUseCase } from '../../../application/use-cases/pm/upload-pm-letterhead.use-case'
import { VerifyAccountUseCase, GetBanksUseCase } from '../../../application/use-cases/payments/payment.use-cases'
import { PmEmployeeAuthService } from '../../../application/auth/pm-employee-auth.service'

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
    private readonly uploadAvatarUseCase: UploadPmAvatarUseCase,
    private readonly getLetterheadUrlUseCase: GetPmLetterheadUploadUrlUseCase,
    private readonly uploadLetterheadUseCase: UploadPmLetterheadUseCase,
    private readonly verifyAccountUseCase: VerifyAccountUseCase,
    private readonly getBanksUseCase: GetBanksUseCase,
    private readonly employeeAuthService: PmEmployeeAuthService,
    private readonly submitVerificationUseCase: SubmitPmVerificationUseCase,
    private readonly getVerificationStatusUseCase: GetPmVerificationStatusUseCase,
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
    if (req.user.role === 'PM_EMPLOYEE') {
      return this.employeeAuthService.updateProfile(req.user.sub, body)
    }
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
    if (req.user.role === 'PM_EMPLOYEE') {
      throw new ForbiddenException('Only account owners can manage payout bank information')
    }
    return this.updateBankInfoUseCase.execute(req.user.sub, body)
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.sub) throw new UnauthorizedException()
    if (req.user.role === 'PM_EMPLOYEE') {
      return this.employeeAuthService.changePassword(req.user.sub, body)
    }
    return this.changePasswordUseCase.execute(req.user.sub, body)
  }

  @Post('avatar-url')
  @HttpCode(HttpStatus.OK)
  async getAvatarUrl(
    @Req() req: FastifyRequest,
    @Body() body: { contentType: string; filename: string },
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()
    if (req.user.role === 'PM_EMPLOYEE') {
      return this.employeeAuthService.getAvatarUploadUrl(req.user.sub, body.contentType, body.filename)
    }
    return this.getAvatarUrlUseCase.execute(req.user.sub, body.contentType, body.filename)
  }

  @Post('avatar-upload')
  @HttpCode(HttpStatus.OK)
  async uploadAvatar(
    @Req() req: FastifyRequest,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()
    if (req.user.role === 'PM_EMPLOYEE') {
      return this.employeeAuthService.uploadAvatar(req.user.sub, body.base64Data, body.contentType)
    }
    return this.uploadAvatarUseCase.execute(req.user.sub, body.base64Data, body.contentType)
  }

  @Post('letterhead-url')
  @HttpCode(HttpStatus.OK)
  async getLetterheadUrl(
    @Req() req: FastifyRequest,
    @Body() body: { type: string; contentType: string; filename: string },
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.getLetterheadUrlUseCase.execute(req.user.sub, body.type as any, body.contentType, body.filename)
  }

  @Post('letterhead-upload')
  @HttpCode(HttpStatus.OK)
  async uploadLetterhead(
    @Req() req: FastifyRequest,
    @Body() body: { type: string; base64Data: string; contentType: string },
  ) {
    if (!req.user?.sub) throw new UnauthorizedException()
    return this.uploadLetterheadUseCase.execute(req.user.sub, body.type as any, body.base64Data, body.contentType)
  }

  @Post('verification')
  @HttpCode(HttpStatus.CREATED)
  async submitVerification(
    @CurrentPmId() pmId: number,
    @Body() body: any,
  ) {
    return this.submitVerificationUseCase.execute({
      pmId,
      idType: body.idType,
      idNumber: body.idNumber,
      idImage: body.idImage,
    })
  }

  @Get('verification')
  @HttpCode(HttpStatus.OK)
  async getVerificationStatus(@CurrentPmId() pmId: number) {
    return this.getVerificationStatusUseCase.execute(pmId)
  }
}
