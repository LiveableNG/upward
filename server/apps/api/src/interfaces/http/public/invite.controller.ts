import { Controller, Get, Post, Param, Body, BadRequestException, Res, HttpStatus } from '@nestjs/common'
import { UserAuthService } from '../../../application/auth/user-auth.service'
import { GetInviteDataUseCase } from '../../../application/use-cases/invite/get-invite-data.use-case'
import { RequestInviteOTPUseCase } from '../../../application/use-cases/invite/request-invite-otp.use-case'
import { AcceptInviteUseCase } from '../../../application/use-cases/invite/accept-invite.use-case'

interface FastifyReply {
  setCookie(name: string, value: string, options: Record<string, unknown>): FastifyReply
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply
  status(code: number): FastifyReply
  send(payload: unknown): void
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
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  })

  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

@Controller('public/invite')
export class InviteController {
  constructor(
    private readonly getInviteDataUseCase: GetInviteDataUseCase,
    private readonly requestInviteOTPUseCase: RequestInviteOTPUseCase,
    private readonly userAuthService: UserAuthService,
    private readonly acceptInviteUseCase: AcceptInviteUseCase,
  ) {}

  @Get(':token')
  async getInviteData(@Param('token') token: string) {
    return this.getInviteDataUseCase.execute(token)
  }

  @Post(':token/request-otp')
  async requestInviteOTP(
    @Param('token') token: string,
    @Body() body: { email?: string }
  ) {
    return this.requestInviteOTPUseCase.execute(token, body?.email)
  }

  @Post(':token/verify-otp')
  async verifyInviteOTP(
    @Param('token') token: string,
    @Body() body: { otp: string }
  ) {
    return this.getInviteDataUseCase.execute(token).then((data) => {
      if (!data.email) throw new BadRequestException('No email found for this invite')
      return this.userAuthService.verifyOTP(data.email, body.otp, 'INVITE', false)
    })
  }

  @Post(':token/accept')
  async acceptInvite(
    @Param('token') token: string,
    @Body() data: { password?: string; otp?: string; firstName?: string; lastName?: string; email?: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const result = await this.acceptInviteUseCase.execute({
      token,
      ...data,
    })

    setUserAuthCookies(reply, result.accessToken, result.refreshToken)

    reply.status(HttpStatus.OK).send({
      success: true,
      message: result.message,
      accessToken: result.accessToken,
      user: result.user,
    })
  }
}
