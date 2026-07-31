import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetEmailLogsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(query: {
    email?: string
    type?: string
    status?: string
    acquisition?: string
    channel?: string
    opened?: string
    date?: string
    page?: number
    limit?: number
  }) {
    const { email, type, status, acquisition, channel, opened, date, page = 1, limit = 10 } = query
    const skip = (page - 1) * limit
    const where: Prisma.upward_communication_logWhereInput = {
      ...(email ? { 
        OR: [
          { email: { contains: email, mode: 'insensitive' as const } },
          { recipient: { contains: email, mode: 'insensitive' as const } }
        ]
      } : {}),
      ...(date ? {
        createdAt: {
          gte: new Date(`${date}T00:00:00.000Z`),
          lte: new Date(`${date}T23:59:59.999Z`),
        }
      } : {}),
      ...(type && type !== 'All'
        ? type === 'CAMPAIGN'
          ? { type: { startsWith: 'CAMPAIGN' } }
          : { type }
        : {}),
      ...(status && status !== 'All' ? { status } : {}),
      ...(channel && channel !== 'All' ? { channel } : {}),
      ...(opened && opened !== 'All'
        ? opened === 'Opened'
          ? {
              OR: [
                { isOpened: true },
                { emailSequenceLog: { isOpened: true } },
              ],
            }
          : {
              OR: [
                {
                  AND: [
                    { emailSequenceLog: { is: null } },
                    { isOpened: false },
                  ],
                },
                {
                  AND: [
                    { emailSequenceLog: { isNot: null } },
                    { emailSequenceLog: { isOpened: false } },
                    { isOpened: false },
                  ],
                },
              ],
            }
        : {}),
      ...(acquisition && acquisition !== 'All'
        ? acquisition === 'waitlist_converted'
          ? { registeredUser: { isFromWaitlist: true } }
          : acquisition === 'invited'
            ? { registeredUser: { isFromInvite: true } }
            : acquisition === 'self_signup'
              ? { registeredUser: { isFromWaitlist: false, isFromInvite: false } }
              : {}
        : {}),
    }

    const [data, total] = await Promise.all([
      this.prisma.upward_communication_log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
          registeredUser: {
            select: { firstName: true, lastName: true, email: true },
          },
          emailSequenceLog: {
            select: { isOpened: true, openedAt: true, openCount: true },
          },
        },
      }),
      this.prisma.upward_communication_log.count({ where }),
    ])

    const decryptedData = data.map((log) => {
      const decryptedLog = {
        ...log,
        isOpened: log.isOpened || log.emailSequenceLog?.isOpened || false,
        openedAt: log.openedAt || log.emailSequenceLog?.openedAt || null,
        openCount: log.openCount || log.emailSequenceLog?.openCount || 0,
      }
      if (decryptedLog.body) {
        decryptedLog.body = decryptedLog.body.replace(/<img[^>]*email-tracking\/open[^>]*>/gi, '')
      }
      if (decryptedLog.registeredUser) {
        decryptedLog.registeredUser = {
          ...decryptedLog.registeredUser,
          firstName: this.encryption.decrypt(decryptedLog.registeredUser.firstName),
          lastName: this.encryption.decrypt(decryptedLog.registeredUser.lastName),
          email: this.encryption.decrypt(decryptedLog.registeredUser.email),
        }
      }
      return decryptedLog
    })

    return {
      data: decryptedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}
