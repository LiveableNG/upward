import { Inject, Injectable } from '@nestjs/common'
import {
  COMMERCE_REFUND_REPOSITORY,
  CommerceRefundRepository,
  CommerceDispute,
  DisputeStatus,
} from '../../../../domains/commerce/commerce-refund.repository'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'

export interface AdminGetCommerceDisputesFilter {
  status?: DisputeStatus
  skip?: number
  take?: number
}

@Injectable()
export class AdminGetCommerceDisputesUseCase {
  constructor(
    @Inject(COMMERCE_REFUND_REPOSITORY)
    private readonly refundRepo: CommerceRefundRepository,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(filter?: AdminGetCommerceDisputesFilter) {
    const skip = filter?.skip ? Number(filter.skip) : 0
    const take = filter?.take ? Number(filter.take) : 50

    // 1. Fetch post-purchase order disputes
    const disputesResult = await this.refundRepo.findDisputes({
      status: filter?.status,
      skip: 0,
      take: 1000,
    })

    // 2. Fetch pre-purchase commerce product inquiries
    const inquiryWhere: any = {
      message: { startsWith: '[Commerce Inquiry:' },
    }
    if (filter?.status) {
      if (filter.status === 'OPEN') {
        inquiryWhere.status = 'OPEN'
      } else {
        inquiryWhere.status = { not: 'OPEN' }
      }
    }

    const inquiryTickets = await this.prisma.upward_support_ticket.findMany({
      where: inquiryWhere,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    })

    const inquiryDisputes: CommerceDispute[] = inquiryTickets.map((ticket) => {
      const lines = ticket.message.split('\n')
      const titleMatch = lines[0]?.match(/\[Commerce Inquiry: (.*)\]/)
      const offeringTitle = titleMatch ? titleMatch[1]!.trim() : 'Offering Inquiry'
      const topicLine = lines.find((l: string) => l.startsWith('Topic: '))
      const topic = topicLine ? topicLine.replace('Topic: ', '').trim() : 'General Question'
      const vendorLine = lines.find((l: string) => l.startsWith('Vendor: '))
      const vendorName = vendorLine ? vendorLine.replace('Vendor: ', '').trim() : 'Upward Partner'

      const splitIndex = ticket.message.indexOf('\n\n')
      let userExplanation = splitIndex !== -1 ? ticket.message.substring(splitIndex + 2) : ticket.message

      let resolutionNotes: string | null = null
      let resolvedBy: string | null = null

      const resNotesMatch = ticket.message.match(/\[RESOLUTION_NOTES\]\n([\s\S]*?)(?=\n\[RESOLVED_BY\]|$)/)
      if (resNotesMatch) {
        resolutionNotes = resNotesMatch[1]!.trim()
      }
      const resByMatch = ticket.message.match(/\[RESOLVED_BY\]\n(.*)/)
      if (resByMatch) {
        resolvedBy = resByMatch[1]!.trim()
      }

      const resTagIndex = userExplanation.indexOf('\n\n[RESOLUTION_NOTES]')
      if (resTagIndex !== -1) {
        userExplanation = userExplanation.substring(0, resTagIndex).trim()
      }

      const tenantFirst = ticket.user?.firstName ? this.encryption.decrypt(ticket.user.firstName) : ''
      const tenantLast = ticket.user?.lastName ? this.encryption.decrypt(ticket.user.lastName) : ''
      const tenantName = `${tenantFirst} ${tenantLast}`.trim() || 'Tenant User'
      const tenantPhone = ticket.user?.phone ? this.encryption.decrypt(ticket.user.phone) : 'N/A'
      const tenantEmail = ticket.user?.email ? this.encryption.decrypt(ticket.user.email) : 'N/A'

      return {
        id: ticket.id,
        uuid: ticket.uuid,
        subOrderId: 0,
        userId: ticket.userId,
        status: ticket.status as DisputeStatus,
        reason: `[Inquiry] ${offeringTitle} (${topic})`,
        explanation: userExplanation,
        resolutionNotes: resolutionNotes || null,
        resolvedAt: ticket.resolvedAt || null,
        resolvedBy: resolvedBy || null,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        subOrder: {
          id: 0,
          uuid: ticket.uuid,
          subOrderNumber: `INQ-${ticket.id}`,
          customerStatus: 'INQUIRY_RECEIVED',
          operationalStatus: 'SUPPORT_REVIEW',
          subtotalKobo: '0',
          deliveryFeeKobo: '0',
          order: {
            id: 0,
            uuid: ticket.uuid,
            orderNumber: `INQ-${ticket.id}`,
            recipientName: tenantName,
            recipientPhone: tenantPhone,
            deliveryAddress: `Offering: ${offeringTitle} · Partner: ${vendorName} · ${tenantEmail}`,
          },
          vendor: {
            id: 0,
            name: vendorName,
          },
        },
      }
    })

    const combined = [...disputesResult.items, ...inquiryDisputes].sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
    )

    return {
      items: combined.slice(skip, skip + take),
      total: disputesResult.total + inquiryDisputes.length,
    }
  }
}

