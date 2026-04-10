import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { JwtAuthGuard } from './jwt-auth.guard'

@Injectable()
export class AdminJwtAuthGuard extends JwtAuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context)
    if (!isAuthenticated) return false

    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
      throw new ForbiddenException('Admin access required')
    }

    return true
  }
}
