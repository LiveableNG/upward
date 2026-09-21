import { Injectable, Inject, UnauthorizedException } from '@nestjs/common'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository, PropertyManager } from '../../../../domains/pm/property-manager.repository'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { createHash } from 'crypto'

@Injectable()
export class GetElevatedLandlordPmUseCase {
  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
    private readonly prisma: PrismaService,
  ) {}

  private hashEmail(email: string): string {
    return createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
  }

  async execute(email?: string): Promise<PropertyManager> {
    if (!email) throw new UnauthorizedException('Invalid landlord context')

    let pm: PropertyManager | null = await this.pmRepository.findByEmail(email)
    if (!pm) {
      const landlord = await (this.prisma as any).upward_pm_landlord.findUnique({
        where: { emailHash: this.hashEmail(email) },
      })
      if (!landlord) throw new UnauthorizedException('Landlord record not found')

      pm = await (this.prisma as any).upward_property_manager.create({
        data: {
          email,
          emailHash: this.hashEmail(email),
          passwordHash: landlord.passwordHash,
          firstName: landlord.firstName || 'Landlord',
          lastName: landlord.lastName || 'User',
          businessName: `${landlord.firstName}'s Portfolio`,
          pmType: 'INDIVIDUAL_LANDLORD',
        },
      })
    }

    if (!pm) throw new UnauthorizedException('Failed to resolve property manager')
    return pm
  }
}
