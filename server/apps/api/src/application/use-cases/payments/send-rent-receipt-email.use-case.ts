import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { GenerateReceiptPdfUseCase } from './payment.use-cases'
import { buildRentReceiptEmailHtml } from '../../../shared/infrastructure/email/email.helper'
import { ReceiptPdfData } from '../../../shared/infrastructure/common/receipt/receipt.service'

export function isDeliverableTenantEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return normalized.length > 0 && !normalized.endsWith('@upward.com')
}

@Injectable()
export class SendRentReceiptEmailUseCase {
  private readonly logger = new Logger(SendRentReceiptEmailUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly generateReceiptPdf: GenerateReceiptPdfUseCase,
  ) {}

  async execute(params: { transactionId: number; propertyId?: number }): Promise<{ sent: boolean }> {
    const tx = await this.prisma.upward_transaction.findUnique({
      where: { id: params.transactionId },
      include: {
        paymentRequest: true,
        user: true,
      },
    })

    if (!tx || tx.status !== 'SUCCESS') {
      return { sent: false }
    }

    if (tx.settlementStatus === 'PENDING_REFUND') {
      this.logger.log(`Skipping receipt email for transaction ${tx.id} (pending refund)`)
      return { sent: false }
    }

    if (tx.type !== 'RENT') {
      return { sent: false }
    }

    const user = tx.user
    if (!user) {
      return { sent: false }
    }

    const tenantEmail = this.encryption.decrypt(user.email)
    if (!isDeliverableTenantEmail(tenantEmail)) {
      this.logger.log(`Skipping receipt email for transaction ${tx.id} (no deliverable email)`)
      return { sent: false }
    }

    const tenantFirstName = this.encryption.decrypt(user.firstName)
    const tenantLastName = this.encryption.decrypt(user.lastName)
    const tenantName = `${tenantFirstName} ${tenantLastName}`.trim() || 'Tenant'

    const propertyId = params.propertyId ?? tx.paymentRequest?.userPropertyId ?? undefined
    const branding = await this.resolveBranding(propertyId)

    const lineItems = this.extractLineItems(tx.lineItems)
    // Receipt shows rent paid only — exclude processing / benefits fees from the headline amount
    const rentAmount =
      lineItems.length > 0
        ? lineItems.reduce((sum, item) => sum + item.amount, 0)
        : tx.amount
    const receiptNumber = `RCP-${tx.reference.slice(-5).toUpperCase()}`
    const channel = tx.isManual ? 'Bank Transfer' : 'Paystack'
    const paymentStatus = await this.resolvePaymentStatus(tx.paymentRequestId)
    const propertyAddress = tx.propertyAddress || branding.propertyAddress || 'your property'

    const receiptData: ReceiptPdfData & {
      userPropertyId?: number
      companyName?: string
      managerName?: string
      logoUrl?: string
      brandName?: string
    } = {
      title: 'Rent Payment Receipt',
      receiptNumber,
      paidAt: tx.createdAt,
      tenantName,
      propertyAddress,
      propertyName: propertyAddress,
      paymentType: tx.paymentType || 'Rent Payment',
      amount: rentAmount,
      currency: tx.currency || 'NGN',
      reference: tx.reference,
      channel,
      type: 'RENT',
      status: paymentStatus,
      lineItems,
      userPropertyId: propertyId,
      companyName: branding.companyName,
      managerName: branding.managerName,
      logoUrl: branding.logoUrl,
      brandName: branding.companyName,
    }

    const pdfBuffer = await this.generateReceiptPdf.executeBuffer(receiptData)

    const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()
    const receiptUrl = `${baseUrl}/dashboard/receipts?id=${tx.uuid}`
    const formattedAmount = `${tx.currency || 'NGN'} ${rentAmount.toLocaleString()}`

    const html = buildRentReceiptEmailHtml({
      tenantName,
      amount: formattedAmount,
      propertyAddress,
      receiptNumber,
      receiptUrl,
      companyName: branding.companyName,
      logoUrl: branding.logoUrl,
    })

    await this.emailService.sendEmailWithRetry({
      userId: String(user.id),
      email: tenantEmail,
      subject: `Rent Payment Receipt — ${formattedAmount}`,
      html,
      type: 'RENT_RECEIPT',
      attachments: [
        {
          filename: `receipt-${receiptNumber.replace(/\//g, '-')}.pdf`,
          content: pdfBuffer,
        },
      ],
    })

    this.logger.log(`Rent receipt email sent to ${tenantEmail} for transaction ${tx.id}`)
    return { sent: true }
  }

  private async resolveBranding(propertyId?: number) {
    const fallback = {
      companyName: 'Upward',
      managerName: undefined as string | undefined,
      logoUrl: undefined as string | undefined,
      propertyAddress: undefined as string | undefined,
    }

    if (!propertyId) return fallback

    const property = await this.prisma.upward_user_property.findUnique({
      where: { id: propertyId },
      include: {
        location: true,
        company: true,
        manager: true,
        pm: {
          include: { emailSetting: true },
        },
      },
    })

    if (!property) return fallback

    const loc = property.location
    const propertyAddress = [loc?.address || loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ') || undefined

    let companyName = 'Upward'
    if (property.company?.name && property.company.name !== 'account_name') {
      companyName = property.company.name
    } else if (property.pm?.businessName) {
      companyName = this.encryption.decrypt(property.pm.businessName)
    } else if (property.manager) {
      const first = property.manager.firstName?.includes(':')
        ? this.encryption.decrypt(property.manager.firstName)
        : property.manager.firstName
      const last = property.manager.lastName?.includes(':')
        ? this.encryption.decrypt(property.manager.lastName)
        : property.manager.lastName
      if (first !== 'account_name' && last !== 'account_name') {
        companyName = `${first} ${last}`.trim()
      }
    }

    const logoUrl = property.pm?.emailSetting?.logoUrl || undefined
    const managerName = property.manager
      ? `${property.manager.firstName?.includes(':') ? this.encryption.decrypt(property.manager.firstName) : property.manager.firstName} ${property.manager.lastName?.includes(':') ? this.encryption.decrypt(property.manager.lastName) : property.manager.lastName}`.trim()
      : undefined

    return {
      companyName: logoUrl ? companyName : 'Upward',
      managerName,
      logoUrl,
      propertyAddress,
    }
  }

  private extractLineItems(raw: unknown): Array<{ label: string; amount: number }> {
    if (!raw || !Array.isArray(raw)) return []

    return raw
      .filter((item: any) => {
        const name = item.label || item.name || ''
        const isFee =
          item.category === 'Fee' ||
          ['Processing Fee', 'Upward Processing Fee', 'Upward & Provider Fee', 'Transaction Fee', 'Upward Benefits'].includes(name)
        return !isFee && name
      })
      .map((item: any) => ({
        label: item.label || item.name,
        amount: Number(item.amount || item.amountPaid || 0),
      }))
  }

  private async resolvePaymentStatus(paymentRequestId?: number | null): Promise<string> {
    if (!paymentRequestId) return 'PAID'

    const pr = await this.prisma.upward_payment_request.findUnique({
      where: { id: paymentRequestId },
      select: { status: true },
    })

    if (pr?.status === 'PARTIAL') return 'PARTIAL'
    return 'PAID'
  }
}
