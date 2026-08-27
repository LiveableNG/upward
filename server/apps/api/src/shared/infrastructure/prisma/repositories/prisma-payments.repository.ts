import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma.service'
import {
  ISavedLandlordRepository,
  ITransactionRepository,
  SavedLandlord,
  Transaction,
  PaymentRequest,
  IPaymentRequestRepository,
  ISubaccountRepository,
  PaystackSubaccount,
  IWebhookRepository,
  WebhookLog,
  WEBHOOK_REPOSITORY,
  IOverpaymentRepository,
  Overpayment,
  IBenefitsSubscriptionRepository,
  BenefitsSubscription,
} from '../../../../domains/payments/payment.repository'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class PrismaSavedLandlordRepository implements ISavedLandlordRepository {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) { }

  async create(
    data: Omit<SavedLandlord, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
  ): Promise<SavedLandlord> {
    const res = await this.prisma.upward_saved_landlord.create({
      data: {
        userId: data.userId,
        name: data.name,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        bankCode: data.bankCode,
        lastAmount: data.lastAmount ?? null,
        lastPaid: data.lastPaid ?? null,
        subaccountId: data.subaccountId,
      },
    })
    return {
      ...res,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
    } as unknown as SavedLandlord
  }

  async findByUserId(userId: number): Promise<SavedLandlord[]> {
    const res = await this.prisma.upward_saved_landlord.findMany({
      where: { userId },
      include: { subaccount: true },
      orderBy: { lastPaid: 'desc' },
    })
    return res.map((r) => ({
      ...r,
      name: r.name ? (r.name.includes(':') ? this.encryption.decrypt(r.name) : r.name) : r.name,
      accountName: r.accountName ? (r.accountName.includes(':') ? this.encryption.decrypt(r.accountName) : r.accountName) : r.accountName,
      lastAmount: r.lastAmount ?? undefined,
      lastPaid: r.lastPaid ?? undefined,
      subaccountId: r.subaccountId ?? undefined,
      subaccount: r.subaccount as unknown as PaystackSubaccount,
      subaccountCode: (r.subaccount as any)?.subaccountCode,
    })) as unknown as SavedLandlord[]
  }

  async findById(id: number): Promise<SavedLandlord | null> {
    const res = await this.prisma.upward_saved_landlord.findUnique({
      where: { id },
      include: { subaccount: true },
    })
    if (!res) return null
    return {
      ...res,
      name: res.name ? (res.name.includes(':') ? this.encryption.decrypt(res.name) : res.name) : res.name,
      accountName: res.accountName ? (res.accountName.includes(':') ? this.encryption.decrypt(res.accountName) : res.accountName) : res.accountName,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
      subaccount: res.subaccount as unknown as PaystackSubaccount,
      subaccountCode: (res.subaccount as any)?.subaccountCode,
    } as unknown as SavedLandlord
  }

  async findByUuid(uuid: string): Promise<SavedLandlord | null> {
    const res = await this.prisma.upward_saved_landlord.findUnique({
      where: { uuid },
      include: { subaccount: true },
    })
    if (!res) return null
    return {
      ...res,
      name: res.name ? (res.name.includes(':') ? this.encryption.decrypt(res.name) : res.name) : res.name,
      accountName: res.accountName ? (res.accountName.includes(':') ? this.encryption.decrypt(res.accountName) : res.accountName) : res.accountName,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
      subaccount: res.subaccount as unknown as PaystackSubaccount,
      subaccountCode: (res.subaccount as any)?.subaccountCode,
    } as unknown as SavedLandlord
  }

  async update(id: number, data: Partial<SavedLandlord>): Promise<SavedLandlord> {
    const res = await this.prisma.upward_saved_landlord.update({
      where: { id },
      data: {
        name: data.name,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        bankCode: data.bankCode,
        lastAmount: data.lastAmount,
        lastPaid: data.lastPaid,
      },
    })
    return {
      ...res,
      lastAmount: res.lastAmount ?? undefined,
      lastPaid: res.lastPaid ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
    } as unknown as SavedLandlord
  }
}

@Injectable()
export class PrismaTransactionRepository implements ITransactionRepository {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) { }

  async create(data: Omit<Transaction, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<Transaction> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_transaction.create({
      data: {
        userId: data.userId,
        type: data.type,
        status: data.status,
        amount: data.amount,
        reference: data.reference,
        narration: data.narration,
        landlordId: data.landlordId ? String(data.landlordId) : undefined,
        paymentType: data.paymentType,
        propertyAddress: data.propertyAddress,
        paymentRequestId: data.paymentRequestId,
        currency: data.currency || 'NGN',
        lineItems: (data as any).lineItems || undefined,
        isManual: (data as any).isManual ?? false,
        settlementStatus: data.settlementStatus || 'PENDING',
      },
      include: {
        paymentRequest: {
          include: {
            subaccount: true,
            userProperty: {
              include: {
                company: true,
                location: true,
              }
            }
          }
        }
      }
    })
    return this.mapTransaction(res)
  }

  async findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<Transaction[]> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_transaction.findMany({
      where: { userId },
      include: {
        paymentRequest: {
          include: {
            subaccount: true,
            userProperty: {
              include: {
                company: true,
                location: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.map((r) => this.mapTransaction(r))
  }

  async findById(id: number, tx?: Prisma.TransactionClient): Promise<Transaction | null> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_transaction.findUnique({
      where: { id },
      include: {
        paymentRequest: {
          include: {
            subaccount: true,
            userProperty: {
              include: {
                company: true,
                location: true,
              }
            }
          }
        }
      }
    })
    if (!res) return null
    return this.mapTransaction(res)
  }

  async findByUuid(uuid: string, tx?: Prisma.TransactionClient): Promise<Transaction | null> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_transaction.findUnique({
      where: { uuid },
      include: {
        paymentRequest: {
          include: {
            subaccount: true,
            userProperty: {
              include: {
                company: true,
                location: true,
              }
            }
          }
        }
      }
    })
    if (!res) return null
    return this.mapTransaction(res)
  }

  async findByReference(reference: string, tx?: Prisma.TransactionClient): Promise<Transaction | null> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_transaction.findUnique({
      where: { reference },
      include: {
        paymentRequest: {
          include: {
            subaccount: true,
            userProperty: {
              include: {
                company: true,
                location: true,
              }
            }
          }
        }
      }
    })
    if (!res) return null
    return this.mapTransaction(res)
  }

  async findRecentDvaTransaction(accountNumber: string, createdAfter?: Date): Promise<Transaction | null> {
    const res = await this.prisma.upward_transaction.findFirst({
      where: {
        status: 'SUCCESS',
        ...(createdAfter ? { createdAt: { gte: createdAfter } } : {}),
        paymentRequest: {
          userProperty: {
            dedicatedAccount: {
              accountNumber: accountNumber
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        paymentRequest: {
          include: {
            subaccount: true,
            userProperty: {
              include: {
                company: true,
                location: true,
              }
            }
          }
        }
      }
    })
    if (!res) return null
    return this.mapTransaction(res)
  }

  async updateStatus(id: number, status: string, tx?: Prisma.TransactionClient): Promise<Transaction> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_transaction.update({
      where: { id },
      data: { status },
    })
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
    } as unknown as Transaction
  }

  async update(id: number, data: Partial<Transaction>, tx?: Prisma.TransactionClient): Promise<Transaction> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_transaction.update({
      where: { id },
      data: {
        status: data.status,
        narration: data.narration,
        lineItems: (data as any).lineItems || undefined,
        isManual: (data as any).isManual,
        settlementStatus: data.settlementStatus,
      },
      include: {
        paymentRequest: {
          include: {
            subaccount: true,
            userProperty: {
              include: {
                company: true,
                location: true,
              }
            }
          }
        }
      }
    })
    return this.mapTransaction(res)
  }

  private mapTransaction(res: any): Transaction {
    const pr = res.paymentRequest
    let mappedPr = null

    if (pr) {
      const companyNameRaw = pr.userProperty?.company?.name || pr.companyName || pr.subaccount?.businessName
      const companyName = companyNameRaw
        ? (companyNameRaw.includes(':') ? this.encryption.decrypt(companyNameRaw) : companyNameRaw)
        : undefined

      mappedPr = {
        ...pr,
        description: pr.description ? (pr.description.includes(':') ? this.encryption.decrypt(pr.description) : pr.description) : pr.description,
        userPropertyUuid: pr.userProperty?.uuid,
        companyName,
        propertyLocation: pr.userProperty?.location
          ? [
            pr.userProperty.location.address,
            pr.userProperty.location.area,
            pr.userProperty.location.state,
            pr.userProperty.location.country,
          ].filter(Boolean).join(', ')
          : undefined,
      }
    }

    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? (mappedPr?.propertyLocation || undefined),
      paymentRequest: mappedPr,
    } as unknown as Transaction
  }
}

@Injectable()
export class PrismaPaymentRequestRepository implements IPaymentRequestRepository {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) { }

  private get paymentRequestInclude() {
    return {
      subaccount: true,
      userProperty: {
        include: {
          company: {
            include: {
              platform: true,
            },
          },
          location: true,
          manager: true,
          pm: true,
        },
      },
    }
  }

  private mapPaymentRequest(res: any): PaymentRequest {
    if (!res) return null as any

    const companyNameRaw = res.userProperty?.company?.name || res.companyName || res.subaccount?.businessName || res.userProperty?.pm?.businessName
    const companyName = companyNameRaw
      ? (companyNameRaw.includes(':') ? this.encryption.decrypt(companyNameRaw) : companyNameRaw)
      : undefined

    const platformNameRaw = res.userProperty?.company?.platform?.name
    const platformName = platformNameRaw
      ? (platformNameRaw.includes(':') ? this.encryption.decrypt(platformNameRaw) : platformNameRaw)
      : undefined

    let managerName: string | undefined = undefined
    if (res.userProperty?.manager) {
      const first = res.userProperty.manager.firstName
      const last = res.userProperty.manager.lastName
      const decFirst = first ? (first.includes(':') ? this.encryption.decrypt(first) : first) : ''
      const decLast = last ? (last.includes(':') ? this.encryption.decrypt(last) : last) : ''
      managerName = `${decFirst} ${decLast}`.trim() || undefined
    } else if (res.userProperty?.pm) {
      const first = res.userProperty.pm.firstName
      const last = res.userProperty.pm.lastName
      const decFirst = first ? (first.includes(':') ? this.encryption.decrypt(first) : first) : ''
      const decLast = last ? (last.includes(':') ? this.encryption.decrypt(last) : last) : ''
      managerName = `${decFirst} ${decLast}`.trim() || undefined
    }

    return {
      ...res,
      minAmount: res.minAmount ?? undefined,
      description: res.description ? (res.description.includes(':') ? this.encryption.decrypt(res.description) : res.description) : res.description,
      reference: res.reference ?? undefined,
      userPropertyId: res.userPropertyId ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
      subaccount: res.subaccount as unknown as PaystackSubaccount,
      platformId: res.userProperty?.company?.platform?.id || res.userProperty?.company?.platformId,
      platformName,
      userPropertyUuid: res.userProperty?.uuid,
      companyName,
      managerName,
      propertyLocation: res.userProperty?.location
        ? [
          res.userProperty.location.address,
          res.userProperty.location.area,
          res.userProperty.location.state,
          res.userProperty.location.country,
        ]
          .filter(Boolean)
          .join(', ')
        : undefined,
      scheduledAt: res.scheduledAt ?? undefined,
      isRecurring: res.isRecurring ?? false,
      recurrenceInterval: res.recurrenceInterval ?? undefined,
    } as unknown as PaymentRequest
  }

  async create(
    data: Omit<PaymentRequest, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentRequest> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_payment_request.create({
      data: {
        userId: data.userId,
        userPropertyId: data.userPropertyId,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        dueDate: data.dueDate,
        status: data.status,
        amountPaid: data.amountPaid || 0,
        allowPartial: data.allowPartial ?? false,
        minAmount: data.minAmount,
        reference: data.reference,
        subaccountId: data.subaccountId,
        isManual: data.isManual,
        rentStartDate: data.rentStartDate,
        rentEndDate: data.rentEndDate,
        rentType: data.rentType,
        scheduledAt: data.scheduledAt,
        isRecurring: data.isRecurring,
        recurrenceInterval: data.recurrenceInterval,
      },
      include: this.paymentRequestInclude,
    })
    return this.mapPaymentRequest(res)
  }

  async findById(id: number, tx?: Prisma.TransactionClient): Promise<PaymentRequest | null> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_payment_request.findUnique({
      where: { id },
      include: this.paymentRequestInclude,
    })
    if (!res) return null
    return this.mapPaymentRequest(res)
  }

  async findByUuid(uuid: string, tx?: Prisma.TransactionClient): Promise<PaymentRequest | null> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_payment_request.findUnique({
      where: { uuid },
      include: this.paymentRequestInclude,
    })
    if (!res) return null
    return this.mapPaymentRequest(res)
  }

  async findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<PaymentRequest[]> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_payment_request.findMany({
      where: { userId },
      include: this.paymentRequestInclude,
      orderBy: { createdAt: 'desc' },
    })
    return res.map((r) => this.mapPaymentRequest(r))
  }

  async findByUserIdAndStatus(userId: number, status: string, tx?: Prisma.TransactionClient): Promise<PaymentRequest[]> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_payment_request.findMany({
      where: { userId, status },
      include: this.paymentRequestInclude,
      orderBy: { createdAt: 'desc' },
    })
    return res.map((r) => this.mapPaymentRequest(r))
  }

  async update(
    id: number,
    data: Partial<PaymentRequest>,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentRequest> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_payment_request.update({
      where: { id },
      data: {
        status: data.status,
        paidAt: data.paidAt,
        reference: data.reference,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        dueDate: data.dueDate,
        amountPaid: data.amountPaid,
        allowPartial: data.allowPartial,
        minAmount: data.minAmount,
        rentStartDate: data.rentStartDate,
        rentEndDate: data.rentEndDate,
        rentType: data.rentType,
        scheduledAt: data.scheduledAt,
        isRecurring: data.isRecurring,
        recurrenceInterval: data.recurrenceInterval,
        userPropertyId: data.userPropertyId,
        subaccountId: data.subaccountId,
      },
      include: this.paymentRequestInclude,
    })
    return this.mapPaymentRequest(res)
  }

  async delete(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    const prisma = tx || this.prisma
    await prisma.upward_payment_request.delete({
      where: { id },
    })
  }
}

@Injectable()
export class PrismaSubaccountRepository implements ISubaccountRepository {
  constructor(private prisma: PrismaService) { }

  async create(
    data: Omit<PaystackSubaccount, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<PaystackSubaccount> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_paystack_subaccount.create({
      data: {
        accountNumber: data.accountNumber,
        bankCode: data.bankCode,
        subaccountCode: data.subaccountCode,
        businessName: data.businessName,
      },
    })
    return res as unknown as PaystackSubaccount
  }

  async findByAccountInfo(accountNumber: string, bankCode: string): Promise<PaystackSubaccount | null> {
    const res = await this.prisma.upward_paystack_subaccount.findUnique({
      where: {
        accountNumber_bankCode: {
          accountNumber,
          bankCode,
        },
      },
    })
    return res as unknown as PaystackSubaccount | null
  }
}

@Injectable()
export class PrismaWebhookRepository implements IWebhookRepository {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) { }

  async create(data: Omit<WebhookLog, 'id' | 'createdAt' | 'updatedAt'>, tx?: Prisma.TransactionClient): Promise<WebhookLog> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_webhook_log.create({
      data: {
        platformId: data.platformId,
        event: data.event,
        url: data.url,
        payload: data.payload,
        status: data.status,
        responseCode: data.responseCode,
        errorMessage: data.errorMessage,
        retries: data.retries,
        lastTriedAt: data.lastTriedAt,
      },
    })
    return res as unknown as WebhookLog
  }

  async update(id: string, data: Partial<WebhookLog>, tx?: Prisma.TransactionClient): Promise<WebhookLog> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_webhook_log.update({
      where: { id },
      data: {
        status: data.status,
        responseCode: data.responseCode,
        errorMessage: data.errorMessage,
        retries: data.retries,
        lastTriedAt: data.lastTriedAt,
      },
    })
    return res as unknown as WebhookLog
  }

  async findToRetry(maxRetries: number): Promise<WebhookLog[]> {
    const res = await this.prisma.upward_webhook_log.findMany({
      where: {
        status: { in: ['FAILED', 'PENDING'] },
        retries: { lt: maxRetries },
      },
      orderBy: { createdAt: 'asc' },
    })
    return res as unknown as WebhookLog[]
  }

  async findAll(params: {
    page: number
    limit: number
    search?: string
    status?: string
  }): Promise<{ logs: WebhookLog[]; total: number }> {
    const { page, limit, search, status } = params
    const skip = (page - 1) * limit
    const where: Prisma.upward_webhook_logWhereInput = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(search
        ? {
          OR: [
            { event: { contains: search, mode: 'insensitive' } },
            { url: { contains: search, mode: 'insensitive' } },
            { errorMessage: { contains: search, mode: 'insensitive' } },
          ],
        }
        : {}),
    }

    const [logs, total] = await Promise.all([
      this.prisma.upward_webhook_log.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { platform: true },
      }),
      this.prisma.upward_webhook_log.count({ where }),
    ])

    const decryptedLogs = logs.map(log => ({
      ...log,
      platform: log.platform ? {
        ...log.platform,
        name: log.platform.name && log.platform.name.includes(':')
          ? this.encryption.decrypt(log.platform.name)
          : log.platform.name
      } : undefined
    }))

    return { logs: decryptedLogs as unknown as WebhookLog[], total }
  }

  async findById(id: string): Promise<WebhookLog | null> {
    const res = await this.prisma.upward_webhook_log.findUnique({
      where: { id },
      include: { platform: true },
    })
    if (!res) return null

    const log = {
      ...res,
      platform: res.platform ? {
        ...res.platform,
        name: res.platform.name && res.platform.name.includes(':')
          ? this.encryption.decrypt(res.platform.name)
          : res.platform.name
      } : undefined
    }

    return log as unknown as WebhookLog
  }
}

@Injectable()
export class PrismaOverpaymentRepository implements IOverpaymentRepository {
  constructor(private prisma: PrismaService) { }

  async create(
    data: Omit<Overpayment, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<Overpayment> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_overpayment.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        currency: data.currency,
        transactionId: data.transactionId,
        paymentRequestId: data.paymentRequestId,
        status: data.status,
      },
    })
    return res as unknown as Overpayment
  }

  async findByUserId(userId: number, tx?: Prisma.TransactionClient): Promise<Overpayment[]> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_overpayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return res as unknown as Overpayment[]
  }

  async findByUserIdAndStatus(userId: number, status: string, tx?: Prisma.TransactionClient): Promise<Overpayment[]> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_overpayment.findMany({
      where: { userId, status },
      orderBy: { createdAt: 'desc' },
    })
    return res as unknown as Overpayment[]
  }

  async update(id: number, data: Partial<Overpayment>, tx?: Prisma.TransactionClient): Promise<Overpayment> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_overpayment.update({
      where: { id },
      data: {
        status: data.status,
        amount: data.amount,
      },
    })
    return res as unknown as Overpayment
  }
}

@Injectable()
export class PrismaBenefitsSubscriptionRepository implements IBenefitsSubscriptionRepository {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Omit<BenefitsSubscription, 'id' | 'uuid' | 'createdAt' | 'updatedAt'>,
    tx?: Prisma.TransactionClient,
  ): Promise<BenefitsSubscription> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_benefits_subscription.create({
      data: {
        userId: data.userId,
        userPropertyId: data.userPropertyId ?? null,
        status: data.status,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        amountPaid: data.amountPaid,
        currency: data.currency,
        source: data.source,
        sourceTransactionId: data.sourceTransactionId ?? null,
      },
    })
    return res as BenefitsSubscription
  }

  async findActiveByUser(
    userId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<BenefitsSubscription | null> {
    const prisma = tx || this.prisma
    const now = new Date()
    const res = await prisma.upward_benefits_subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        endsAt: { gt: now },
      },
      orderBy: { endsAt: 'desc' },
    })
    return res as BenefitsSubscription | null
  }

  async update(
    id: number,
    data: Partial<BenefitsSubscription>,
    tx?: Prisma.TransactionClient,
  ): Promise<BenefitsSubscription> {
    const prisma = tx || this.prisma
    const res = await prisma.upward_benefits_subscription.update({
      where: { id },
      data: {
        status: data.status,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        amountPaid: data.amountPaid,
        currency: data.currency,
        source: data.source,
        sourceTransactionId: data.sourceTransactionId,
        userPropertyId: data.userPropertyId,
      },
    })
    return res as BenefitsSubscription
  }
}
