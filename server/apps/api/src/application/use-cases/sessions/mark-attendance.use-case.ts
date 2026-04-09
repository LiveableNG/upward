import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class MarkAttendanceUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(sessionId: string, userId: string, attended: boolean) {
    return this.prisma.upward_attendance.upsert({
      where: {
        sessionId_userId: { sessionId, userId },
      },
      update: { attended },
      create: { sessionId, userId, attended },
    })
  }
}
