import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class ApplyReservedSavingsCashbackUseCase {
  private readonly logger = new Logger(ApplyReservedSavingsCashbackUseCase.name)

  constructor(private readonly prisma: PrismaService) {}

  async execute(userId: number, vaultId: number) {
    if (!this.prisma?.upward_savings_cashback_grant) {
      return { credited: false, amountKobo: 0n }
    }

    const reservedGrants = await this.prisma.upward_savings_cashback_grant.findMany({
      where: {
        userId,
        status: 'RESERVED',
        vaultId: null,
        amountKobo: { gt: 0n },
      },
      include: {
        campaign: { select: { code: true, name: true } },
      },
    })

    if (reservedGrants.length === 0) {
      return { credited: false, amountKobo: 0n }
    }

    let totalCreditedKobo = 0n

    for (const grant of reservedGrants) {
      try {
        await this.prisma.$transaction(async (tx) => {
          const freshGrant = await tx.upward_savings_cashback_grant.findUnique({
            where: { id: grant.id },
          })
          if (!freshGrant || freshGrant.status !== 'RESERVED' || freshGrant.vaultId !== null) {
            return
          }

          const freshVault = await tx.upward_rent_vault.findUniqueOrThrow({
            where: { id: vaultId },
          })
          const currentBalanceKobo = freshVault.currentPrincipalKobo + freshVault.accruedYieldKobo
          const newBalanceKobo = currentBalanceKobo + freshGrant.amountKobo
          const txRef = `CBK_APPLY_${freshGrant.reference}`

          const vaultTx = await tx.upward_rent_vault_transaction.create({
            data: {
              vaultId: freshVault.id,
              userId,
              type: 'CASHBACK',
              amountKobo: freshGrant.amountKobo,
              principalDeltaKobo: freshGrant.amountKobo,
              yieldDeltaKobo: 0n,
              balanceAfterKobo: newBalanceKobo,
              reference: txRef,
              channel: 'ADMIN_CASHBACK',
              narration: `Early Access Rent Savings Cashback (${grant.campaign?.name || 'Activation Campaign'})`,
              metadata: {
                campaignCode: grant.campaign?.code || 'ACTIVATION_DEC_2026',
                grantUuid: freshGrant.uuid,
                fundingSource: freshGrant.fundingSource,
                autoAppliedOnVaultCreation: true,
              } as any,
            },
          })

          await tx.upward_rent_vault.update({
            where: { id: freshVault.id },
            data: {
              currentPrincipalKobo: { increment: freshGrant.amountKobo },
            },
          })

          await tx.upward_savings_cashback_grant.update({
            where: { id: freshGrant.id },
            data: {
              vaultId: freshVault.id,
              transactionId: vaultTx.id,
              status: 'CREDITED',
            },
          })

          totalCreditedKobo += freshGrant.amountKobo
        })
      } catch (err: any) {
        this.logger.warn(
          `Failed to auto-apply reserved cashback grant ${grant.uuid} to vault ${vaultId}: ${err?.message}`,
        )
      }
    }

    if (totalCreditedKobo > 0n) {
      this.logger.log(
        `Auto-credited reserved cashback of ₦${Number(totalCreditedKobo) / 100} into newly created vault #${vaultId} for user #${userId}`,
      )
    }

    return { credited: totalCreditedKobo > 0n, amountKobo: totalCreditedKobo }
  }
}
