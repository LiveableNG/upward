import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { WhatsappService } from '../../../shared/infrastructure/whatsapp/whatsapp.service'
import { GenerateReceiptPdfUseCase } from './payment.use-cases'
import { buildRentReceiptEmailHtml } from '../../../shared/infrastructure/email/email.helper'
import { ReceiptPdfData } from '../../../shared/infrastructure/common/receipt/receipt.service'

export function isDeliverableTenantEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return normalized.length > 0 && !normalized.endsWith('@upward.com')
}

function isDeliverablePhone(phone?: string | null): boolean {
  if (!phone) return false
  const normalized = phone.trim().toLowerCase()
  return normalized.length >= 10 && normalized !== 'null' && normalized !== 'undefined'
}

@Injectable()
export class SendRentReceiptEmailUseCase {
  private readonly logger = new Logger(SendRentReceiptEmailUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly generateReceiptPdf: GenerateReceiptPdfUseCase,
  ) {}

  async execute(params: {
    transactionId: number
    propertyId?: number
  }): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
    const tx = await this.prisma.upward_transaction.findUnique({
      where: { id: params.transactionId },
      include: {
        paymentRequest: true,
        user: true,
      },
    })

    if (!tx || tx.status !== 'SUCCESS') {
      return { emailSent: false, whatsappSent: false }
    }

    if (tx.settlementStatus === 'PENDING_REFUND') {
      this.logger.log(`Skipping receipt delivery for transaction ${tx.id} (pending refund)`)
      return { emailSent: false, whatsappSent: false }
    }

    if (tx.type !== 'RENT') {
      return { emailSent: false, whatsappSent: false }
    }

    const user = tx.user
    if (!user) {
      return { emailSent: false, whatsappSent: false }
    }

    const tenantEmail = this.encryption.decrypt(user.email)
    const tenantPhone = user.phone ? this.encryption.decrypt(user.phone) : null
    const hasEmail = isDeliverableTenantEmail(tenantEmail)
    const hasPhone = isDeliverablePhone(tenantPhone)

    if (!hasEmail && !hasPhone) {
      this.logger.log(`Skipping receipt delivery for transaction ${tx.id} (no deliverable email or phone)`)
      return { emailSent: false, whatsappSent: false }
    }

    const tenantFirstName = this.encryption.decrypt(user.firstName)
    const tenantLastName = this.encryption.decrypt(user.lastName)
    const tenantName = `${tenantFirstName} ${tenantLastName}`.trim() || 'Tenant'

    const propertyId = params.propertyId ?? tx.paymentRequest?.userPropertyId ?? undefined
    const branding = await this.resolveBranding(propertyId)

    const lineItems = this.extractLineItems(tx.lineItems)
    const rentAmount =
      lineItems.length > 0
        ? lineItems.reduce((sum, item) => sum + item.amount, 0)
        : tx.amount
    const receiptNumber = `RCP-${tx.reference.slice(-5).toUpperCase()}`
    const channel = tx.isManual ? 'Bank Transfer' : 'Paystack'
    const paymentStatus = await this.resolvePaymentStatus(tx.paymentRequestId)
    const propertyAddress = tx.propertyAddress || branding.propertyAddress || 'your property'
    const formattedAmount = `${tx.currency || 'NGN'} ${rentAmount.toLocaleString()}`
    const pdfFilename = `receipt-${receiptNumber.replace(/\//g, '-')}.pdf`

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

    let emailSent = false
    let whatsappSent = false

    if (hasEmail) {
      const html = buildRentReceiptEmailHtml({
        tenantName,
        amount: formattedAmount,
        propertyAddress,
        receiptNumber,
        receiptUrl,
        companyName: branding.companyName,
        logoUrl: branding.logoUrl,
      })

      const emailResult = await this.emailService.sendEmailWithRetry({
        userId: String(user.id),
        email: tenantEmail,
        subject: `Rent Payment Receipt — ${formattedAmount}`,
        html,
        type: 'RENT_RECEIPT',
        attachments: [
          {
            filename: pdfFilename,
            content: pdfBuffer,
          },
        ],
      })

      emailSent = !!emailResult.success
      if (emailSent) {
        this.logger.log(`Rent receipt email sent to ${tenantEmail} for transaction ${tx.id}`)
      } else {
        this.logger.error(`Failed to send rent receipt email to ${tenantEmail} for transaction ${tx.id}`)
      }
    }

    if (hasPhone && tenantPhone) {
      const waResult = await this.whatsappService.sendDocument({
        to: tenantPhone,
        filename: pdfFilename,
        content: pdfBuffer,
        caption: `Hi ${tenantFirstName || 'there'},\n\nYour rent payment of ${formattedAmount} for ${propertyAddress} was successful.\n\nReceipt No: ${receiptNumber}\n\nView online: ${receiptUrl}`,
      })

      whatsappSent = waResult.success
      if (whatsappSent) {
        this.logger.log(`Rent receipt WhatsApp sent to ${tenantPhone} for transaction ${tx.id}`)
      } else {
        this.logger.error(
          `Failed to send rent receipt WhatsApp to ${tenantPhone} for transaction ${tx.id}: ${waResult.error || 'unknown error'}`,
        )
      }
    }

    return { emailSent, whatsappSent }
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
