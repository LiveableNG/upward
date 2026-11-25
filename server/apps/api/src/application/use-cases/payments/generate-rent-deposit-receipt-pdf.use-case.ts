import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import {
  RENT_DEPOSIT_BALANCE_REPOSITORY,
  IRentDepositBalanceRepository,
} from '../../../domains/payments/rent-deposit.repository'
import { RentDepositReceiptService } from '../../../shared/infrastructure/common/receipt/rent-deposit-receipt.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GenerateRentDepositReceiptPdfUseCase {
  constructor(
    @Inject(RENT_DEPOSIT_BALANCE_REPOSITORY)
    private readonly depositRepo: IRentDepositBalanceRepository,
    private readonly receiptService: RentDepositReceiptService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(params: { transactionUuid: string; userUuid: string | number }) {
    const { transactionUuid, userUuid } = params

    const user =
      typeof userUuid === 'number' || /^\d+$/.test(String(userUuid))
        ? await this.prisma.upward_user.findUnique({ where: { id: Number(userUuid) } })
        : await this.prisma.upward_user.findUnique({ where: { uuid: String(userUuid) } })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    let tx = await this.depositRepo.findTransactionByUuid(transactionUuid)
    if (!tx) {
      tx = await this.depositRepo.findTransactionByReference(transactionUuid)
    }

    if (!tx) {
      // Also support Rent Savings Vault transactions (upward_rent_vault_transaction)
      const vaultTx = await this.prisma.upward_rent_vault_transaction.findFirst({
        where: {
          OR: [{ uuid: transactionUuid }, { reference: transactionUuid }],
        },
        include: {
          vault: true,
        },
      })

      if (!vaultTx) {
        throw new NotFoundException('Rent deposit transaction not found')
      }

      if (vaultTx.userId !== user.id) {
        throw new UnauthorizedException('You are not authorized to access this receipt')
      }

      const first = user.firstName ? this.encryption.decrypt(user.firstName) : ''
      const last = user.lastName ? this.encryption.decrypt(user.lastName) : ''
      const email = user.email ? this.encryption.decrypt(user.email) : ''
      const tenantName = [first, last].filter(Boolean).join(' ').trim() || email || 'Tenant'

      const activeProp = await this.prisma.upward_user_property.findFirst({
        where: { userId: user.id, isPastTenancy: false },
        include: { location: true },
        orderBy: { createdAt: 'desc' },
      })
      const loc = activeProp?.location
      const rawAddress = loc?.address || loc?.area
      const address = rawAddress ? this.encryption.decrypt(rawAddress) : ''
      const state = loc?.state ? this.encryption.decrypt(loc.state) : ''
      const propertyAddress = [address, state].filter(Boolean).join(', ') || 'Rent Savings Vault'

      const isDebit = ['SETTLEMENT_DISBURSEMENT', 'BREAKOUT_PAYOUT', 'LIQUIDATION_PENALTY'].includes(
        vaultTx.type,
      )
      const amountNaira = Number(vaultTx.amountKobo) / 100
      const balanceAfterNaira = Number(vaultTx.balanceAfterKobo) / 100
      const balanceBeforeNaira = isDebit
        ? balanceAfterNaira + amountNaira
        : Math.max(0, balanceAfterNaira - amountNaira)

      const receiptNumber = `RVR-${vaultTx.createdAt.getFullYear()}-${String(vaultTx.id).padStart(5, '0')}`
      const pdfBuffer = await this.receiptService.generatePdf({
        receiptNumber,
        transactionType: isDebit ? 'DEBIT' : 'CREDIT',
        source: vaultTx.channel || 'DVA_INFLOW',
        amount: amountNaira,
        currency: 'NGN',
        reference: vaultTx.reference,
        date: vaultTx.createdAt,
        tenantName,
        tenantEmail: email,
        propertyAddress,
        dvaAccountNumber: vaultTx.vault?.dvaAccountNumber || undefined,
        dvaBankName: vaultTx.vault?.dvaBankName || undefined,
        balanceBefore: balanceBeforeNaira,
        balanceAfter: balanceAfterNaira,
        narration: vaultTx.narration || 'Rent Savings Deposit',
      })

      const fileName = `receipt_${receiptNumber}.pdf`
      const base64 = pdfBuffer.toString('base64')
      const url = `data:application/pdf;base64,${base64}`

      return {
        buffer: pdfBuffer,
        fileName,
        url,
      }
    }

    if (tx.userId !== user.id) {
      throw new UnauthorizedException('You are not authorized to access this receipt')
    }

    // Decrypt Tenant Details
    const rawFirst = tx.user?.firstName || user.firstName
    const rawLast = tx.user?.lastName || user.lastName
    const rawEmail = tx.user?.email || user.email

    const first = rawFirst ? this.encryption.decrypt(rawFirst) : ''
    const last = rawLast ? this.encryption.decrypt(rawLast) : ''
    const email = rawEmail ? this.encryption.decrypt(rawEmail) : ''
    const tenantName = [first, last].filter(Boolean).join(' ').trim() || email || 'Tenant'

    // Decrypt Property Address
    const loc = tx.userProperty?.location
    const rawAddress = loc?.address || loc?.area || tx.userProperty?.name
    const address = rawAddress ? this.encryption.decrypt(rawAddress) : ''
    const state = loc?.state ? this.encryption.decrypt(loc.state) : ''
    const propertyAddress = [address, state].filter(Boolean).join(', ') || 'Tenancy Property'

    // DVA Details if available
    const dedicatedAccount = (tx.userProperty as any)?.dedicatedAccount || 
      ((tx.userProperty as any)?.dedicatedAccounts?.find((a: any) => a.isDefault) || (tx.userProperty as any)?.dedicatedAccounts?.[0])
    const dvaAccountNumber = dedicatedAccount?.accountNumber
    const dvaBankName = dedicatedAccount?.bankName

    const receiptNumber = `RDR-${tx.createdAt.getFullYear()}-${String(tx.id).padStart(5, '0')}`

    const pdfBuffer = await this.receiptService.generatePdf({
      receiptNumber,
      transactionType: tx.type,
      source: tx.source,
      amount: tx.amount,
      currency: 'NGN',
      reference: tx.reference,
      date: tx.createdAt,
      tenantName,
      tenantEmail: email,
      propertyAddress,
      dvaAccountNumber,
      dvaBankName,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      narration: tx.narration || undefined,
      paymentRequestReference: tx.paymentRequest?.reference || undefined,
    })

    const fileName = `receipt_${receiptNumber}.pdf`
    const base64 = pdfBuffer.toString('base64')
    const url = `data:application/pdf;base64,${base64}`

    return {
      buffer: pdfBuffer,
      fileName,
      url,
    }
  }
}
