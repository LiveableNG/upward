import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface ArmWebhookPayload {
  eventType?: string
  event?: string
  status?: string
  membershipId?: string
  CustomerMembershipId?: string
  customerMembershipId?: string
  crmAccountNumber?: string
  CrmAccountNumber?: string
  customerEmail?: string
  CustomerEmail?: string
  customerId?: string
  purchaseId?: string
  withdrawalId?: string
  data?: Record<string, any>
  [key: string]: unknown
}

@Injectable()
export class ProcessArmWebhookUseCase {
  private readonly logger = new Logger(ProcessArmWebhookUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(payload: ArmWebhookPayload) {
    const data = payload?.data || payload || {}
    const eventType = String(payload?.eventType || payload?.event || data?.eventType || 'UNKNOWN')
    const membershipId = String(
      data?.customerMembershipId ||
        data?.CustomerMembershipId ||
        data?.membershipId ||
        payload?.customerMembershipId ||
        payload?.CustomerMembershipId ||
        payload?.membershipId ||
        '',
    ).trim()
    const crmAccountNumber = String(
      data?.crmAccountNumber ||
        data?.CrmAccountNumber ||
        payload?.crmAccountNumber ||
        payload?.CrmAccountNumber ||
        '',
    ).trim()
    const customerEmail = String(
      data?.customerEmail || data?.CustomerEmail || payload?.customerEmail || '',
    )
      .trim()
      .toLowerCase()
    const customerId = String(data?.customerId || payload?.customerId || '').trim()

    this.logger.log(
      `Processing ARM Connect webhook [${eventType}] membershipId=${membershipId || 'n/a'} email=${customerEmail || 'n/a'}`,
    )

    let resolvedUserId: number | null = null
    if (customerEmail) {
      const emailHash = this.encryption.hash(customerEmail)
      const user = await this.prisma.upward_user.findUnique({
        where: { emailHash },
        select: { id: true },
      })
      resolvedUserId = user?.id ?? null
    }

    if (!resolvedUserId && (membershipId || customerId)) {
      const kyc = await this.prisma.upward_kyc_verification.findFirst({
        where: {
          armCustomerMembershipId: {
            in: [membershipId, customerId].filter(Boolean),
          },
        },
        select: { userId: true },
      })
      resolvedUserId = kyc?.userId ?? null
    }

    if (resolvedUserId) {
      const syncStatus = eventType.includes('APPROVED')
        ? 'APPROVED'
        : eventType.includes('REJECTED')
          ? 'REJECTED'
          : eventType.includes('PENDING')
            ? 'SUBMITTED'
            : undefined

      await this.prisma.upward_kyc_verification.updateMany({
        where: { userId: resolvedUserId },
        data: {
          ...(membershipId ? { armCustomerMembershipId: membershipId } : {}),
          ...(crmAccountNumber ? { armCrmAccountNumber: crmAccountNumber } : {}),
          ...(syncStatus ? { armSyncStatus: syncStatus } : {}),
          armCompletedSections: 63,
        },
      })

      await this.prisma.upward_rent_vault.updateMany({
        where: { userId: resolvedUserId },
        data: {
          ...(membershipId ? { providerMembershipId: membershipId } : {}),
          ...(crmAccountNumber ? { providerAccountNumber: crmAccountNumber } : {}),
          ...(syncStatus
            ? {
                providerCrmStatus:
                  syncStatus === 'APPROVED'
                    ? 'Approved'
                    : syncStatus === 'REJECTED'
                      ? 'Rejected'
                      : 'Submitted',
              }
            : {}),
        },
      })
    }

    return {
      status: 'success',
      received: true,
      eventType,
      membershipId: membershipId || null,
      crmAccountNumber: crmAccountNumber || null,
    }
  }
}
