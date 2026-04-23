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
} from '../../../../domains/payments/payment.repository'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class PrismaSavedLandlordRepository implements ISavedLandlordRepository {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

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
  constructor(private prisma: PrismaService) {}

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
        lineItems: (data as any).lineItems || undefined
      },
      include: {
        paymentRequest: true
      }
    })
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
      paymentRequest: res.paymentRequest as any
    } as unknown as Transaction
  }

  async findByUserId(userId: number): Promise<Transaction[]> {
    const res = await this.prisma.upward_transaction.findMany({
      where: { userId },
      include: { paymentRequest: true },
      orderBy: { createdAt: 'desc' },
    })
    return res.map((r) => ({
      ...r,
      narration: r.narration ?? undefined,
      landlordId: r.landlordId ?? undefined,
      paymentType: r.paymentType ?? undefined,
      propertyAddress: r.propertyAddress ?? undefined,
    })) as unknown as Transaction[]
  }

  async findById(id: number): Promise<Transaction | null> {
    const res = await this.prisma.upward_transaction.findUnique({
      where: { id },
      include: { paymentRequest: true }
    })
    if (!res) return null
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
    } as unknown as Transaction
  }

  async findByUuid(uuid: string): Promise<Transaction | null> {
    const res = await this.prisma.upward_transaction.findUnique({
      where: { uuid },
      include: { paymentRequest: true }
    })
    if (!res) return null
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
    } as unknown as Transaction
  }

  async findByReference(reference: string): Promise<Transaction | null> {
    const res = await this.prisma.upward_transaction.findUnique({
      where: { reference },
      include: { paymentRequest: true }
    })
    if (!res) return null
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
    } as unknown as Transaction
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
      },
    })
    return {
      ...res,
      narration: res.narration ?? undefined,
      landlordId: res.landlordId ?? undefined,
      paymentType: res.paymentType ?? undefined,
      propertyAddress: res.propertyAddress ?? undefined,
    } as unknown as Transaction
  }
}

@Injectable()
export class PrismaPaymentRequestRepository implements IPaymentRequestRepository {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

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
      },
    })
    return {
      ...res,
      description: res.description ?? undefined,
      reference: res.reference ?? undefined,
      userPropertyId: res.userPropertyId ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
    } as unknown as PaymentRequest
  }

  async findById(id: number): Promise<PaymentRequest | null> {
    const res = await this.prisma.upward_payment_request.findUnique({
      where: { id },
      include: {
        subaccount: true,
        userProperty: {
          include: {
            company: {
              include: {
                platform: true,
              },
            },
            location: true,
          },
        },
      },
    })
    if (!res) return null
    return {
      ...res,
      description: res.description ? (res.description.includes(':') ? this.encryption.decrypt(res.description) : res.description) : res.description,
      reference: res.reference ?? undefined,
      userPropertyId: res.userPropertyId ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
      subaccount: res.subaccount as unknown as PaystackSubaccount,
      platformId: (res.userProperty as any)?.company?.platform?.id,
      userPropertyUuid: res.userProperty?.uuid,
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
    } as unknown as PaymentRequest
  }

  async findByUuid(uuid: string): Promise<PaymentRequest | null> {
    const res = await this.prisma.upward_payment_request.findUnique({
      where: { uuid },
      include: {
        subaccount: true,
        userProperty: {
          include: {
            company: {
              include: {
                platform: true,
              },
            },
            location: true,
          },
        },
      },
    })
    if (!res) return null
    return {
      ...res,
      description: res.description ? (res.description.includes(':') ? this.encryption.decrypt(res.description) : res.description) : res.description,
      reference: res.reference ?? undefined,
      userPropertyId: res.userPropertyId ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
      subaccount: res.subaccount as unknown as PaystackSubaccount,
      platformId: (res.userProperty as any)?.company?.platform?.id,
      userPropertyUuid: res.userProperty?.uuid,
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
    } as unknown as PaymentRequest
  }

  async findByUserId(userId: number): Promise<PaymentRequest[]> {
    const res = await this.prisma.upward_payment_request.findMany({
      where: { userId },
      include: {
        subaccount: true,
        userProperty: {
          include: {
            company: true,
            manager: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.map((r) => ({
      ...r,
      description: r.description ? (r.description.includes(':') ? this.encryption.decrypt(r.description) : r.description) : r.description,
      reference: r.reference ?? undefined,
      userPropertyId: r.userPropertyId ?? undefined,
      companyName: (r.userProperty as any)?.company?.name
        ? ((r.userProperty as any).company.name.includes(':') ? this.encryption.decrypt((r.userProperty as any).company.name) : (r.userProperty as any).company.name)
        : undefined,
      managerName: (r.userProperty as any)?.manager
        ? (this.encryption.decrypt((r.userProperty as any).manager.firstName) +
          ' ' +
          this.encryption.decrypt((r.userProperty as any).manager.lastName))
        : undefined,
      propertyLocation: (r.userProperty as any)?.location
        ? [
            (r.userProperty as any).location.address,
            (r.userProperty as any).location.area,
            (r.userProperty as any).location.state,
            (r.userProperty as any).location.country,
          ]
            .filter(Boolean)
            .join(', ')
        : undefined,
      subaccountId: r.subaccountId ?? undefined,
      subaccount: r.subaccount as unknown as PaystackSubaccount,
      userPropertyUuid: (r.userProperty as any)?.uuid,
    })) as unknown as PaymentRequest[]
  }

  async findByUserIdAndStatus(userId: number, status: string): Promise<PaymentRequest[]> {
    const res = await this.prisma.upward_payment_request.findMany({
      where: { userId, status },
      include: {
        subaccount: true,
        userProperty: {
          include: {
            company: true,
            manager: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.map((r) => ({
      ...r,
      description: r.description ? (r.description.includes(':') ? this.encryption.decrypt(r.description) : r.description) : r.description,
      reference: r.reference ?? undefined,
      userPropertyId: r.userPropertyId ?? undefined,
      companyName: (r.userProperty as any)?.company?.name
        ? ((r.userProperty as any).company.name.includes(':') ? this.encryption.decrypt((r.userProperty as any).company.name) : (r.userProperty as any).company.name)
        : undefined,
      managerName: (r.userProperty as any)?.manager
        ? (this.encryption.decrypt((r.userProperty as any).manager.firstName) +
          ' ' +
          this.encryption.decrypt((r.userProperty as any).manager.lastName))
        : undefined,
      propertyLocation: (r.userProperty as any)?.location
        ? [
            (r.userProperty as any).location.address,
            (r.userProperty as any).location.area,
            (r.userProperty as any).location.state,
            (r.userProperty as any).location.country,
          ]
            .filter(Boolean)
            .join(', ')
        : undefined,
      subaccountId: r.subaccountId ?? undefined,
      subaccount: r.subaccount as unknown as PaystackSubaccount,
      userPropertyUuid: (r.userProperty as any)?.uuid,
    })) as unknown as PaymentRequest[]
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
      },
    })
    return {
      ...res,
      description: res.description ?? undefined,
      reference: res.reference ?? undefined,
      userPropertyId: res.userPropertyId ?? undefined,
      subaccountId: res.subaccountId ?? undefined,
    } as unknown as PaymentRequest
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
  constructor(private prisma: PrismaService) {}

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
  constructor(private prisma: PrismaService) {}

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

    return { logs: logs as unknown as WebhookLog[], total }
  }

  async findById(id: string): Promise<WebhookLog | null> {
    const res = await this.prisma.upward_webhook_log.findUnique({
      where: { id },
      include: { platform: true },
    })
    return res as unknown as WebhookLog | null
  }
}

@Injectable()
export class PrismaOverpaymentRepository implements IOverpaymentRepository {
  constructor(private prisma: PrismaService) {}

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

  async findByUserId(userId: number): Promise<Overpayment[]> {
    const res = await this.prisma.upward_overpayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return res as unknown as Overpayment[]
  }
}
