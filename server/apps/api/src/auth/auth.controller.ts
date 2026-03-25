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
import { AuthService } from './auth.service'
import { AdminLogService } from '../admin-log/admin-log.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
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
  headers: Record<string, string | string[] | undefined>
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

const COOKIE_NAME = 'admin_refresh'

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  })
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminLogService: AdminLogService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: false }) reply: FastifyReply,
    @Req() req: AuthenticatedRequest,
  ) {
    const { refreshToken, ...rest } = await this.authService.login(body.email, body.password)

    // Log login
    await this.adminLogService.logAction(
      rest.user.id,
      'LOGIN',
      `Admin logged in: ${rest.user.email}`,
      req.ip,
      req.headers['user-agent'],
    )

    setRefreshCookie(reply, refreshToken)
    reply.status(200).send(rest) // only send accessToken + user — never expose refresh token to JS
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) {
      console.warn('[refresh] No refresh token found in cookies. Headers:', req.headers['cookie'])
      throw new UnauthorizedException('No refresh token')
    }
    const { refreshToken, ...rest } = await this.authService.refreshAccessToken(token)
    setRefreshCookie(reply, refreshToken) // rotate cookie
    reply.status(200).send(rest)
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    // Log logout
    await this.adminLogService.logAction(
      req.user.id,
      'LOGOUT',
      `Admin logged out: ${req.user.email}`,
      req.ip,
      req.headers['user-agent'],
    )

    reply.clearCookie(COOKIE_NAME, { path: '/' })
    reply.status(200).send({ message: 'Logged out' })
  }

  @Get('ping')
  @HttpCode(HttpStatus.OK)
  async ping() {
    return { message: 'auth ok' }
  }
}
