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
   * - Profile fields: +10 each (address, occupation, gender, dateOfBirth, phone, rentAnniversary)
   * - Successful RENT transactions: +50 each
   * - Successful SAVINGS transactions: +30 each
   */
  async updateTenantScore(tenantId: string): Promise<number> {
    const tenant = await this.prisma.upward_tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            // We'll query transactions separately for better control
          },
        },
      },
    })

    if (!tenant) return 300

    let score = 300

    // 1. Profile Completeness (+10 each)
    if (tenant.address) score += 10
    if (tenant.occupation) score += 10
    if (tenant.gender) score += 10
    if (tenant.dateOfBirth) score += 10
    if (tenant.phone) score += 10
    if (tenant.rentAnniversary) score += 10
    if (tenant.fullName && tenant.fullName.length > 5) score += 10

    const isComplete = !!(
      tenant.address &&
      tenant.occupation &&
      tenant.phone &&
      tenant.rentAnniversary
    )

    // 2. Transaction History
    const transactions = await this.prisma.upward_transaction.findMany({
      where: {
        tenantId,
        status: 'SUCCESS',
      },
      select: { type: true },
    })

    transactions.forEach((tx) => {
      if (tx.type === 'RENT') score += 50
      if (tx.type === 'SAVINGS') score += 30
    })

    // 3. Generate Slug if missing
    let profileSlug = tenant.profileSlug
    if (!profileSlug) {
      profileSlug = this.generateSlug(tenant.fullName, tenant.id)
    }

    // Update the tenant
    await this.prisma.upward_tenant.update({
      where: { id: tenantId },
      data: {
        creditScore: score,
        isProfileComplete: isComplete,
        profileSlug,
      },
    })

    this.logger.log(`Updated credit score for tenant ${tenantId}: ${score}`)
    return score
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
