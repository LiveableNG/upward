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
} from '@nestjs/common';
import { PmEmployeeAuthService } from '../../../application/auth/pm-employee-auth.service';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';

interface FastifyReply {
  setCookie(name: string, value: string, options: Record<string, unknown>): FastifyReply;
  clearCookie(name: string, options?: Record<string, unknown>): FastifyReply;
  status(code: number): FastifyReply;
  send(payload: unknown): void;
}

interface FastifyRequest {
  cookies?: Record<string, string>;
  user?: {
    sub: string;
    email: string;
    role: string;
    ownerPmId?: number;
    employeeId?: number;
  };
}

const REFRESH_COOKIE_NAME = 'pm_refresh';
const ACCESS_COOKIE_NAME = 'pm_access_token';

function setEmployeeAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL'];

  const clearOptions = {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as any,
  };
  reply.clearCookie('user_refresh', clearOptions);
  reply.clearCookie('pay_access_token', clearOptions);

  reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

function clearEmployeeAuthCookies(reply: FastifyReply) {
  const isProd = process.env['NODE_ENV'] === 'production' || !!process.env['VERCEL'];
  const options = {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as any,
  };

  reply.clearCookie(REFRESH_COOKIE_NAME, options);
  reply.clearCookie(ACCESS_COOKIE_NAME, options);
}

@Controller('pm/employee/auth')
export class PmEmployeeAuthController {
  constructor(private readonly employeeAuthService: PmEmployeeAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.employeeAuthService.login(body.email, body.password);
    setEmployeeAuthCookies(reply, rest.accessToken, refreshToken);
    reply.status(HttpStatus.OK).send(rest);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) {
      clearEmployeeAuthCookies(reply);
      throw new UnauthorizedException('No refresh token');
    }

    try {
      const { refreshToken, ...rest } = await this.employeeAuthService.refreshAccessToken(token);
      setEmployeeAuthCookies(reply, rest.accessToken, refreshToken);
      reply.status(HttpStatus.OK).send(rest);
    } catch (err: any) {
      clearEmployeeAuthCookies(reply);
      const status = err.status || HttpStatus.UNAUTHORIZED;
      reply.status(status).send({
        statusCode: status,
        message: err.message || 'Session expired',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: false }) reply: FastifyReply) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      await this.employeeAuthService.revokeSession(refreshToken);
    }

    clearEmployeeAuthCookies(reply);
    reply.status(HttpStatus.OK).send({ message: 'Logged out' });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: FastifyRequest) {
    if (!req.user?.sub) {
      throw new UnauthorizedException('No employee in request');
    }
    return this.employeeAuthService.getProfile(req.user.sub);
  }

  @Get('invite-details/:uuid')
  @HttpCode(HttpStatus.OK)
  async getInviteDetails(@Param('uuid') uuid: string) {
    return this.employeeAuthService.getInviteDetails(uuid);
  }

  @Post('accept-invite/:uuid')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Param('uuid') uuid: string,
    @Body() body: { password: string; firstName?: string; lastName?: string; phone?: string },
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const { refreshToken, ...rest } = await this.employeeAuthService.acceptInvite(uuid, body);
    setEmployeeAuthCookies(reply, rest.accessToken, refreshToken);
    reply.status(HttpStatus.OK).send(rest);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    await this.employeeAuthService.forgotPassword(email);
    return { success: true, message: 'If an account exists, a reset code has been sent.' };
  }

  @Post('verify-reset-otp')
  @HttpCode(HttpStatus.OK)
  async verifyResetOTP(@Body() body: { email: string; otp: string }) {
    return this.employeeAuthService.verifyResetOTP(body.email, body.otp);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { email: string; otp: string; newPlain: string }) {
    await this.employeeAuthService.resetPassword(body.email, body.otp, body.newPlain);
    return { success: true, message: 'Password reset successfully' };
  }
}
