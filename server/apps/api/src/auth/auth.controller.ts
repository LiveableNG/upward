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
} from '@nestjs/common'
import { AuthService } from './auth.service'

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

const COOKIE_NAME = 'admin_refresh'

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  })
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.authService.login(body.email, body.password)
    setRefreshCookie(reply, refreshToken)
    reply.status(200).send(rest) // only send accessToken + user — never expose refresh token to JS
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) {
      throw new UnauthorizedException('No refresh token')
    }
    const { refreshToken, ...rest } = await this.authService.refreshAccessToken(token)
    setRefreshCookie(reply, refreshToken) // rotate cookie
    reply.status(200).send(rest)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: false }) reply: FastifyReply) {
    reply.clearCookie(COOKIE_NAME, { path: '/' })
    reply.status(200).send({ message: 'Logged out' })
  }

  @Get('ping')
  @HttpCode(HttpStatus.OK)
  async ping() {
    return { message: 'auth ok' }
  }
}
