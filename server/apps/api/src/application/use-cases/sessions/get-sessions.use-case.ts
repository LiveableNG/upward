import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetSessionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    // 1. Fetch all existing sessions
    const allSessions = await this.prisma.upward_session.findMany({
      orderBy: { startTime: 'asc' },
    })

    // 2. Map and include attendees for each session
    const regularResults = await Promise.all(
      allSessions.map(async (session) => {
        const attendees = await this.prisma.upward_waitlist.findMany({
          where: { selectedSession: session.name },
          include: {
            attendances: {
              where: { sessionId: session.id },
            },
          },
        })

        return {
          ...session,
          attendances: attendees.map((user) => ({
            userId: user.id,
            user,
            attended: user.attendances.length > 0 ? user.attendances[0]?.attended : false,
          })),
        }
      }),
    )

    // 3. Synthesize the "None" session
    const noneAttendees = await this.prisma.upward_waitlist.findMany({
      where: {
        OR: [{ selectedSession: null }, { selectedSession: '' }, { selectedSession: 'NONE' }],
      },
    })

    const noneSession = {
      id: 'none',
      name: 'None (Unscheduled)',
      googleMeetLink: '',
      startTime: new Date(0).toISOString(),
      endTime: new Date(0).toISOString(),
      isVirtual: true,
      attendances: noneAttendees.map((user) => ({
        userId: user.id,
        user,
        attended: false,
      })),
    }

    return [noneSession, ...regularResults]
  }
}
