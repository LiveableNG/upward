import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class UpdateSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    id: string,
    data: { name?: string; googleMeetLink?: string; startTime?: string; endTime?: string },
  ) {
    return this.prisma.upward_session.update({
      where: { id },
      data: {
        ...data,
        ...(data.startTime && { startTime: new Date(data.startTime) }),
        ...(data.endTime && { endTime: new Date(data.endTime) }),
      },
    })
  }
}
