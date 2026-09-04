import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { WhatsappService } from '../../../shared/infrastructure/whatsapp/whatsapp.service'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'
import { GenerateReceiptPdfUseCase } from './payment.use-cases'

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
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute(params: {
    transactionId: number
    propertyId?: number
    overrideRecipientEmail?: string
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

    const rentStartDate = (tx as any).rentStartDate || tx.paymentRequest?.rentStartDate
    const rentEndDate = (tx as any).rentEndDate || tx.paymentRequest?.rentEndDate
    const tenancyPeriod = (rentStartDate && rentEndDate)
      ? `${new Date(rentStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(rentEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : undefined

    let totalInvoiceAmount: number | undefined = (tx as any).totalInvoiceAmount ?? undefined
    let totalPaidToDate: number | undefined = (tx as any).historicalPaidToDate ?? undefined
    let remainingBalance: number | undefined = (tx as any).remainingBalance ?? undefined
    let isPartial: boolean | undefined = (tx as any).isPartial ?? undefined

    if (totalInvoiceAmount === undefined && tx.paymentRequestId) {
      const pr = await this.prisma.upward_payment_request.findUnique({
        where: { id: tx.paymentRequestId },
      })
      if (pr) {
        const priorTxs = await this.prisma.upward_transaction.findMany({
          where: {
            paymentRequestId: pr.id,
            status: 'SUCCESS',
            createdAt: { lte: tx.createdAt },
          },
        })
        totalPaidToDate = priorTxs.reduce((sum, t) => sum + (t.amount || 0), 0) || tx.amount || pr.amountPaid || 0
        totalInvoiceAmount = pr.amount
        remainingBalance = Math.max(0, pr.amount - totalPaidToDate)
        isPartial = remainingBalance > 0
      }
    }

    const receiptData: ReceiptPdfData & {
      userPropertyId?: number
      companyName?: string
      managerName?: string
      logoUrl?: string
      brandName?: string
      themeColor?: string
      tenancyPeriod?: string
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
      status: isPartial ? 'PARTIAL' : paymentStatus,
      isPartial,
      totalInvoiceAmount,
      totalPaidToDate,
      remainingBalance,
      lineItems,
      userPropertyId: propertyId,
      companyName: branding.companyName,
      managerName: branding.managerName,
      logoUrl: branding.logoUrl,
      brandName: branding.companyName,
      themeColor: branding.themeColor,
      tenancyPeriod,
    }

    const pdfBuffer = await this.generateReceiptPdf.executeBuffer(receiptData)

    const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()
    const receiptUrl = `${baseUrl}/dashboard/receipts?id=${tx.uuid}`

    const success = await this.unifiedCommService.processCommunication({
      recipientEmail: params.overrideRecipientEmail || (hasEmail ? tenantEmail : undefined),
      recipientPhone: hasPhone ? tenantPhone || undefined : undefined,
      recipientName: tenantName,
      recipientRole: 'TENANT',
      registeredUserId: user.id,
      type: 'RENT_RECEIPT',
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
        },
      ],
      context: {
        tenantName,
        firstName: tenantFirstName,
        amount: formattedAmount,
        amountPaid: rentAmount,
        propertyAddress,
        receiptNumber,
        receiptUrl,
        companyName: branding.companyName,
        logoUrl: branding.logoUrl,
        tenancyPeriod,
        lineItems,
      },
    })

    return { emailSent: success, whatsappSent: success }
  }

  private async resolveBranding(propertyId?: number) {
    const fallback = {
      companyName: 'Upward',
      managerName: undefined as string | undefined,
      logoUrl: undefined as string | undefined,
      themeColor: undefined as string | undefined,
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
          include: { 
            emailSetting: true,
            receiptSetting: true 
          },
        },
      },
    }) as any

    if (!property) return fallback

    const loc = property.location
    const propertyAddress = [loc?.address || loc?.area, loc?.state, loc?.country].filter(Boolean).join(', ') || undefined

    let pm = property.pm
    if (!pm && property.pmUnitId) {
      const pmUnit = await this.prisma.upward_pm_unit.findUnique({
        where: { id: property.pmUnitId },
        include: {
          property: {
            include: {
              pm: {
                include: { emailSetting: true, receiptSetting: true }
              }
            }
          }
        }
      })
      pm = pmUnit?.property?.pm
    }

    let companyName = 'Upward'
    if (pm?.businessName) {
      const decrypted = pm.businessName.includes(':') ? this.encryption.decrypt(pm.businessName) : pm.businessName
      if (decrypted && decrypted !== 'account_name') {
        companyName = decrypted
      }
    } else if (property.company?.name && property.company.name !== 'account_name') {
      const decrypted = property.company.name.includes(':') ? this.encryption.decrypt(property.company.name) : property.company.name
      if (decrypted && decrypted !== 'account_name') {
        companyName = decrypted
      }
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

    let logoUrl = property.pm?.receiptSetting?.useEmailLogo === false 
      ? property.pm?.receiptSetting?.logoUrl 
      : property.pm?.emailSetting?.logoUrl

    if (!logoUrl && property.company?.logoUrl) {
      logoUrl = property.company.logoUrl
    }

    if (!logoUrl) logoUrl = undefined

    const themeColor = property.pm?.receiptSetting?.themeColor || '#B65B37'

    const managerName = property.manager
      ? `${property.manager.firstName?.includes(':') ? this.encryption.decrypt(property.manager.firstName) : property.manager.firstName} ${property.manager.lastName?.includes(':') ? this.encryption.decrypt(property.manager.lastName) : property.manager.lastName}`.trim()
      : undefined

    return {
      companyName: companyName || 'Upward',
      managerName,
      logoUrl,
      themeColor,
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
          ['Upward Benefits'].includes(name)
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
