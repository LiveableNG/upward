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
} from '@nestjs/common'
import { AdminAuthService } from '../../../application/auth/admin-auth.service'
import { AdminLogService } from '../../../shared/infrastructure/admin-log/admin-log.service'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { AdminRole } from '@upward/shared-types'

// Fastify request/reply types (lightweight inline)
interface FastifyReply {
  setCookie(name: string, value: string, options: Record<string, unknown>): FastifyReply
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply
  status(code: number): FastifyReply
  send(payload: unknown): void
}

interface FastifyRequest {
  cookies?: Record<string, string>
}

interface AuthenticatedRequest {
  user: {
    id: string
    email: string
    role: AdminRole
  }
  headers: Record<string, string>
  ip: string
}

const REFRESH_COOKIE_NAME = 'admin_refresh'
const ACCESS_COOKIE_NAME = 'access_token'

function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const isProd = process.env['NODE_ENV'] === 'production'

  // Refresh Token: Long-lived
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
    maxAge: 3600, // 1 hour in seconds
  })
}

@Controller('admin/auth')
export class AdminAuthController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly adminLogService: AdminLogService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: false }) reply: FastifyReply,
    @Req() req: AuthenticatedRequest,
  ) {
    const { refreshToken, ...rest } = await this.adminAuthService.login(body.email, body.password)

    // Log login
    await this.adminLogService.logAction(
      rest.user.id,
      'LOGIN',
      `Admin logged in: ${rest.user.email}`,
      req.ip,
      req.headers['user-agent'],
    )

    setAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(200).send(rest)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!token) {
      throw new UnauthorizedException('No refresh token')
    }
    const { refreshToken, ...rest } = await this.adminAuthService.refreshAccessToken(token)
    setAuthCookies(reply, rest.accessToken, refreshToken) // rotate cookies
    reply.status(200).send(rest)
  }

  @Post('logout')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    await this.adminLogService.logAction(
      req.user.id,
      'LOGOUT',
      `Admin logged out: ${req.user.email}`,
      req.ip,
      req.headers['user-agent'],
    )

    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' })
    reply.clearCookie(ACCESS_COOKIE_NAME, { path: '/' })
    reply.status(200).send({ message: 'Logged out' })
  }

  @Get('ping')
  @HttpCode(HttpStatus.OK)
  async ping() {
    return { message: 'auth ok' }
  }
}
