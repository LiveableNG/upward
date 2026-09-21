import { Injectable, BadRequestException } from '@nestjs/common'
import {
  ReceiptService,
  ReceiptPdfData,
} from '../../../shared/infrastructure/common/receipt/receipt.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GenerateReceiptPdfUseCase {
  constructor(
    private readonly receiptService: ReceiptService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) { }

  async execute(data: ReceiptPdfData & { userPropertyId?: number; companyName?: string; managerName?: string }): Promise<string> {
    const buffer = await this.executeBuffer(data)
    const base64 = buffer.toString('base64')
    return `data:application/pdf;base64,${base64}`
  }

  async executeBuffer(
    data: ReceiptPdfData & { userPropertyId?: number; companyName?: string; managerName?: string },
  ): Promise<Buffer> {
    const enriched: any = { ...data }
    if (enriched.paidAt && typeof enriched.paidAt === 'string') {
      enriched.paidAt = new Date(enriched.paidAt)
    }

    const txWithBranding = enriched.reference
      ? await this.prisma.upward_transaction.findFirst({
          where: { reference: enriched.reference },
          include: {
            paymentRequest: {
              include: {
                pmPaymentRequests: {
                  include: {
                    pm: {
                      include: {
                        emailSetting: true,
                        receiptSetting: true,
                      }
                    }
                  },
                  take: 1,
                },
                userProperty: {
                  include: {
                    location: true,
                    company: true,
                    manager: true,
                  }
                }
              }
            }
          }
        })
      : null

    if (txWithBranding && txWithBranding.settlementStatus === 'PENDING_REFUND') {
      throw new BadRequestException('Receipt cannot be generated for payments pending review or refund')
    }

    const prop = (txWithBranding?.paymentRequest?.userProperty as any)
      || (enriched.userPropertyId
          ? await this.prisma.upward_user_property.findUnique({
              where: { id: Number(enriched.userPropertyId) },
              include: {
                location: true,
                company: true,
                manager: true,
              }
            })
          : null) as any

    const snapshotStart = (txWithBranding as any)?.rentStartDate || txWithBranding?.paymentRequest?.rentStartDate || prop?.rentStartDate
    const snapshotEnd = (txWithBranding as any)?.rentEndDate || txWithBranding?.paymentRequest?.rentEndDate || prop?.rentEndDate

    if (snapshotStart && snapshotEnd) {
      enriched.rentStartDate = snapshotStart
      enriched.rentEndDate = snapshotEnd
      enriched.tenancyPeriod = `${new Date(snapshotStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(snapshotEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    }

    const hasSnapshotAmounts = (txWithBranding as any)?.totalInvoiceAmount !== null && (txWithBranding as any)?.totalInvoiceAmount !== undefined

    if (hasSnapshotAmounts) {
      const snapTx = txWithBranding as any
      enriched.totalInvoiceAmount = snapTx.totalInvoiceAmount
      const rawLineItems = (txWithBranding as any)?.lineItems || (txWithBranding as any)?.paymentRequest?.lineItemRecords || []
      const rentItem = Array.isArray(rawLineItems) ? rawLineItems.find((i: any) => (i?.name || i?.label || '').toLowerCase().includes('rent')) : null
      enriched.rentAmount = prop?.rentAmount || (rentItem ? (rentItem.totalAmount || rentItem.amount) : snapTx.totalInvoiceAmount)
      enriched.totalPaidToDate = snapTx.historicalPaidToDate ?? snapTx.amount
      enriched.remainingBalance = snapTx.remainingBalance ?? 0
      enriched.isPartial = snapTx.isPartial ?? false
      enriched.status = enriched.isPartial ? 'PARTIAL' : 'PAID'
    } else if (txWithBranding?.paymentRequest) {
      const pr = txWithBranding.paymentRequest
      if (pr.amount !== undefined && pr.amount > 0) {
        const priorTxs = await this.prisma.upward_transaction.findMany({
          where: {
            paymentRequestId: pr.id,
            status: 'SUCCESS',
            createdAt: { lte: txWithBranding.createdAt },
          },
        })
        const historicalPaidToDate = priorTxs.reduce((sum, t) => sum + (t.amount || 0), 0) || txWithBranding.amount || pr.amountPaid || 0
        const historicalRemaining = Math.max(0, pr.amount - historicalPaidToDate)

        const prLineItems = await this.prisma.upward_payment_line_item.findMany({
          where: { paymentRequestId: pr.id }
        })
        const rentItem = prLineItems.find((i: any) => i.name?.toLowerCase().includes('rent'))
        const rentAmount = rentItem ? rentItem.totalAmount : pr.amount

        enriched.rentAmount = rentAmount
        enriched.totalInvoiceAmount = pr.amount
        enriched.totalPaidToDate = historicalPaidToDate
        enriched.remainingBalance = historicalRemaining

        if (historicalRemaining > 0) {
          enriched.isPartial = true
          enriched.status = 'PARTIAL'
        } else {
          enriched.isPartial = false
          enriched.status = 'PAID'
        }
      }
    }

    if (prop) {
      let pm: any = (txWithBranding?.paymentRequest as any)?.pmPaymentRequests?.[0]?.pm

      if (!pm && prop) {
        let pmIdToFind = prop.pmId
        if (!pmIdToFind && prop.pmUnitId) {
          const pmUnit = await this.prisma.upward_pm_unit.findUnique({
            where: { id: prop.pmUnitId },
            include: { property: true }
          })
          pmIdToFind = pmUnit?.property?.pmId || null
        }

        if (pmIdToFind) {
          pm = await this.prisma.upward_property_manager.findUnique({
            where: { id: pmIdToFind },
            include: { emailSetting: true, receiptSetting: true }
          })
        }
      }

      if (!pm && prop.companyId) {
        const sibling = await this.prisma.upward_user_property.findFirst({
          where: { companyId: prop.companyId, pmId: { not: null } },
          include: { pm: { include: { emailSetting: true, receiptSetting: true } } }
        }) as any
        if (sibling?.pm) pm = sibling.pm
      }

      const loc = prop.location
      const addressParts = [loc?.address || loc?.area, loc?.state, loc?.country].filter(Boolean)
      if (addressParts.length > 0) {
        enriched.propertyAddress = addressParts.join(', ')
      }

      let companyName = 'Upward'
      if (pm?.businessName) {
        const decrypted = pm.businessName.includes(':') ? this.encryption.decrypt(pm.businessName) : pm.businessName
        if (decrypted && decrypted !== 'account_name') {
          companyName = decrypted
        }
      } else if (prop.company?.name && prop.company.name !== 'account_name') {
        const decrypted = prop.company.name.includes(':') ? this.encryption.decrypt(prop.company.name) : prop.company.name
        if (decrypted && decrypted !== 'account_name') {
          companyName = decrypted
        }
      } else if (prop.manager) {
        const first = prop.manager.firstName?.includes(':') ? this.encryption.decrypt(prop.manager.firstName) : prop.manager.firstName
        const last = prop.manager.lastName?.includes(':') ? this.encryption.decrypt(prop.manager.lastName) : prop.manager.lastName
        if (first !== 'account_name' && last !== 'account_name') {
          companyName = `${first} ${last}`.trim()
        }
      }
      enriched.brandName = companyName

      if (pm) {
        const logoUrl = pm.receiptSetting?.useEmailLogo === false
          ? pm.receiptSetting?.logoUrl
          : pm.emailSetting?.logoUrl
        if (logoUrl) {
          enriched.logoUrl = logoUrl
        }
        if (pm.receiptSetting?.themeColor) {
          enriched.themeColor = pm.receiptSetting.themeColor
        }
      }

      if (!enriched.logoUrl && prop.company?.logoUrl) {
        enriched.logoUrl = prop.company.logoUrl
      }

      if (!enriched.landlordName || enriched.landlordName === 'account_name' || enriched.landlordName.toLowerCase().includes('rent payment')) {
        if (prop.company?.name && prop.company.name !== 'account_name') {
          const decrypted = prop.company.name.includes(':') ? this.encryption.decrypt(prop.company.name) : prop.company.name
          if (decrypted && decrypted !== 'account_name') {
            enriched.landlordName = decrypted
          }
        } else if (prop.manager) {
          const first = prop.manager.firstName?.includes(':') ? this.encryption.decrypt(prop.manager.firstName) : prop.manager.firstName
          const last = prop.manager.lastName?.includes(':') ? this.encryption.decrypt(prop.manager.lastName) : prop.manager.lastName
          if (first !== 'account_name' && last !== 'account_name') {
            enriched.landlordName = `${first} ${last}`
          }
        }
      }

      if (enriched.landlordName && enriched.landlordName.includes(':')) {
        enriched.landlordName = this.encryption.decrypt(enriched.landlordName)
      }
      if (enriched.brandName && enriched.brandName.includes(':')) {
        enriched.brandName = this.encryption.decrypt(enriched.brandName)
      }
    }

    if (!enriched.landlordName || enriched.landlordName.toLowerCase().includes('rent payment') || enriched.landlordName === 'account_name') {
      if (enriched.companyName && enriched.companyName !== 'account_name') enriched.landlordName = enriched.companyName
      else if (enriched.managerName && enriched.managerName !== 'account_name') enriched.landlordName = enriched.managerName
      else enriched.landlordName = 'Property Manager'
    }

    if (!enriched.propertyAddress || enriched.propertyAddress.toLowerCase().includes('upward')) {
      if (enriched.propertyName) enriched.propertyAddress = enriched.propertyName
    }

    return this.receiptService.generateReceiptPdf(enriched)
  }
}
