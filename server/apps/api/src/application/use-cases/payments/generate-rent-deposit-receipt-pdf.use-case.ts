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

  async execute(params: { transactionUuid: string; userUuid: string }) {
    const { transactionUuid, userUuid } = params

    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userUuid },
    })

    if (!user) {
      throw new UnauthorizedException('User not found')
    }

    let tx = await this.depositRepo.findTransactionByUuid(transactionUuid)
    if (!tx) {
      tx = await this.depositRepo.findTransactionByReference(transactionUuid)
    }

    if (!tx) {
      throw new NotFoundException('Rent deposit transaction not found')
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
    const dedicatedAccount = (tx.userProperty as any)?.dedicatedAccount
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
