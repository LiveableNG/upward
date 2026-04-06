import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPublicProfileUseCase {
  private readonly logger = new Logger(GetPublicProfileUseCase.name)

  constructor(private readonly prisma: PrismaService) {}

  async execute(slug: string) {
    this.logger.log(`Fetching public profile for slug: ${slug}`)

    const tenant = await this.prisma.upward_tenant.findUnique({
      where: { profileSlug: slug },
      select: {
        fullName: true,
        bio: true,
        creditScore: true,
        isProfileComplete: true,
        createdAt: true,
        reliabilityRank: true,
        onTimePercentage: true,
        earlyPaymentStreak: true,
        savingsImpact: true,
      },
    })

    if (!tenant) {
      return null
    }

    return tenant
  }
}
