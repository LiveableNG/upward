import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetWaitlistCountUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<number> {
    return this.prisma.upward_waitlist.count()
  }
}
