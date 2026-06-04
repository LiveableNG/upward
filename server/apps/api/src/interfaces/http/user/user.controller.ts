import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { UserAuthService } from '../../../application/auth/user-auth.service'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { CompleteUserProfileUseCase } from '../../../application/use-cases/user/complete-user-profile.use-case'
import { CalculateRentScoreUseCase } from '../../../application/use-cases/user/calculate-rent-score.use-case'
import { GetAvatarUploadUrlUseCase } from '../../../application/use-cases/user/get-avatar-upload-url.use-case'
import { IngestPastRecordsUseCase } from '../../../application/use-cases/user/ingest-past-records.use-case'
import { RequestCredibilityRecordsUseCase } from '../../../application/use-cases/user/request-credibility-records.use-case'
import { GetCredibilityRequestsUseCase } from '../../../application/use-cases/user/get-credibility-requests.use-case'
import { GenerateKYCReportPdfUseCase } from '../../../application/use-cases/user/generate-kyc-report-pdf.use-case'
import { VerifyBvnUseCase } from '../../../application/use-cases/user/verify-bvn.use-case'

import { CheckSlugAvailabilityUseCase } from '../../../application/use-cases/user/check-slug-availability.use-case'
interface FastifyReply {
  setCookie(name: string, value: string, options: Record<string, unknown>): FastifyReply
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply
  status(code: number): FastifyReply
  send(payload: unknown): void
}

interface FastifyRequest {
  cookies?: Record<string, string>
  user?: {
    id: string
    email: string
    role: string
  }
}

const REFRESH_COOKIE_NAME = 'user_refresh'
const ACCESS_COOKIE_NAME = 'pay_access_token'

function setUserAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']

  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days (keep alive for middleware)
  })
}

function clearUserAuthCookies(reply: FastifyReply) {
  const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']
  const options = {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as any,
  }

  reply.clearCookie(REFRESH_COOKIE_NAME, options)
  reply.clearCookie(ACCESS_COOKIE_NAME, options)
}


@Controller('user/auth')
export class UserController {
  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly completeUserProfile: CompleteUserProfileUseCase,
    private readonly calculateRentScore: CalculateRentScoreUseCase,
    private readonly getAvatarUploadUrl: GetAvatarUploadUrlUseCase,
    private readonly ingestPastRecords: IngestPastRecordsUseCase,
    private readonly requestCredibilityRecords: RequestCredibilityRecordsUseCase,
    private readonly getCredibilityRequests: GetCredibilityRequestsUseCase,
    private readonly generateKYCPdf: GenerateKYCReportPdfUseCase,
    private readonly checkSlugAvailability: CheckSlugAvailabilityUseCase,
    private readonly verifyBvnUseCase: VerifyBvnUseCase,
  ) { }

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      rentEndDate?: string;
      address?: string;
      isFromWaitlist?: boolean;
      isFromInvite?: boolean;
      dateOfBirth?: string;
    },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.userAuthService.signup(body)
    setUserAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.CREATED).send(rest)
  }

  @Post('complete-profile')
  @HttpCode(HttpStatus.OK)
  async completeProfile(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Body() body: any,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.completeUserProfile.execute({
      email: body.email,
      passwordPlain: body.password,
      fullName: body.fullName || body.name,
      phone: body.phone,
      rentEndDate: body.rentEndDate,
      rentAmount: body.rentAmount,
      address: body.address,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      profilePic: body.profilePic,
    })
    setUserAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.OK).send(rest)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.userAuthService.login(body.email, body.password)
    setUserAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.OK).send(rest)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!token) {
      clearUserAuthCookies(reply)
      throw new UnauthorizedException('No refresh token')
    }

    try {
      const { refreshToken, ...rest } = await this.userAuthService.refreshAccessToken(token)
      setUserAuthCookies(reply, rest.accessToken, refreshToken)
      reply.status(HttpStatus.OK).send(rest)
    } catch (err) {
      clearUserAuthCookies(reply)
      throw err
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    if (refreshToken) {
      await this.userAuthService.revokeSession(refreshToken)
    }

    clearUserAuthCookies(reply)
    reply.status(HttpStatus.OK).send({ message: 'Logged out' })
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: FastifyRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException('No user in request')
    }
    return this.userAuthService.getProfile(req.user.id)
  }

  @Get('score-profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getScoreProfile(@Req() req: FastifyRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException('No user in request')
    }
    return this.calculateRentScore.execute(req.user.id)
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateProfile(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('No user in request')
    }
    const user = await this.userAuthService.updateProfile(req.user.id, body)
    return { success: true, user }
  }

  @Post('avatar-upload-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAvatarUploadUrlRequest(
    @Req() req: FastifyRequest,
    @Body() body: { contentType: string; filename: string },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('No user in request')
    }
    return this.getAvatarUploadUrl.execute(req.user.id, body.contentType, body.filename)
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: FastifyRequest, @Body() body: { current: string; new: string }) {
    if (!req.user?.id) {
      throw new UnauthorizedException('No user in request')
    }
    await this.userAuthService.changePassword(req.user.id, body.current, body.new)
    return { success: true, message: 'Password changed successfully' }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    await this.userAuthService.forgotPassword(body.email)
    return { success: true, message: 'If the email exists, a reset code has been sent.' }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { email: string; otp: string; new: string }) {
    await this.userAuthService.resetPassword(body.email, body.otp, body.new)
    return { success: true, message: 'Password reset successful' }
  }

  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  async checkEmail(@Body() body: { email: string }) {
    return this.userAuthService.checkEmail(body.email)
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOTP(@Body() body: { email: string; context: 'SIGNUP' | 'LOGIN' | 'INVITE' | 'PAYMENT' }) {
    return this.userAuthService.requestOTP(body.email, body.context)
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() body: { email: string; otp: string; context: string }) {
    return this.userAuthService.verifyOTP(body.email, body.otp, body.context)
  }

  @Post('otp-login')
  @HttpCode(HttpStatus.OK)
  async otpLogin(
    @Body() body: { email: string; otp: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const verification = await this.userAuthService.verifyOTP(body.email, body.otp, 'LOGIN')
    if (!verification.success) {
      throw new UnauthorizedException(verification.message)
    }

    const user = await this.userAuthService.findByEmail(body.email)
    if (!user) throw new UnauthorizedException('User not found')

    const { refreshToken, ...rest } = await this.userAuthService.generateFullAuthResponse(user)
    setUserAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.OK).send(rest)
  }

  @Post('verify-bvn')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyBvn(
    @Req() req: FastifyRequest,
    @Body() body: { bvn: string },
  ) {
    if (!req.user?.id) {
      throw new UnauthorizedException('No user in request')
    }
    return this.verifyBvnUseCase.execute(req.user.id, body.bvn)
  }

  @Post('past-records')

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async ingestRecords(
    @Req() req: FastifyRequest,
    @Body() body: { propertyUuid: string; records: any[] }
  ) {
    if (!req.user?.id) throw new UnauthorizedException('No user in request');
    return this.ingestPastRecords.execute(req.user.id, body);
  }

  @Post('request-records')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitRequestRecords(
    @Req() req: FastifyRequest,
    @Body() body: any
  ) {
    if (!req.user?.id) throw new UnauthorizedException('No user in request');
    return this.requestCredibilityRecords.execute(req.user.id, body);
  }

  @Get('credibility-requests')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async fetchCredibilityRequests(@Req() req: FastifyRequest) {
    if (!req.user?.id) throw new UnauthorizedException('No user in request');
    return this.getCredibilityRequests.execute(req.user.id);
  }

  @Get('credibility/pdf')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async downloadCredibilityPdf(
    @Req() req: FastifyRequest,
    @Res() reply: any
  ) {
    if (!req.user?.id) throw new UnauthorizedException('No user in request');
    const buffer = await this.generateKYCPdf.execute(req.user.id);
    
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename=Credibility_Report_${req.user.id}.pdf`)
      .send(buffer);
  }

  @Get('check-slug/:slug')
  @HttpCode(HttpStatus.OK)
  async checkSlug(@Req() req: any) {
    const slug = req.params.slug;
    return this.checkSlugAvailability.execute(slug);
  }
}
