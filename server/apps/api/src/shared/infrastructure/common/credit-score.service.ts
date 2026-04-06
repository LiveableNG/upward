import { Injectable, Inject, Logger } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { TENANT_REPOSITORY, TenantRepository } from '@domains/users/tenant.repository'

@Injectable()
export class CreditScoreService {
  private readonly logger = new Logger(CreditScoreService.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepository,
  ) {}

  /**
   * Recalculates and updates the credit score for a tenant.
   * Logic:
   * - Base: 300
   * - Profile fields: +25 each (address, occupation, gender, dateOfBirth, phone, rentAnniversary) - Max 150
   * - Successful RENT transactions:
   *    - On-Time: +50
   *    - Early Bird (5+ days early): +100
   *    - Late: -50
   * - Savings Progress: (balance/goal) * 200 - Max 200
   * - Max Score: 1000
   */
  async updateTenantScore(tenantId: string): Promise<number> {
    const tenant = await this.prisma.upward_tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {},
        },
      },
    })

    if (!tenant) return 300

    let score = 300

    // 1. Profile Completeness (+25 each, Max 150)
    // We check existence of fields
    const profileFields = [
      'address',
      'occupation',
      'gender',
      'dateOfBirth',
      'phone',
      'rentAnniversary',
    ]
    let profilePts = 0
    profileFields.forEach((field) => {
      if (tenant[field as keyof typeof tenant]) profilePts += 25
    })
    score += Math.min(profilePts, 150)

    // 2. Transaction History (Factoring early/late)
    const transactions = await this.prisma.upward_transaction.findMany({
      where: {
        tenantId,
        status: 'SUCCESS',
      },
    })

    const anniversary = tenant.rentAnniversary

    transactions.forEach((tx) => {
      if (tx.type === 'RENT') {
        if (anniversary) {
          const txDate = new Date(tx.createdAt)
          // Calculate anniversary for the current year or month?
          // For now, let's assume rent anniversary is used to check against the payment month.
          // Simplified logic: compare day of month if monthly, or exact date if annual.
          // Realistically, we'd check the "Due Date" if we had an invoice/request.

          const dayOfDue = anniversary.getDate()
          const dayOfPayment = txDate.getDate()

          if (dayOfPayment <= dayOfDue - 5) {
            score += 100 // Early Bird
          } else if (dayOfPayment <= dayOfDue + 3) {
            score += 50 // On Time (3 days grace)
          } else {
            score -= 50 // Late
          }
        } else {
          score += 50 // On-time default if no anniversary set
        }
      }

      if (tx.type === 'SAVINGS') {
        score += 20 // Small bump per deposit
      }
    })

    // 3. Savings Ratio (+Points proportional to goal, Max 200)
    const goalRatio = tenant.savingsGoal > 0 ? tenant.savingsBalance / tenant.savingsGoal : 0
    score += Math.floor(goalRatio * 200)

    // 4. Performance Stats (Gaming Style)
    let earlyStreaks = 0
    let onTimeCount = 0
    let totalRentTx = 0

    transactions
      .filter((t) => t.type === 'RENT')
      .forEach((tx) => {
        totalRentTx++
        const txDate = new Date(tx.createdAt)
        if (anniversary) {
          const dayOfDue = anniversary.getDate()
          const dayOfPayment = txDate.getDate()
          if (dayOfPayment <= dayOfDue - 5) earlyStreaks++
          if (dayOfPayment <= dayOfDue + 3) onTimeCount++
        } else {
          onTimeCount++ // Assume on-time if no anniversary set
        }
      })

    const onTimeRate = totalRentTx > 0 ? (onTimeCount / totalRentTx) * 100 : 100
    let rank = 'A'
    if (onTimeRate >= 98 && earlyStreaks >= 3) rank = 'S'
    else if (onTimeRate >= 90) rank = 'A'
    else if (onTimeRate >= 75) rank = 'B'
    else rank = 'C'

    let profileSlug = tenant.profileSlug
    if (!profileSlug) {
      profileSlug = this.generateSlug(tenant.fullName, tenant.id)
    }

    // Update the tenant
    const finalScore = Math.max(0, Math.min(score, 1000))
    const isComplete = profilePts >= 100

    await this.prisma.upward_tenant.update({
      where: { id: tenantId },
      data: {
        creditScore: finalScore,
        isProfileComplete: isComplete,
        profileSlug,
        reliabilityRank: rank,
        onTimePercentage: onTimeRate,
        earlyPaymentStreak: earlyStreaks,
        savingsImpact: goalRatio * 100,
      },
    })

    this.logger.log(`Updated credit score for tenant ${tenantId}: ${finalScore}`)
    return finalScore
  }

  private generateSlug(name: string, id: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const shortId = id.split('-')[0]
    return `${base}-${shortId}`
  }
}
