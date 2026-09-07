import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import {
  RENT_DEPOSIT_BALANCE_REPOSITORY,
  IRentDepositBalanceRepository,
} from '../../../domains/payments/rent-deposit.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetRentDepositSummaryUseCase {
  private readonly logger = new Logger(GetRentDepositSummaryUseCase.name)

  constructor(
    @Inject(RENT_DEPOSIT_BALANCE_REPOSITORY)
    private readonly depositRepo: IRentDepositBalanceRepository,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(userUuid: string, propertyUuid?: string) {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userUuid },
      include: {
        properties: {
          where: propertyUuid ? { uuid: propertyUuid } : { isPastTenancy: false },
          include: {
            dedicatedAccount: true,
            location: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    const userId = user.id
    const primaryProp = user.properties?.[0]
    let totalBalance = 0
    let propertyBalance = 0
    let balances: any[] = []
    let transactions: any[] = []

    try {
      balances = await this.depositRepo.findByUserId(userId)
      totalBalance = balances.reduce((sum, b) => sum + (b.balance || 0), 0)

      if (primaryProp) {
        const match = balances.find((b) => b.userPropertyId === primaryProp.id)
        propertyBalance = match?.balance || 0
      }

      transactions = await this.depositRepo.getTransactionsByUserId(userId, 50)
    } catch (err: any) {
      this.logger.warn(`Could not load rent deposit balances for user ${userId}: ${err?.message || err}`)
    }

    let dvaInfo: any = null
    let propertyAddress = 'Primary Residence'

    if (primaryProp) {
      if (primaryProp.location) {
        const addr = primaryProp.location.address ? this.encryption.decrypt(primaryProp.location.address) : ''
        const area = primaryProp.location.area ? this.encryption.decrypt(primaryProp.location.area) : ''
        const state = primaryProp.location.state ? this.encryption.decrypt(primaryProp.location.state) : ''
        propertyAddress = [addr, area, state].filter(Boolean).join(', ') || 'Primary Residence'
      }

      if (primaryProp.dedicatedAccount) {
        const accName = primaryProp.dedicatedAccount.accountName
          ? this.encryption.decrypt(primaryProp.dedicatedAccount.accountName)
          : ''
        dvaInfo = {
          accountNumber: primaryProp.dedicatedAccount.accountNumber,
          accountName: accName || primaryProp.dedicatedAccount.accountName,
          bankName: primaryProp.dedicatedAccount.bankName,
          bankCode: primaryProp.dedicatedAccount.bankCode,
        }
      }
    }

    const history = transactions.map((tx: any) => {
      let txAddress = propertyAddress
      if (tx.userProperty?.location) {
        const tAddr = tx.userProperty.location.address ? this.encryption.decrypt(tx.userProperty.location.address) : ''
        const tArea = tx.userProperty.location.area ? this.encryption.decrypt(tx.userProperty.location.area) : ''
        const tState = tx.userProperty.location.state ? this.encryption.decrypt(tx.userProperty.location.state) : ''
        txAddress = [tAddr, tArea, tState].filter(Boolean).join(', ') || propertyAddress
      }

      return {
        id: tx.id,
        uuid: tx.uuid,
        type: tx.type, // CREDIT or DEBIT
        amount: tx.amount,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        currency: 'NGN',
        status: tx.status,
        source: tx.source,
        sourceLabel:
          tx.source === 'DVA_INFLOW'
            ? 'Virtual Account Top-Up'
            : tx.source === 'OVERPAYMENT_EXCESS'
            ? 'Invoice Settlement Excess'
            : tx.source === 'PR_APPLICATION'
            ? 'Applied to Rent Invoice'
            : 'Deposit Credit',
        reference: tx.reference,
        narration: tx.narration,
        receiptUrl: tx.receiptUrl || `/api/payments/rent-deposit/receipt/${tx.uuid}`,
        createdAt: tx.createdAt,
        paymentRequestId: tx.paymentRequestId,
        paymentRequestUuid: tx.paymentRequest?.uuid || null,
        propertyAddress: txAddress,
      }
    })

    const availableBalance = propertyBalance > 0 ? propertyBalance : totalBalance

    return {
      availableBalance,
      totalBalance,
      propertyBalance,
      currency: 'NGN',
      property: primaryProp
        ? {
            id: primaryProp.id,
            uuid: primaryProp.uuid,
            address: propertyAddress,
            rentAmount: primaryProp.rentAmount,
            dva: dvaInfo,
          }
        : null,
      history,
    }
  }
}
