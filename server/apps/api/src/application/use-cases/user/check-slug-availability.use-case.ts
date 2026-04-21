import { Injectable, Inject } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class CheckSlugAvailabilityUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string) {
    if (!slug || slug.length < 3) {
      return { available: false, suggestions: [], reason: 'Too short' }
    }

    const existing = await this.prisma.upward_user.findFirst({
      where: { profileSlug: slug },
      select: { id: true }
    })

    if (!existing) {
      return { available: true, suggestions: [] }
    }

    // Generate suggestions
    const suggestions = []
    const randomNums = [
      Math.floor(100 + Math.random() * 899),
      Math.floor(2025 + Math.random() * 5),
      Math.floor(10 + Math.random() * 89),
    ]

    for (const num of randomNums) {
      const candidate = `${slug}-${num}`
      const collision = await this.prisma.upward_user.findFirst({
        where: { profileSlug: candidate },
        select: { id: true }
      })
      if (!collision) {
        suggestions.push(candidate)
      }
    }

    return { 
      available: false, 
      suggestions, 
      reason: 'Already taken' 
    }
  }
}
