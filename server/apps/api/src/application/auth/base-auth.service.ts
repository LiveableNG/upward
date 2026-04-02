import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class BaseAuthService {
  constructor(
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateRefreshToken(
    payload: string | { sub: string; [key: string]: any },
    secretKeyName: string = 'JWT_REFRESH_SECRET',
  ): string {
    const secret = this.configService.get<string>(secretKeyName, 'super-refresh-secret-key')
    const sub = typeof payload === 'string' ? payload : payload.sub
    return this.jwtService.sign({ sub, type: 'refresh' }, { secret, expiresIn: '7d' })
  }

  generateAccessToken(payload: Record<string, unknown>): string {
    return this.jwtService.sign(payload)
  }

  async verifyRefreshToken(
    token: string,
    secretKeyName: string = 'JWT_REFRESH_SECRET',
  ): Promise<{ sub: string; type: string }> {
    const secret = this.configService.get<string>(secretKeyName, 'super-refresh-secret-key')
    try {
      const decoded = this.jwtService.verify(token, { secret }) as { sub: string; type: string }
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type')
      }
      return decoded
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }
}
