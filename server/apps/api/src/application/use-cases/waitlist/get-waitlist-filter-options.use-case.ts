import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetWaitlistFilterOptionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    const [roles, countries, cities, sessions] = await Promise.all([
      this.prisma.upward_waitlist.findMany({
        distinct: ['role'],
        select: { role: true },
        where: { role: { not: null } },
      }),
      this.prisma.upward_waitlist.findMany({
        distinct: ['country'],
        select: { country: true },
        where: { country: { not: null } },
      }),
      this.prisma.upward_waitlist.findMany({
        distinct: ['country', 'city'],
        select: { country: true, city: true },
        where: { city: { not: null } },
      }),
      this.prisma.upward_session.findMany({
        select: { id: true, name: true },
      }),
    ])

    return {
      roles: roles.map((r) => r.role),
      countries: countries.map((c) => c.country),
      cities: cities.map((c) => ({ country: c.country, city: c.city })),
      sessions: sessions.map((s) => ({ id: s.id, name: s.name })),
    }
  }
}
