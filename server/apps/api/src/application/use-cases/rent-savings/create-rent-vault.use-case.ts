import { Injectable, Inject, BadRequestException, ConflictException } from '@nestjs/common'
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import { CadenceType, FundingMethodType } from '../../../domains/rent-savings/rent-vault.types'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

export class CreateRentVaultDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  target_amount_kobo!: number

  @IsNotEmpty()
  @IsDateString()
  contractual_due_date!: string

  @IsNotEmpty()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  cadence!: CadenceType

  @IsNotEmpty()
  @IsIn(['DVA', 'CARD_TOKEN'])
  preferred_funding_method!: FundingMethodType

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  @Type(() => Number)
  payday_day_of_month?: number

  @IsOptional()
  @IsString()
  card_authorization_code?: string
}

@Injectable()
export class CreateRentVaultUseCase {
  constructor(
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(userId: number, dto: CreateRentVaultDto) {
    const existingVault = await this.rentVaultRepo.findActiveByUserId(userId)
    if (existingVault) {
      throw new ConflictException('You already have an active rent vault.')
    }

    const dueDate = new Date(dto.contractual_due_date)
    const now = new Date()
    if (dueDate.getTime() <= now.getTime()) {
      throw new BadRequestException('Contractual due date must be in the future.')
    }

    // Strictly T-30 days
    const unlockDate = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000)

    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new BadRequestException('User not found.')
    }

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Tenant'
    const dvaAccountName = `Upward / ${userName}`

    // Provision DVA details (or simulated Wema / Providus bank account)
    let dvaBankName = 'Wema Bank'
    let dvaAccountNumber: string | null = null
    let dvaAssignmentStatus = 'PENDING'

    if (dto.preferred_funding_method === 'DVA') {
      dvaBankName = 'Wema Bank'
      // Deterministic generation based on user ID or provisioned
      const randomAcc = '90' + Math.floor(10000000 + Math.random() * 90000000).toString()
      dvaAccountNumber = randomAcc
      dvaAssignmentStatus = 'ACTIVE'
    }

    const vault = await this.rentVaultRepo.create({
      userId,
      targetAmountKobo: BigInt(Math.round(dto.target_amount_kobo)),
      cadence: dto.cadence,
      contractualDueDate: dueDate,
      unlockDate,
      lockStatus: 'LOCKED',
      preferredFundingMethod: dto.preferred_funding_method,
      paydayDayOfMonth: dto.payday_day_of_month || null,
      cardAuthorizationCode: dto.card_authorization_code || null,
      dvaBankName,
      dvaAccountNumber,
      dvaAccountName,
      dvaAssignmentStatus,
      autoBypassPmApproval: true,
      investmentProvider: 'ARM',
    })

    // Initialize baseline savings score (20 points for setup)
    await this.rentVaultRepo.upsertSavingsScore(vault.id, userId, {
      cadencePoints: 0,
      velocityPoints: 0,
      loanDisciplinePoints: 20,
      totalScore: 20,
      historyLog: [
        {
          reason: 'Vault created and initialized',
          delta: 20,
          timestamp: new Date().toISOString(),
        },
      ],
    })

    return {
      status: 'success',
      data: {
        vault_id: vault.uuid,
        lock_status: vault.lockStatus,
        target_amount_kobo: Number(vault.targetAmountKobo),
        current_principal_kobo: Number(vault.currentPrincipalKobo),
        accrued_yield_kobo: Number(vault.accruedYieldKobo),
        contractual_due_date: vault.contractualDueDate.toISOString().split('T')[0],
        unlockDate: vault.unlockDate.toISOString().split('T')[0],
        dedicated_account: dvaAccountNumber
          ? {
              bank_name: dvaBankName,
              account_number: dvaAccountNumber,
              account_name: dvaAccountName,
              assignment_status: dvaAssignmentStatus,
            }
          : null,
      },
    }
  }
}
