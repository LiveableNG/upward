import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { IsNotEmpty, IsNumber, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import {
  IRentAdvanceRepository,
  RENT_ADVANCE_REPOSITORY,
} from '../../../domains/rent-savings/rent-advance.repository'
import { RentSavingsCalculatorEngine } from '../../../domains/rent-savings/rent-savings-calculator.engine'

export class DisburseEmergencyAdvanceDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount_kobo!: number

  @IsNotEmpty()
  @IsString()
  destination_bank_code!: string

  @IsNotEmpty()
  @IsString()
  destination_account_number!: string

  @IsNotEmpty()
  @IsString()
  destination_account_name?: string
}

@Injectable()
export class DisburseEmergencyAdvanceUseCase {
  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(RENT_ADVANCE_REPOSITORY)
    private readonly rentAdvanceRepo: IRentAdvanceRepository,
  ) {}

  async execute(userId: number, vaultUuid: string, dto: DisburseEmergencyAdvanceDto) {
    const vault = await this.rentVaultRepo.findByUuid(vaultUuid)
    if (!vault) {
      throw new NotFoundException('Rent vault not found.')
    }
    if (vault.userId !== userId) {
      throw new ForbiddenException('You do not have access to this rent vault.')
    }
    if (vault.lockStatus === 'SETTLED' || vault.lockStatus === 'BROKEN_OUT') {
      throw new BadRequestException('Cannot borrow from a settled or closed vault.')
    }

    // Check if an active advance already exists
    const existingAdvance = await this.rentAdvanceRepo.findActiveByVaultId(vault.id)
    if (
      existingAdvance &&
      (existingAdvance.status === 'ACTIVE' || existingAdvance.status === 'DEFAULTED')
    ) {
      throw new BadRequestException(
        'You already have an active emergency cash advance that must be repaid before drawing again.',
      )
    }

    const currentBalanceKobo = vault.currentPrincipalKobo + vault.accruedYieldKobo
    const requestedKobo = BigInt(Math.round(dto.amount_kobo))

    if (requestedKobo <= 0n) {
      throw new BadRequestException('Advance amount must be greater than zero.')
    }

    // Calculate borrowing terms & enforce 40% cap
    let terms
    try {
      terms = RentSavingsCalculatorEngine.calculateAdvanceTerms(requestedKobo, currentBalanceKobo)
    } catch (err: any) {
      throw new BadRequestException(err.message)
    }

    const now = new Date()
    // Strictly 30 calendar days
    const repaymentDueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const payoutTransferRef = `NIP_ADV_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`

    const advance = await this.rentAdvanceRepo.create({
      vaultId: vault.id,
      userId,
      borrowedAmountKobo: terms.borrowedAmountKobo,
      facilityFeeKobo: terms.facilityFeeKobo,
      totalRepayableKobo: terms.totalRepayableKobo,
      repaymentDueDate,
      destinationBankCode: dto.destination_bank_code,
      destinationAccountNumber: dto.destination_account_number,
      destinationAccountName: dto.destination_account_name || null,
      payoutTransferReference: payoutTransferRef,
    })

    // Record ledger transaction
    const remainingBalanceKobo = currentBalanceKobo - requestedKobo
    await this.rentVaultRepo.createTransaction({
      vaultId: vault.id,
      userId,
      type: 'ADVANCE_DISBURSEMENT',
      amountKobo: requestedKobo,
      principalDeltaKobo: -requestedKobo,
      yieldDeltaKobo: 0n,
      balanceAfterKobo: remainingBalanceKobo,
      reference: payoutTransferRef,
      channel: 'NIP_TRANSFER',
      narration: `Emergency cash advance disbursed (3.5% facility fee applied)`,
      metadata: {
        advanceUuid: advance.uuid,
        repaymentDueDate: repaymentDueDate.toISOString(),
      },
    })

    return {
      status: 'success',
      data: {
        advance_id: advance.uuid,
        borrowed_amount_kobo: Number(advance.borrowedAmountKobo),
        facility_fee_kobo: Number(advance.facilityFeeKobo),
        total_repayable_kobo: Number(advance.totalRepayableKobo),
        repayment_due_date: advance.repaymentDueDate.toISOString(),
        remaining_vault_balance_kobo: Number(remainingBalanceKobo),
        payout_transfer_reference: payoutTransferRef,
      },
    }
  }
}
