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
const ACCESS_COOKIE_NAME = 'access_token'

function setUserAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']

  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    partitioned: isProd, // CHIPS support for cross-site mobile
  })

  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days (keep alive for middleware)
    partitioned: isProd,
  })
}

@Controller('user/auth')
export class UserController {
  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly completeUserProfile: CompleteUserProfileUseCase,
    private readonly calculateRentScore: CalculateRentScoreUseCase,
    private readonly getAvatarUploadUrl: GetAvatarUploadUrlUseCase,
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
      address: body.address,
      occupation: body.occupation,
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
      throw new UnauthorizedException('No refresh token')
    }
    const { refreshToken, ...rest } = await this.userAuthService.refreshAccessToken(token)
    setUserAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.OK).send(rest)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    if (refreshToken) {
      await this.userAuthService.revokeSession(refreshToken)
    }

    const options = {
      path: '/',
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as any,
      partitioned: isProd,
    }

    reply.clearCookie(REFRESH_COOKIE_NAME, options)
    reply.clearCookie(ACCESS_COOKIE_NAME, options)
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
}
