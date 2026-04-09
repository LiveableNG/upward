import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class ChangeUserSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: string, sessionId: string) {
    return this.prisma.upward_waitlist.update({
      where: { id: userId },
      data: { selectedSession: sessionId },
    })
  }
}
