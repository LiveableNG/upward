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
import { TenantAuthService } from '@application/auth/tenant-auth.service'
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard'
import { CompleteTenantProfileUseCase } from '@application/use-cases/tenant/complete-tenant-profile.use-case'
import { UpdateTenantProfileUseCase } from '@application/use-cases/tenant/update-tenant-profile.use-case'

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

const REFRESH_COOKIE_NAME = 'tenant_refresh'
const ACCESS_COOKIE_NAME = 'access_token'

function setTenantAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  // Refresh Token: Long-lived
  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  })

  // Access Token: Short-lived
  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600, // 1 hour
  })
}

@Controller('tenant/auth')
export class TenantController {
  constructor(
    private readonly tenantAuthService: TenantAuthService,
    private readonly completeTenantProfile: CompleteTenantProfileUseCase,
    private readonly updateTenantProfile: UpdateTenantProfileUseCase,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() body: { email: string; password: string; fullName: string; phone?: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.tenantAuthService.signup(body)
    setTenantAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.CREATED).send(rest)
  }

  @Post('complete-profile')
  @HttpCode(HttpStatus.OK)
  async completeProfile(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Body() body: any,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.completeTenantProfile.execute({
      email: body.email,
      passwordPlain: body.password,
      fullName: body.fullName || body.name,
      phone: body.phone,
      invitedByCompanyId: body.invitedByCompanyId,
      invitedByCompanyName: body.invitedByCompanyName,
      invitedByCompanyLogo: body.invitedByCompanyLogo,
      rentAnniversary: body.rentAnniversary,
      address: body.address,
      occupation: body.occupation,
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
    })
    setTenantAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.OK).send(rest)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.tenantAuthService.login(body.email, body.password)
    setTenantAuthCookies(reply, rest.accessToken, refreshToken)
    reply.status(HttpStatus.OK).send(rest)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!token) {
      throw new UnauthorizedException('No refresh token')
    }
    const { refreshToken, ...rest } = await this.tenantAuthService.refreshAccessToken(token)
    setTenantAuthCookies(reply, rest.accessToken, refreshToken)
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
    return this.tenantAuthService.getProfile(req.user.id)
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async updateProfile(@Req() req: FastifyRequest, @Body() body: any) {
    if (!req.user?.id) {
      throw new UnauthorizedException('No user in request')
    }
    const tenant = await this.updateTenantProfile.execute(req.user.id, body)
    return { success: true, tenant }
  }
}
