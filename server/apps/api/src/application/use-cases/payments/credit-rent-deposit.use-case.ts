import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  RENT_DEPOSIT_BALANCE_REPOSITORY,
  IRentDepositBalanceRepository,
} from '../../../domains/payments/rent-deposit.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

@Injectable()
export class CreditRentDepositUseCase {
  private readonly logger = new Logger(CreditRentDepositUseCase.name)

  constructor(
    @Inject(RENT_DEPOSIT_BALANCE_REPOSITORY)
    private readonly depositRepo: IRentDepositBalanceRepository,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute(params: {
    userId: number
    userPropertyId: number
    amount: number
    reference: string
    currency?: string
    source: 'DVA_INFLOW' | 'OVERPAYMENT_EXCESS' | 'MANUAL' | string
    paymentRequestId?: number
    narration?: string
    metadata?: any
    txClient?: any
  }) {
    const {
      userId,
      userPropertyId,
      amount,
      reference,
      currency = 'NGN',
      source,
      paymentRequestId,
      narration,
      metadata,
      txClient,
    } = params

    if (amount <= 0) {
      this.logger.warn(`Ignored deposit credit of non-positive amount: ${amount}`)
      return null
    }

    const existingTx = await this.depositRepo.findTransactionByReference(reference, txClient)
    if (existingTx) {
      this.logger.log(`Deposit transaction already exists for reference: ${reference}`)
      return existingTx
    }

    const depositBalance = await this.depositRepo.findOrCreateBalance(
      userId,
      userPropertyId,
      currency,
      txClient,
    )

    const balanceBefore = depositBalance.balance
    const balanceAfter = balanceBefore + amount

    const defaultNarration =
      narration ||
      (source === 'DVA_INFLOW'
        ? 'Advance Rent Deposit via Virtual Account'
        : source === 'OVERPAYMENT_EXCESS'
        ? 'Invoice Excess Settlement'
        : 'Rent Deposit Credit')

    const depositTx = await this.depositRepo.createTransaction(
      {
        depositBalanceId: depositBalance.id,
        userId,
        userPropertyId,
        paymentRequestId: paymentRequestId ?? null,
        type: 'CREDIT',
        amount,
        balanceBefore,
        balanceAfter,
        source,
        status: 'SUCCESS',
        reference,
        narration: defaultNarration,
        metadata,
      },
      txClient,
    )

    await this.depositRepo.updateBalance(depositBalance.id, balanceAfter, txClient)

    try {
      const client = txClient || this.prisma
      await client.upward_notification.create({
        data: {
          userId,
          title: 'Rent Deposit Received',
          message: `${currency} ${amount.toLocaleString()} has been added to your Rent Deposit Balance. Updated balance: ${currency} ${balanceAfter.toLocaleString()}.`,
          type: 'PAYMENT',
          url: '/dashboard/deposit-balance',
        },
      })
    } catch (notifErr: any) {
      this.logger.warn(`Failed to create deposit notification: ${notifErr.message}`)
    }

    // Send dedicated email notification to the tenant
    try {
      const user = await this.prisma.upward_user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true, phone: true },
      })

      if (user && user.email) {
        const decryptedEmail = this.encryption.decrypt(user.email)
        const decryptedPhone = user.phone ? this.encryption.decrypt(user.phone) : null
        const firstName = user.firstName ? this.encryption.decrypt(user.firstName) : ''
        const lastName = user.lastName ? this.encryption.decrypt(user.lastName) : ''
        const fullName = `${firstName} ${lastName}`.trim() || 'Tenant'

        let propertyAddress = ''
        if (userPropertyId) {
          const prop = await this.prisma.upward_user_property.findUnique({
            where: { id: userPropertyId },
            include: {
              pmUnit: { include: { property: true } },
              location: true,
            },
          })
          propertyAddress =
            prop?.pmUnit?.property?.name ||
            prop?.pmUnit?.property?.address ||
            prop?.location?.address ||
            ''
        }

        const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()
        const depositLink = `${baseUrl}/dashboard/deposit-balance`
        const commType = source === 'OVERPAYMENT_EXCESS' ? 'RENT_OVERPAYMENT_RECEIVED' : 'RENT_DEPOSIT_CREDITED'

        await this.unifiedCommService.processCommunication({
          userId: String(userId),
          recipientEmail: decryptedEmail,
          recipientName: fullName,
          recipientPhone: decryptedPhone || undefined,
          recipientRole: 'TENANT',
          type: commType,
          context: {
            displayName: firstName || fullName,
            tenantName: fullName,
            amount,
            formattedAmount: amount.toLocaleString(),
            currency,
            newBalance: balanceAfter,
            formattedNewBalance: balanceAfter.toLocaleString(),
            propertyAddress,
            reference,
            depositLink,
          },
        })
      }
    } catch (commErr: any) {
      this.logger.warn(`Failed to dispatch deposit communication: ${commErr.message}`)
    }

    this.logger.log(
      `Credited ${amount} ${currency} to Rent Deposit Balance (User: ${userId}, Prop: ${userPropertyId}, Ref: ${reference}, New Balance: ${balanceAfter})`
    )

    return depositTx
  }
}

export { CreditRentDepositUseCase as RecordRentDepositUseCase }

