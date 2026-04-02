import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class ResolveErrorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string) {
    return this.prisma.upward_error_log.update({
      where: { id },
      data: { resolved: true },
    })
  }
}
