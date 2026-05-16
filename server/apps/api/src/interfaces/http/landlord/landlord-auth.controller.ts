import { Controller, Post, Body, UnauthorizedException, Res, Req, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { LandlordAuthService } from '../../../application/auth/landlord-auth.service';

@Controller('landlords/auth')
export class LandlordAuthController {
  constructor(private readonly authService: LandlordAuthService) {}

  @Post('login')
  async login(
    @Body() dto: { email: string; password?: string; otp?: string; type: 'PASSWORD' | 'OTP' },
    @Res({ passthrough: true }) res: Response,
  ) {
    let authResponse;
    if (dto.type === 'PASSWORD' && dto.password) {
      authResponse = await this.authService.login(dto.email, dto.password);
    } else if (dto.type === 'OTP' && dto.otp) {
      authResponse = await this.authService.otpLogin(dto.email, dto.otp);
    } else {
      throw new UnauthorizedException('Invalid login request');
    }

    this.setCookies(res, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Post('request-otp')
  async requestOTP(@Body() dto: { email: string }) {
    return this.authService.requestOTP(dto.email);
  }

  @Post('request-otp-signup')
  async requestOTPSignup(@Body() dto: { email: string }) {
    return this.authService.requestOTPSignup(dto.email);
  }

  @Post('verify-otp-signup')
  async verifyOTPSignup(@Body() dto: { email: string; otp: string }) {
    return this.authService.verifyOTP(dto.email, dto.otp, 'LANDLORD_SIGNUP');
  }

  @Post('signup')
  async signup(
    @Body() dto: { email: string; password: string; firstName: string; lastName: string; phone?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const authResponse = await this.authService.signup(dto);
    this.setCookies(res, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Post('check-existence')
  async checkExistence(@Body() dto: { email: string }) {
    return this.authService.checkExistence(dto.email);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['landlord_refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('No refresh token');

    const authResponse = await this.authService.refreshAccessToken(refreshToken);
    this.setCookies(res, authResponse.accessToken, authResponse.refreshToken);
    return authResponse;
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('landlord_access_token', { path: '/' });
    res.clearCookie('landlord_refresh_token', { path: '/' });
    return { success: true };
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('landlord_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('landlord_refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
