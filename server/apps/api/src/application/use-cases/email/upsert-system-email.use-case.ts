import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class UpsertSystemEmailUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    slug: string,
    payload: { subject: string; htmlContent: string; textContent?: string },
  ) {
    return this.prisma.upward_system_email.upsert({
      where: { slug },
      update: { ...payload },
      create: { slug, ...payload },
    })
  }
}
