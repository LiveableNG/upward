import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

export interface GetEmailClickTrackingQuery {
  page?: string
  limit?: string
  search?: string
  subject?: string
  startDate?: string
  endDate?: string
  clickedOnly?: string
  openedOnly?: string
  type?: string
}

@Injectable()
export class GetEmailClickTrackingStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetEmailClickTrackingQuery) {
    const pageNum = query.page ? parseInt(query.page, 10) : 1
    const limitNum = query.limit ? parseInt(query.limit, 10) : 25
    const skip = (pageNum - 1) * limitNum

    const baseConditions: any[] = [{ channel: 'EMAIL' }]

    if (query.search && query.search.trim()) {
      const s = query.search.trim()
      baseConditions.push({
        OR: [
          { email: { contains: s, mode: 'insensitive' } },
          { recipient: { contains: s, mode: 'insensitive' } },
          { subject: { contains: s, mode: 'insensitive' } },
          { type: { contains: s, mode: 'insensitive' } },
        ],
      })
    }

    if (query.subject && query.subject.trim()) {
      baseConditions.push({
        subject: { contains: query.subject.trim(), mode: 'insensitive' },
      })
    }

    if (query.type && query.type !== 'ALL' && query.type !== 'All') {
      baseConditions.push({ type: query.type })
    }

    if (query.startDate && query.startDate.trim()) {
      const start = new Date(query.startDate.trim())
      if (!isNaN(start.getTime())) {
        baseConditions.push({ createdAt: { gte: start } })
      }
    }

    if (query.endDate && query.endDate.trim()) {
      const end = new Date(query.endDate.trim())
      if (!isNaN(end.getTime())) {
        if (query.endDate.trim().length <= 10) {
          end.setHours(23, 59, 59, 999)
        }
        baseConditions.push({ createdAt: { lte: end } })
      }
    }

    const tableWhereConditions = [...baseConditions]

    if (query.openedOnly === 'true') {
      tableWhereConditions.push({ isOpened: true })
    }

    if (query.clickedOnly === 'true') {
      tableWhereConditions.push({
        emailLinks: {
          some: {
            clickCount: { gt: 0 },
          },
        },
      })
    }

    const baseWhere = { AND: baseConditions }
    const tableWhere = { AND: tableWhereConditions }

    const [total, logs, totalSent, totalOpenedCount, totalClickedCount, totalClicksResult] =
      await Promise.all([
        this.prisma.upward_communication_log.count({ where: tableWhere }),
        this.prisma.upward_communication_log.findMany({
          where: tableWhere,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          include: {
            emailLinks: {
              include: {
                clicks: {
                  orderBy: { clickedAt: 'desc' },
                },
              },
            },
          },
        }),
        this.prisma.upward_communication_log.count({ where: baseWhere }),
        this.prisma.upward_communication_log.count({
          where: { AND: [...baseConditions, { isOpened: true }] },
        }),
        this.prisma.upward_communication_log.count({
          where: {
            AND: [
              ...baseConditions,
              {
                emailLinks: {
                  some: {
                    clickCount: { gt: 0 },
                  },
                },
              },
            ],
          },
        }),
        (this.prisma as any).upward_email_link
          ? (this.prisma as any).upward_email_link.aggregate({
              _sum: { clickCount: true },
              where: { communicationLog: baseWhere },
            })
          : { _sum: { clickCount: 0 } },
      ])

    const totalClicks = totalClicksResult._sum?.clickCount || 0

    // Compute aggregated logs for response
    const formattedLogs = logs.map((log: any) => {
      const emailLinks = log.emailLinks || []
      let totalLogClicks = 0
      let firstClickedAt: Date | null = null
      let lastClickedAt: Date | null = null

      emailLinks.forEach((link: any) => {
        totalLogClicks += link.clickCount || 0

        if (link.firstClickedAt) {
          if (!firstClickedAt || new Date(link.firstClickedAt) < new Date(firstClickedAt)) {
            firstClickedAt = new Date(link.firstClickedAt)
          }
        }

        if (link.lastClickedAt) {
          if (!lastClickedAt || new Date(link.lastClickedAt) > new Date(lastClickedAt)) {
            lastClickedAt = new Date(link.lastClickedAt)
          }
        }
      })

      return {
        id: log.id,
        email: log.email || log.recipient,
        recipient: log.recipient || log.email,
        subject: log.subject,
        type: log.type,
        status: log.status,
        body: log.body,
        createdAt: log.createdAt,
        sentAt: log.sentAt || log.createdAt,
        isOpened: log.isOpened,
        openedAt: log.openedAt,
        openCount: log.openCount,
        userAgent: log.userAgent,
        isClicked: totalLogClicks > 0,
        firstClickedAt,
        lastClickedAt,
        clickCount: totalLogClicks,
        links: emailLinks.map((link: any) => ({
          id: link.id,
          originalUrl: link.originalUrl,
          clickCount: link.clickCount,
          firstClickedAt: link.firstClickedAt,
          lastClickedAt: link.lastClickedAt,
          clicks: (link.clicks || []).map((click: any) => ({
            id: click.id,
            clickedAt: click.clickedAt,
            ipAddress: click.ipAddress,
            userAgent: click.userAgent,
          })),
        })),
      }
    })

    const openRate = totalSent > 0 ? ((totalOpenedCount / totalSent) * 100).toFixed(1) : '0'
    const clickThroughRate = totalSent > 0 ? ((totalClickedCount / totalSent) * 100).toFixed(1) : '0'

    return {
      success: true,
      stats: {
        totalSent,
        totalOpened: totalOpenedCount,
        openRate: `${openRate}%`,
        clickThroughRate: `${clickThroughRate}%`,
        totalClicks,
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
      logs: formattedLogs,
    }
  }
}
