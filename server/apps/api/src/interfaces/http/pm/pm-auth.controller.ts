import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
  Param,
} from '@nestjs/common'
import { PmAuthService } from '../../../application/auth/pm-auth.service'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'

interface FastifyReply {
  setCookie(name: string, value: string, options: Record<string, unknown>): FastifyReply
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply
  status(code: number): FastifyReply
  send(payload: unknown): void
}

interface FastifyRequest {
  cookies?: Record<string, string>
  user?: {
    sub: string
    email: string
    role: string
  }
}

const REFRESH_COOKIE_NAME = 'pm_refresh'
const ACCESS_COOKIE_NAME = 'pm_access_token'

function setPmAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']

  // Clear User/Pay cookies to ensure mutual exclusivity of active sessions
  const clearOptions = {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as any,
  }
  reply.clearCookie('user_refresh', clearOptions)
  reply.clearCookie('pay_access_token', clearOptions)

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
    maxAge: 7 * 24 * 60 * 60,
  })
}

function clearPmAuthCookies(reply: FastifyReply) {
  const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL']
  const options = {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as any,
  }

  reply.clearCookie(REFRESH_COOKIE_NAME, options)
  reply.clearCookie(ACCESS_COOKIE_NAME, options)
  reply.clearCookie('user_refresh', options)
  reply.clearCookie('pay_access_token', options)
}

@Controller('pm/auth')
export class PmAuthController {
  constructor(private readonly pmAuthService: PmAuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      pmType?: string;
      businessName?: string;
      phone?: string;
      country?: string;
      cacNumber?: string;
      personalEmail?: string;
      personalPhone?: string;
    },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.pmAuthService.signup(body)
    setPmAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.CREATED).send(rest)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.pmAuthService.login(body.email, body.password)
    setPmAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.OK).send(rest)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!token) {
      clearPmAuthCookies(reply)
      throw new UnauthorizedException('No refresh token')
    }

    try {
      const { refreshToken, ...rest } = await this.pmAuthService.refreshAccessToken(token)
      setPmAuthCookies(reply, rest.accessToken, refreshToken)
      reply.status(HttpStatus.OK).send(rest)
    } catch (err: any) {
      clearPmAuthCookies(reply)
      const status = err.status || HttpStatus.UNAUTHORIZED
      reply.status(status).send({
        statusCode: status,
        message: err.message || 'Session expired',
        timestamp: new Date().toISOString(),
      })
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME]
    if (refreshToken) {
      await this.pmAuthService.revokeSession(refreshToken)
    }

    clearPmAuthCookies(reply)
    reply.status(HttpStatus.OK).send({ message: 'Logged out' })
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: FastifyRequest) {
    if (!req.user?.sub) {
      throw new UnauthorizedException('No PM in request')
    }
    return this.pmAuthService.getProfile(req.user.sub)
  }

  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOTP(@Body() body: { email: string; context: 'SIGNUP' | 'LOGIN' }) {
    return this.pmAuthService.requestOTP(body.email, body.context)
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOTP(@Body() body: { email: string; otp: string; context: string }) {
    return this.pmAuthService.verifyOTP(body.email, body.otp, body.context)
  }

  @Post('otp-login')
  @HttpCode(HttpStatus.OK)
  async otpLogin(
    @Body() body: { email: string; otp: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.pmAuthService.otpLogin(body.email, body.otp)
    setPmAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.OK).send(rest)
  }

  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  async checkEmail(@Body() body: { email: string }) {
    return this.pmAuthService.checkEmail(body.email)
  }

  @Get('invite-details/:uuid')
  @HttpCode(HttpStatus.OK)
  async getInviteDetails(@Param('uuid') uuid: string) {
    return this.pmAuthService.getInviteDetails(uuid)
  }

  @Post('claim-account/:uuid')
  @HttpCode(HttpStatus.OK)
  async claimAccount(
    @Param('uuid') uuid: string, 
    @Body() body: { password: string; firstName?: string; lastName?: string }
  ) {
    return this.pmAuthService.claimAccount(uuid, body.password, body.firstName, body.lastName)
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: { email: string }) {
    await this.pmAuthService.forgotPassword(body.email)
    return { success: true, message: 'If the email exists, a reset code has been sent.' }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { email: string; otp: string; new: string }) {
    await this.pmAuthService.resetPassword(body.email, body.otp, body.new)
    return { success: true, message: 'Password reset successful' }
  }
  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  async verifyResetOTP(@Body() body: { email: string; otp: string }) {
    return this.pmAuthService.verifyResetOTP(body.email, body.otp)
  }
}
