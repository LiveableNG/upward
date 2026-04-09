import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetSystemEmailUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(slug: string) {
    return this.prisma.upward_system_email.findUnique({
      where: { slug },
    })
  }
}
