import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Controller('admin/login-sessions')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class AdminLoginSessionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Get()
  @Roles(AdminRole.SUPERADMIN, AdminRole.ADMIN)
  async getLoginSessions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('dateRange') dateRange?: string, // today | 7d | 30d | all
    @Query('role') roleFilter?: string, // TENANT | PM | ALL
    @Query('device') deviceFilter?: string, // mobile | desktop | all
    @Query('browser') browserFilter?: string,
    @Query('location') locationFilter?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1
    const limitNum = limit ? parseInt(limit) : 50
    const skip = (pageNum - 1) * limitNum

    const where: any = {}
    const andConditions: any[] = []

    // 1. Time Range Filter
    if (dateRange && dateRange !== 'all') {
      const now = new Date()
      if (dateRange === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        andConditions.push({ createdAt: { gte: startOfToday } })
      } else if (dateRange === '7d') {
        andConditions.push({ createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
      } else if (dateRange === '30d') {
        andConditions.push({ createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } })
      }
    }

    // 2. Geolocation Filter
    if (locationFilter) {
      andConditions.push({
        OR: [
          { country: { contains: locationFilter, mode: 'insensitive' } },
          { city: { contains: locationFilter, mode: 'insensitive' } },
        ],
      })
    }

    // 3. Device / Platform Filter (User Agent heuristics)
    if (deviceFilter && deviceFilter !== 'all') {
      if (deviceFilter === 'mobile') {
        andConditions.push({
          OR: [
            { userAgent: { contains: 'Capacitor', mode: 'insensitive' } },
            { userAgent: { contains: 'iPhone', mode: 'insensitive' } },
            { userAgent: { contains: 'Android', mode: 'insensitive' } },
          ],
        })
      } else if (deviceFilter === 'desktop') {
        andConditions.push({
          NOT: {
            OR: [
              { userAgent: { contains: 'Capacitor', mode: 'insensitive' } },
              { userAgent: { contains: 'iPhone', mode: 'insensitive' } },
              { userAgent: { contains: 'Android', mode: 'insensitive' } },
            ],
          },
        })
      }
    }

    // 4. Browser Filter
    if (browserFilter && browserFilter !== 'all') {
      andConditions.push({ userAgent: { contains: browserFilter, mode: 'insensitive' } })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    // 5. Query data and count total
    const [sessions, total] = await Promise.all([
      this.prisma.upward_auth_session.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upward_auth_session.count({ where }),
    ])

    // 6. Map and Decrypt names / email for UI
    const mapped = sessions
      .map((s) => {
        let email = ''
        let firstName = ''
        let lastName = ''
        try {
          email = this.encryption.decrypt(s.user.email)
          firstName = this.encryption.decrypt(s.user.firstName)
          lastName = this.encryption.decrypt(s.user.lastName)
        } catch {
          email = s.user.email
          firstName = s.user.firstName
          lastName = s.user.lastName
        }

        const isPmOrigin = s.user.isFromInvite // quick heuristic for PM-invited tenants

        return {
          id: s.id,
          userId: s.userId,
          userUuid: s.user.uuid,
          userName: `${firstName} ${lastName}`.trim(),
          userEmail: email,
          userRole: isPmOrigin ? 'PM Tenant' : 'Platform Tenant',
          userAgent: s.userAgent,
          ipAddress: s.ipAddress,
          deviceId: s.deviceId,
          isRevoked: s.isRevoked,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          country: s.country || 'Unknown',
          city: s.city || 'Unknown',
        }
      })
      // 7. Apply search and role filters in-memory due to encryption
      .filter((s) => {
        if (roleFilter && roleFilter !== 'all') {
          if (roleFilter === 'PM' && s.userRole !== 'PM Tenant') return false
          if (roleFilter === 'TENANT' && s.userRole !== 'Platform Tenant') return false
        }
        if (search) {
          const q = search.toLowerCase()
          return (
            s.userName.toLowerCase().includes(q) ||
            s.userEmail.toLowerCase().includes(q) ||
            (s.ipAddress && s.ipAddress.includes(q))
          )
        }
        return true
      })

    // Paginate manually after filtering
    const paginated = mapped.slice(skip, skip + limitNum)

    return {
      data: paginated,
      meta: {
        total: mapped.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(mapped.length / limitNum),
      },
    }
  }
}
