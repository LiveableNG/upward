import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthResponse } from '@upward/shared-types'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }): Promise<AuthResponse> {
    return this.authService.login(body.email, body.password)
  }

  @Get('ping')
  @HttpCode(HttpStatus.OK)
  async ping() {
    return { message: 'auth ok' }
  }
}
