/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common'
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

    if (user.isBlocked) {
      const request = _context.switchToHttp().getRequest()
      const url = request.url || ''
      const path = url.split('?')[0]

      const isExempt =
        path.endsWith('/pm/auth/me') ||
        path.endsWith('/pm/auth/logout') ||
        path.endsWith('/pm/auth/refresh') ||
        path.endsWith('/pm/subscription') ||
        path.endsWith('/pm/wallet') ||
        path.endsWith('/pm/wallet/top-up') ||
        path.includes('/pm/subscription/wallet/dva') ||
        path.endsWith('/pm/subscription/select-tier') ||
        path.endsWith('/pm/wallet/transactions')

      if (!isExempt) {
        throw new ForbiddenException('REVOKED_ACCESS')
      }
    }

    return user
  }
}
