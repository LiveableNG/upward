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
    page?: number
    limit?: number
  }) {
    const { email, type, status, acquisition, page = 1, limit = 10 } = query
    const skip = (page - 1) * limit
    const where: Prisma.upward_email_logWhereInput = {
      ...(email ? { email: { contains: email, mode: 'insensitive' as const } } : {}),
      ...(type && type !== 'All'
        ? type === 'CAMPAIGN'
          ? { type: { startsWith: 'CAMPAIGN' } }
          : { type }
        : {}),
      ...(status && status !== 'All' ? { status } : {}),
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
      this.prisma.upward_email_log.findMany({
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
        },
      }),
      this.prisma.upward_email_log.count({ where }),
    ])

    const decryptedData = data.map((log) => {
      const decryptedLog = { ...log }
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
