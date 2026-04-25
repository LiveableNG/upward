import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { AdminJwtPayload } from '@upward/shared-types'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req: any) => {
          if (!req?.cookies) return null
          const url = req.url || ''
          
          if (url.includes('/pm/')) {
            return req.cookies['pm_access_token'] || req.cookies['access_token'] || null
          }
          if (url.includes('/admin/')) {
            return req.cookies['admin_access_token'] || req.cookies['access_token'] || null
          }
          if (url.includes('/user/')) {
            return req.cookies['pay_access_token'] || req.cookies['access_token'] || null
          }

          return (
            req.cookies['pay_access_token'] ||
            req.cookies['pm_access_token'] ||
            req.cookies['admin_access_token'] ||
            req.cookies['access_token'] ||
            null
          )
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-key'),
    })
  }

  async validate(payload: AdminJwtPayload) {
    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
    }
  }
}
