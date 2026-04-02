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
          return req?.cookies?.['access_token'] || null
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-key'),
    })
  }

  async validate(payload: AdminJwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
    }
  }
}
