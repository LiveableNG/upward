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

  private isGenericDescription(text?: string | null): boolean {
    if (!text) return true
    const clean = text.trim().toLowerCase()
    return (
      clean === 'account_name' ||
      clean === 'accountname' ||
      clean === 'manual rent payment' ||
      clean === 'manual payment' ||
      clean === 'rent payment' ||
      clean === 'property payment' ||
      clean === 'upward benefits' ||
      clean === 'rent'
    )
  }

  async execute(uuid: string) {
    const isNumeric = /^\d+$/.test(uuid)
    const dbTx: any = await this.prisma.upward_transaction.findFirst({
      where: isNumeric
        ? { OR: [{ id: Number(uuid) }, { uuid }] }
        : { uuid },
      include: {
        paymentRequest: {
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
                pmUnit: {
                  include: {
                    property: {
                      include: {
                        location: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        proof: {
          include: {
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
                pmUnit: {
                  include: {
                    property: {
                      include: {
                        location: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        tenancyPeriod: {
          include: {
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
                pmUnit: {
                  include: {
                    property: {
                      include: {
                        location: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    const tx: any = dbTx || (await this.txRepo.findByUuid(uuid))
    if (!tx) return null

    let userProp: any =
      tx.paymentRequest?.userProperty ||
      tx.proof?.userProperty ||
      tx.tenancyPeriod?.userProperty

    if (!userProp && tx.userId) {
      userProp = await this.prisma.upward_user_property.findFirst({
        where: { userId: tx.userId },
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
          pmUnit: {
            include: {
              property: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    const pm = userProp?.pm
    const company = userProp?.company
    const manager = userProp?.manager
    const loc = userProp?.location || userProp?.pmUnit?.property?.location

    let resolvedCompanyName = ''

    if (pm?.businessName) {
      const dec = this.decrypt(pm.businessName)
      if (dec && !this.isGenericDescription(dec)) {
        resolvedCompanyName = dec
      }
    }

    if (!resolvedCompanyName && company?.name) {
      const dec = this.decrypt(company.name)
      if (dec && !this.isGenericDescription(dec)) {
        resolvedCompanyName = dec
      }
    }

    if (!resolvedCompanyName && manager) {
      const first = this.decrypt(manager.firstName)
      const last = this.decrypt(manager.lastName)
      const fullName = `${first} ${last}`.trim()
      if (fullName && !this.isGenericDescription(fullName)) {
        resolvedCompanyName = fullName
      }
    }

    if (!resolvedCompanyName && pm) {
      const first = this.decrypt(pm.firstName)
      const last = this.decrypt(pm.lastName)
      const fullName = `${first} ${last}`.trim()
      if (fullName && !this.isGenericDescription(fullName)) {
        resolvedCompanyName = fullName
      }
    }

    if (!resolvedCompanyName && tx.companyName) {
      const dec = this.decrypt(tx.companyName)
      if (dec && !this.isGenericDescription(dec)) {
        resolvedCompanyName = dec
      }
    }

    if (!resolvedCompanyName && tx.landlordId) {
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
        if (name && !this.isGenericDescription(name)) {
          resolvedCompanyName = name
        }
      }
    }

    if (!resolvedCompanyName) {
      resolvedCompanyName = 'Upward'
    }

    // Resolve property address
    const addressParts = [
      userProp?.pmUnit?.unitName,
      loc?.address || userProp?.pmUnit?.property?.address || loc?.area,
      loc?.subarea,
      loc?.area,
      loc?.state,
    ].filter(Boolean)
    const resolvedAddress = addressParts.length > 0 ? addressParts.join(', ') : (tx.propertyAddress || '')

    const themeColor = pm?.receiptSetting?.themeColor || '#B65B37'
    const companyLogo = pm?.receiptSetting?.useEmailLogo === false
      ? (pm.receiptSetting?.logoUrl || '')
      : (pm?.emailSetting?.logoUrl || company?.logoUrl || tx.companyLogo || '')

    const isManualPayment = tx.isManual || tx.reference?.startsWith('MNL-')
    const channel = isManualPayment ? 'Bank Transfer (Manual)' : (tx.channel || tx.paymentType || 'Paystack')

    const pr = tx.paymentRequest
    const resolvedRentStart = tx.rentStartDate || pr?.rentStartDate || userProp?.rentStartDate
    const resolvedRentEnd = tx.rentEndDate || pr?.rentEndDate || userProp?.rentEndDate
    const tenancyPeriod = (resolvedRentStart && resolvedRentEnd)
      ? `${new Date(resolvedRentStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} - ${new Date(resolvedRentEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : undefined

    const hasSnapshotAmounts = tx.totalInvoiceAmount !== null && tx.totalInvoiceAmount !== undefined
    let totalInvoice: number
    let historicalPaidToDate: number
    let historicalRemaining: number
    let isPartial: boolean
    let rentAmount: number

    const propRent = userProp?.rentAmount
    const prLineItems = pr?.lineItemRecords || []
    const rentItem = (prLineItems as any[])?.find((i: any) => i.name?.toLowerCase().includes('rent'))

    const depositTxs = (this.prisma as any).upward_rent_deposit_transaction && pr?.id
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
      totalInvoice = tx.totalInvoiceAmount
      rentAmount = propRent || (rentItem ? (rentItem.totalAmount || rentItem.amount) : tx.totalInvoiceAmount)
      historicalPaidToDate = tx.historicalPaidToDate ?? tx.amount
      historicalRemaining = tx.remainingBalance ?? Math.max(0, totalInvoice - historicalPaidToDate)
      isPartial = tx.isPartial ?? (historicalRemaining > 0)
    } else if (pr) {
      const priorTxs = await this.prisma.upward_transaction.findMany({
        where: {
          paymentRequestId: pr.id,
          status: 'SUCCESS',
          createdAt: { lte: tx.createdAt },
        },
      })
      const propInitialPaid = userProp?.initialAmountPaid || 0
      const basePaid = priorTxs.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) + totalDepositApplied || tx.amount || 0
      historicalPaidToDate = (propInitialPaid > 0 && propRent && propRent > pr.amount)
        ? Math.min(propRent, propInitialPaid + basePaid)
        : basePaid
      totalInvoice = (propInitialPaid > 0 && propRent) ? propRent : (pr.amount || (rentItem ? rentItem.totalAmount : tx.amount))
      rentAmount = propRent || (rentItem ? (rentItem.totalAmount || rentItem.amount) : pr.amount)
      historicalRemaining = Math.max(0, totalInvoice - historicalPaidToDate)
      isPartial = historicalRemaining > 0
    } else if (userProp) {
      totalInvoice = userProp.rentAmount || tx.amount
      rentAmount = userProp.rentAmount || tx.amount
      historicalPaidToDate = userProp.amountPaid || tx.amount
      historicalRemaining = userProp.amountRemaining ?? 0
      isPartial = historicalRemaining > 0
    } else {
      totalInvoice = tx.amount
      rentAmount = tx.amount
      historicalPaidToDate = tx.amount
      historicalRemaining = 0
      isPartial = false
    }

    let resolvedLineItems = (tx.lineItems && Array.isArray(tx.lineItems) && tx.lineItems.length > 0) ? tx.lineItems : []
    if (resolvedLineItems.length === 0 && prLineItems.length > 0) {
      resolvedLineItems = prLineItems.map((li: any) => ({
        label: li.name,
        name: li.name,
        amount: li.totalAmount,
        category: 'Package',
      }))
    } else if (resolvedLineItems.length === 0 && tx.proof?.lineItems) {
      resolvedLineItems = Array.isArray(tx.proof.lineItems)
        ? tx.proof.lineItems.map((li: any) => ({
            label: li.label || li.name || 'Rent',
            name: li.name || li.label || 'Rent',
            amount: Number(li.amountAllocated ?? li.amount ?? li.amountPaid ?? 0),
            category: 'Package',
          }))
        : []
    }

    if (totalDepositApplied > 0 && prLineItems.length > 0) {
      const hasDepositItem = resolvedLineItems.some((i: any) =>
        (i.name || i.label || '').toLowerCase().includes('deposit')
      )
      if (!hasDepositItem && !isPartial) {
        const fullItems = prLineItems.map((lir: any) => ({
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
      paymentRequest: pr
        ? {
            ...tx.paymentRequest,
            ...pr,
          }
        : tx.paymentRequest,
      property: userProp ? {
        address: resolvedAddress,
        locationAddress: loc?.address || loc?.area,
        rentAmount: propRent,
        rentStartDate: userProp.rentStartDate,
        rentEndDate: userProp.rentEndDate,
        initialAmountPaid: userProp.initialAmountPaid,
      } : undefined,
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
      propertyAddress: resolvedAddress || tx.propertyAddress,
      lineItems: resolvedLineItems,
      depositApplied: totalDepositApplied,
      channel,
    }
  }
}
