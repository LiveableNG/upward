import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  VOUCHER_REPOSITORY,
  VoucherRepository,
} from '../../../domains/vouchers/voucher.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class GetUserVoucherSummaryUseCase {
  constructor(
    @Inject(VOUCHER_REPOSITORY)
    private readonly voucherRepo: VoucherRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
  ) {}

  async execute(userIdentifier: string | number) {
    const user =
      typeof userIdentifier === 'number'
        ? await this.userRepo.findById(userIdentifier)
        : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdentifier)
          ? await this.userRepo.findByUuid(userIdentifier)
          : !isNaN(Number(userIdentifier))
            ? await this.userRepo.findById(Number(userIdentifier))
            : null

    if (!user || !user.id) {
      throw new NotFoundException(`User '${userIdentifier}' not found`)
    }

    const [wallet, ledger] = await Promise.all([
      this.voucherRepo.getWalletByUserId(user.id),
      this.voucherRepo.listLedgerByUserId(user.id, 100),
    ])

    const availableKobo = wallet?.availableBalanceKobo ?? 0n
    const reservedKobo = wallet?.reservedBalanceKobo ?? 0n
    const lifetimeEarnedKobo = wallet?.lifetimeEarnedKobo ?? 0n
    const lifetimeRedeemedKobo = wallet?.lifetimeRedeemedKobo ?? 0n

    return {
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      wallet: {
        currency: wallet?.currency || 'NGN',
        availableBalanceKobo: availableKobo.toString(),
        availableBalanceNaira: Number(availableKobo) / 100,
        reservedBalanceKobo: reservedKobo.toString(),
        reservedBalanceNaira: Number(reservedKobo) / 100,
        lifetimeEarnedKobo: lifetimeEarnedKobo.toString(),
        lifetimeEarnedNaira: Number(lifetimeEarnedKobo) / 100,
        lifetimeRedeemedKobo: lifetimeRedeemedKobo.toString(),
        lifetimeRedeemedNaira: Number(lifetimeRedeemedKobo) / 100,
      },
      ledger: ledger.map((entry) => ({
        id: entry.id,
        uuid: entry.uuid,
        type: entry.type,
        amountKobo: entry.amountKobo.toString(),
        amountNaira: Number(entry.amountKobo) / 100,
        balanceAfterKobo: entry.balanceAfterKobo.toString(),
        balanceAfterNaira: Number(entry.balanceAfterKobo) / 100,
        reason: entry.reason,
        metadata: entry.metadata || null,
        campaign: entry.campaign || null,
        grantedByAdmin: entry.grantedByAdmin || null,
        order: entry.order || null,
        createdAt: entry.createdAt,
      })),
    }
  }
}
