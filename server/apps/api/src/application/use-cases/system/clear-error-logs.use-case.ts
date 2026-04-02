import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class ClearErrorLogsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.upward_error_log.deleteMany({
      where: { resolved: true },
    })
  }
}
