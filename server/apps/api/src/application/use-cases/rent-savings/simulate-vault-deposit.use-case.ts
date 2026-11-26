import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Type } from 'class-transformer'
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import {
  IRentVaultRepository,
  RENT_VAULT_REPOSITORY,
} from '../../../domains/rent-savings/rent-vault.repository'
import { isProductionRuntime } from '../../../shared/utils/runtime-env'
import { ProcessPaystackSavingsWebhookUseCase } from './process-paystack-savings-webhook.use-case'

export class SimulateVaultDepositDto {
  @IsNumber()
  @Type(() => Number)
  @Min(100000, { message: 'Minimum simulated deposit is ₦1,000 (100,000 kobo)' })
  amount_kobo!: number

  @IsOptional()
  @IsString()
  account_number?: string

  @IsOptional()
  @IsIn(['MONTHLY', 'EXTRA_TOPUP', 'INITIAL_DEPOSIT'])
  deposit_kind?: 'MONTHLY' | 'EXTRA_TOPUP' | 'INITIAL_DEPOSIT'
}

/**
 * Non-production, JWT-authenticated deposit simulator for testing the end-to-end
 * atomic ledger -> Postgres outbox -> BullMQ + Redis -> ARM Sandbox -> Notification flow
 * WITHOUT opening any unauthenticated bypass on the public Paystack webhook endpoint.
 */
@Injectable()
export class SimulateVaultDepositUseCase {
  private readonly logger = new Logger(SimulateVaultDepositUseCase.name)

  constructor(
    private readonly configService: ConfigService,
    @Inject(RENT_VAULT_REPOSITORY)
    private readonly rentVaultRepo: IRentVaultRepository,
    private readonly processPaystackSavingsWebhookUseCase: ProcessPaystackSavingsWebhookUseCase,
  ) {}

  async execute(userId: number, dto: SimulateVaultDepositDto) {
    const paystackSecret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || ''
    if (isProductionRuntime(paystackSecret) || process.env['NODE_ENV'] === 'production') {
      throw new ForbiddenException('Simulated vault deposits are strictly disabled in production.')
    }

    const amountKobo = BigInt(Math.round(Number(dto.amount_kobo || 0)))
    if (amountKobo < 100_000n) {
      throw new BadRequestException('Minimum deposit amount is ₦1,000.')
    }

    let vault = dto.account_number
      ? await this.rentVaultRepo.findByDvaAccountNumber(dto.account_number.trim())
      : null

    if (!vault) {
      vault = await this.rentVaultRepo.findActiveByUserId(userId)
    }

    if (!vault) {
      throw new NotFoundException('Active rent vault not found.')
    }

    if (vault.userId !== userId) {
      throw new ForbiddenException('You can only simulate deposits into your own rent vault.')
    }

    if (vault.lockStatus === 'SETTLED' || vault.lockStatus === 'BROKEN_OUT') {
      throw new BadRequestException('Cannot deposit into a closed rent vault.')
    }

    const reference = `SIM-DEP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`
    this.logger.log(
      `[DEV SIMULATOR] Processing simulated deposit of ₦${Number(amountKobo) / 100} for user ${userId} vault ${vault.uuid} (ref=${reference})`,
    )

    return this.processPaystackSavingsWebhookUseCase.creditVaultAndEnqueueArm({
      vaultId: vault.id,
      reference,
      amountKobo,
      channel: 'dedicated_nuban',
      narration: 'Rent savings deposit via simulated transfer (dev)',
      source: 'DEV_SIMULATION',
      depositKind: dto.deposit_kind ?? null,
      metadata: {
        simulatedByUserId: userId,
        simulatedDvaAccount: vault.dvaAccountNumber || dto.account_number || null,
      },
    })
  }
}
