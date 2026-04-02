/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
    _status?: any,
  ) {
    if (err || !user) {
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException('No authorization token provided')
      }
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Authorization token has expired')
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid authorization token')
      }
      throw err || new UnauthorizedException(info?.message || 'Unauthorized')
    }
    return user
  }
}
