import { Inject, Injectable } from '@nestjs/common'
import {
  TRANSACTION_REPOSITORY,
  ITransactionRepository,
} from '../../../domains/payments/payment.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly txRepo: ITransactionRepository,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) { }

  private decrypt(text?: string | null): string {
    if (!text) return ''
    if (text.includes(':')) {
      try {
        return this.encryption.decrypt(text)
      } catch {
        return text
      }
    }
    return text
  }

  async execute(uuid: string) {
    const tx: any = await this.txRepo.findByUuid(uuid)
    if (!tx) return null

    let resolvedCompanyName = 'Upward'
    if (tx.companyName) {
      const dec = this.decrypt(tx.companyName)
      if (dec && dec !== 'account_name') resolvedCompanyName = dec
    } else if (tx.narration) {
      const dec = this.decrypt(tx.narration)
      if (dec && dec !== 'account_name') resolvedCompanyName = dec
    }

    if (tx.paymentRequestId) {
      const pr = await this.prisma.upward_payment_request.findUnique({
        where: { id: tx.paymentRequestId },
        include: {
          lineItemRecords: {
            orderBy: { sortOrder: 'asc' },
          },
          userProperty: {
            include: {
              pm: {
                include: {
                  receiptSetting: true,
                  emailSetting: true,
                },
              },
              company: true,
              manager: true,
              location: true,
            },
          },
        },
      })

      if (pr) {
        const resolvedRentStart = tx.rentStartDate || pr.rentStartDate || pr.userProperty?.rentStartDate
        const resolvedRentEnd = tx.rentEndDate || pr.rentEndDate || pr.userProperty?.rentEndDate
        const tenancyPeriod = (resolvedRentStart && resolvedRentEnd)
          ? `${new Date(resolvedRentStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(resolvedRentEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : undefined

        const hasSnapshotAmounts = (tx as any)?.totalInvoiceAmount !== null && (tx as any)?.totalInvoiceAmount !== undefined
        let totalInvoice: number
        let historicalPaidToDate: number
        let historicalRemaining: number
        let isPartial: boolean
        let rentAmount: number

        const propRent = pr.userProperty?.rentAmount
        const rentItem = (pr.lineItemRecords as any[])?.find((i: any) => i.name?.toLowerCase().includes('rent'))

        const depositTxs = (this.prisma as any).upward_rent_deposit_transaction
          ? await (this.prisma as any).upward_rent_deposit_transaction.findMany({
              where: {
                paymentRequestId: pr.id,
                type: 'DEBIT',
                status: 'SUCCESS',
                createdAt: { lte: tx.createdAt },
              },
            })
          : []
        const totalDepositApplied = depositTxs.reduce((sum: number, dt: any) => sum + (dt.amount || 0), 0)

        if (hasSnapshotAmounts) {
          const snapTx = tx as any
          totalInvoice = snapTx.totalInvoiceAmount
          rentAmount = propRent || (rentItem ? (rentItem.totalAmount || rentItem.amount) : snapTx.totalInvoiceAmount)
          historicalPaidToDate = snapTx.historicalPaidToDate ?? snapTx.amount
          historicalRemaining = snapTx.remainingBalance ?? Math.max(0, totalInvoice - historicalPaidToDate)
          isPartial = snapTx.isPartial ?? (historicalRemaining > 0)
        } else {
          const priorTxs = await this.prisma.upward_transaction.findMany({
            where: {
              paymentRequestId: pr.id,
              status: 'SUCCESS',
              createdAt: { lte: tx.createdAt },
            },
          })
          const propInitialPaid = pr.userProperty?.initialAmountPaid || 0
          const basePaid = priorTxs.reduce((sum, t) => sum + (t.amount || 0), 0) + totalDepositApplied || tx.amount || 0
          historicalPaidToDate = (propInitialPaid > 0 && propRent && propRent > pr.amount)
            ? Math.min(propRent, propInitialPaid + basePaid)
            : basePaid
          totalInvoice = (propInitialPaid > 0 && propRent) ? propRent : (pr.amount || (rentItem ? rentItem.totalAmount : tx.amount))
          rentAmount = propRent || (rentItem ? (rentItem.totalAmount || rentItem.amount) : pr.amount)
          historicalRemaining = Math.max(0, totalInvoice - historicalPaidToDate)
          isPartial = historicalRemaining > 0
        }

        const pm = pr.userProperty?.pm
        const company = pr.userProperty?.company
        const manager = pr.userProperty?.manager
        const loc = pr.userProperty?.location

        const themeColor = pm?.receiptSetting?.themeColor || '#B65B37'
        const companyLogo = pm?.receiptSetting?.useEmailLogo === false
          ? (pm.receiptSetting?.logoUrl || '')
          : (pm?.emailSetting?.logoUrl || company?.logoUrl || '')

        if (pm?.businessName) {
          const dec = this.decrypt(pm.businessName)
          if (dec && dec !== 'account_name') {
            resolvedCompanyName = dec
          }
        } else if (company?.name) {
          const dec = this.decrypt(company.name)
          if (dec && dec !== 'account_name') {
            resolvedCompanyName = dec
          }
        } else if (manager) {
          const first = this.decrypt(manager.firstName)
          const last = this.decrypt(manager.lastName)
          const fullName = `${first} ${last}`.trim()
          if (fullName && fullName !== 'account_name') {
            resolvedCompanyName = fullName
          }
        }

        const addressParts = [
          loc?.address,
          loc?.subarea,
          loc?.area,
          loc?.state,
        ].filter(Boolean)
        const propertyAddress = addressParts.length > 0 ? addressParts.join(', ') : ''

        let resolvedLineItems = (tx.lineItems && tx.lineItems.length > 0) ? tx.lineItems : []
        if (resolvedLineItems.length === 0 && pr.lineItemRecords && pr.lineItemRecords.length > 0) {
          resolvedLineItems = pr.lineItemRecords.map((li: any) => ({
            label: li.name,
            name: li.name,
            amount: li.totalAmount,
            category: 'Package',
          }))
        }

        if (totalDepositApplied > 0 && pr.lineItemRecords && pr.lineItemRecords.length > 0) {
          const hasDepositItem = resolvedLineItems.some((i: any) =>
            (i.name || i.label || '').toLowerCase().includes('deposit')
          )
          if (!hasDepositItem && !isPartial) {
            const fullItems = pr.lineItemRecords.map((lir: any) => ({
              name: lir.name,
              label: lir.name,
              amount: lir.totalAmount,
              category: 'Package',
            }))
            fullItems.push({
              name: 'Rent Deposit Applied',
              label: 'Rent Deposit Applied',
              amount: -totalDepositApplied,
              category: 'Rent Deposit',
            })
            resolvedLineItems = fullItems
          }
        }

        return {
          ...tx,
          rentStartDate: resolvedRentStart,
          rentEndDate: resolvedRentEnd,
          tenancyPeriod,
          paymentRequest: {
            ...tx.paymentRequest,
            ...pr,
          },
          rentAmount,
          totalInvoiceAmount: totalInvoice,
          totalPaidToDate: historicalPaidToDate,
          historicalPaidToDate,
          remainingBalance: historicalRemaining,
          historicalRemaining,
          isPartial,
          status: isPartial ? 'PARTIAL' : (tx.status === 'SUCCESS' ? 'PAID' : tx.status),
          themeColor,
          companyLogo: companyLogo || tx.companyLogo,
          companyName: resolvedCompanyName,
          propertyAddress: propertyAddress || tx.propertyAddress,
          lineItems: resolvedLineItems,
          depositApplied: totalDepositApplied,
        }
      }
    }

    if (tx.landlordId && (!resolvedCompanyName || resolvedCompanyName === 'Upward')) {
      const landlord = await this.prisma.upward_saved_landlord.findFirst({
        where: {
          OR: [
            { uuid: tx.landlordId },
            { id: !isNaN(Number(tx.landlordId)) ? Number(tx.landlordId) : -1 },
          ],
        },
      })
      if (landlord) {
        const name = this.decrypt(landlord.name || landlord.accountName)
        if (name && name !== 'account_name') {
          resolvedCompanyName = name
        }
      }
    }

    return {
      ...tx,
      companyName: resolvedCompanyName,
    }
  }
}
