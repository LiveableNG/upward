import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class DeleteSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Delete attendances first
      await tx.upward_attendance.deleteMany({
        where: { sessionId: id },
      })
      // Delete the session
      return tx.upward_session.delete({
        where: { id },
      })
    })
  }
}
