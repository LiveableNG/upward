import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPublicProfileUseCase {
  private readonly logger = new Logger(GetPublicProfileUseCase.name)

  constructor(private readonly prisma: PrismaService) {}

  async execute(slug: string) {
    this.logger.log(`Fetching public profile for slug: ${slug}`)

    const user = await this.prisma.upward_user.findUnique({
      where: { profileSlug: slug },
      select: {
        firstName: true,
        lastName: true,
        bio: true,
        createdAt: true,
        profilePic: true,
      },
    })

    if (!user) {
      return null
    }

    return user
  }
}
