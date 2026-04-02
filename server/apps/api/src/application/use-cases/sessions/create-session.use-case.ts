import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class CreateSessionUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(data: {
    name: string
    googleMeetLink: string
    startTime: string
    endTime: string
  }) {
    return this.prisma.upward_session.create({
      data: {
        name: data.name,
        googleMeetLink: data.googleMeetLink,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    })
  }
}
