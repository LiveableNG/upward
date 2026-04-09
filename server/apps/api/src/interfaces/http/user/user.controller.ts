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
  const isProd = process.env['NODE_ENV'] === 'production'

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
    maxAge: 3600,
  })
}

@Controller('user/auth')
export class UserController {
  constructor(
    private readonly userAuthService: UserAuthService,
    private readonly completeUserProfile: CompleteUserProfileUseCase,
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
  async logout(@Res({ passthrough: false }) reply: FastifyReply) {
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
    reply.clearCookie(ACCESS_COOKIE_NAME, { path: '/' })
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
