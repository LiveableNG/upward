import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

@Injectable()
export class BaseAuthService {
  constructor(
    protected readonly jwtService: JwtService,
    protected readonly configService: ConfigService,
  ) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }

  generateRefreshToken(
    payload: string | { sub: string; sid: string; [key: string]: any },
    secretKeyName: string = 'JWT_REFRESH_SECRET',
  ): string {
    const secret = this.configService.get<string>(secretKeyName, 'super-refresh-secret-key')
    const sub = typeof payload === 'string' ? payload : payload.sub
    const sid = typeof payload === 'object' ? payload.sid : undefined
    
    return this.jwtService.sign(
      { sub, sid, type: 'refresh' }, 
      { secret, expiresIn: '7d' }
    )
  }

  generateAccessToken(payload: any): string {
    // Shorter TTL for access tokens (15 minutes)
    return this.jwtService.sign(payload, { expiresIn: '15m' })
  }

  async verifyRefreshToken(
    token: string,
    secretKeyName: string = 'JWT_REFRESH_SECRET',
  ): Promise<{ sub: string; sid?: string; type: string }> {
    const secret = this.configService.get<string>(secretKeyName, 'super-refresh-secret-key')
    try {
      const decoded = this.jwtService.verify(token, { secret }) as { sub: string; sid?: string; type: string }
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type')
      }
      return decoded
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }
}
