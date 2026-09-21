import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

export interface GetAdminLoginSessionsQuery {
  page?: string | number;
  limit?: string | number;
  search?: string;
  dateRange?: string; // today | 7d | 30d | all
  role?: string; // TENANT | PM | ALL
  device?: string; // mobile | desktop | all
  browser?: string;
  location?: string;
}

@Injectable()
export class GetAdminLoginSessionsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(query: GetAdminLoginSessionsQuery) {
    const pageNum = query.page ? Number(query.page) : 1;
    const limitNum = query.limit ? Number(query.limit) : 50;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    const andConditions: any[] = [];

    // 1. Time Range Filter
    if (query.dateRange && query.dateRange !== 'all') {
      const now = new Date();
      if (query.dateRange === 'today') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        andConditions.push({ createdAt: { gte: startOfToday } });
      } else if (query.dateRange === '7d') {
        andConditions.push({ createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
      } else if (query.dateRange === '30d') {
        andConditions.push({ createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
      }
    }

    // 2. Geolocation Filter
    if (query.location) {
      andConditions.push({
        OR: [
          { country: { contains: query.location, mode: 'insensitive' } },
          { city: { contains: query.location, mode: 'insensitive' } },
        ],
      });
    }

    // 3. Device / Platform Filter (User Agent heuristics)
    if (query.device && query.device !== 'all') {
      if (query.device === 'mobile') {
        andConditions.push({
          OR: [
            { userAgent: { contains: 'Capacitor', mode: 'insensitive' } },
            { userAgent: { contains: 'iPhone', mode: 'insensitive' } },
            { userAgent: { contains: 'Android', mode: 'insensitive' } },
          ],
        });
      } else if (query.device === 'desktop') {
        andConditions.push({
          NOT: {
            OR: [
              { userAgent: { contains: 'Capacitor', mode: 'insensitive' } },
              { userAgent: { contains: 'iPhone', mode: 'insensitive' } },
              { userAgent: { contains: 'Android', mode: 'insensitive' } },
            ],
          },
        });
      }
    }

    // 4. Browser Filter
    if (query.browser && query.browser !== 'all') {
      andConditions.push({ userAgent: { contains: query.browser, mode: 'insensitive' } });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // 5. Query data and count total
    const [sessions] = await Promise.all([
      this.prisma.upward_auth_session.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // 6. Map and Decrypt names / email for UI
    const mapped = sessions
      .map((s) => {
        let email = '';
        let firstName = '';
        let lastName = '';
        try {
          email = this.encryption.decrypt(s.user.email);
          firstName = this.encryption.decrypt(s.user.firstName);
          lastName = this.encryption.decrypt(s.user.lastName);
        } catch {
          email = s.user.email;
          firstName = s.user.firstName;
          lastName = s.user.lastName;
        }

        const isPmOrigin = s.user.isFromInvite; // quick heuristic for PM-invited tenants

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
        };
      })
      // 7. Apply search and role filters in-memory due to encryption
      .filter((s) => {
        if (query.role && query.role !== 'all') {
          if (query.role === 'PM' && s.userRole !== 'PM Tenant') return false;
          if (query.role === 'TENANT' && s.userRole !== 'Platform Tenant') return false;
        }
        if (query.search) {
          const q = query.search.toLowerCase();
          return (
            s.userName.toLowerCase().includes(q) ||
            s.userEmail.toLowerCase().includes(q) ||
            (s.ipAddress && s.ipAddress.includes(q))
          );
        }
        return true;
      });

    // Paginate manually after filtering
    const paginated = mapped.slice(skip, skip + limitNum);

    return {
      data: paginated,
      meta: {
        total: mapped.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(mapped.length / limitNum),
      },
    };
  }
}
