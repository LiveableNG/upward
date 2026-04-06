import { Injectable, Logger, Inject } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { TENANT_REPOSITORY, TenantRepository } from '@domains/users/tenant.repository'
import { WAITLIST_REPOSITORY, WaitlistRepository } from '@domains/waitlist/waitlist.repository'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { EVENT_BUS, EventBus } from '@application/events/domain-event'
import { TenantProfileUpdatedEvent } from '@application/events/definition/tenant-profile-updated.event'

@Injectable()
export class CompleteTenantProfileUseCase {
  private readonly logger = new Logger(CompleteTenantProfileUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(TENANT_REPOSITORY) private readonly tenantRepository: TenantRepository,
    @Inject(WAITLIST_REPOSITORY) private readonly waitlistRepository: WaitlistRepository,
  ) {}

  async execute(dto: {
    email: string
    passwordPlain: string
    fullName: string
    phone?: string
    invitedByCompanyId?: string
    invitedByCompanyName?: string
    invitedByCompanyLogo?: string
    rentAnniversary?: string
    address?: string
    occupation?: string
    gender?: string
    dateOfBirth?: string
  }) {
    // 1. Check waitlist
    const waitlistEntry = await this.waitlistRepository.findByEmail(dto.email)

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.passwordPlain, 10)

    // 3. Upsert Tenant (using direct Prisma due to complexity of upsert in repo for now, or just use repo methods)
    let tenant = await this.tenantRepository.findByEmail(dto.email)

    const tenantData = {
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      invitedByCompanyId: dto.invitedByCompanyId,
      invitedByCompanyName: dto.invitedByCompanyName,
      invitedByCompanyLogo: dto.invitedByCompanyLogo,
      rentAnniversary: dto.rentAnniversary ? new Date(dto.rentAnniversary) : undefined,
      address: dto.address,
      occupation: dto.occupation,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth,
      isConvertedFromWaitlist: !!waitlistEntry,
      hasDismissedAppBanner: false,
      isGuest: false,
    }

    if (tenant) {
      await this.tenantRepository.update(tenant.id, tenantData)
      tenant = await this.tenantRepository.findById(tenant.id)
    } else {
      // Create new
      const newTenant = {
        ...tenantData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await this.tenantRepository.save(newTenant)
      tenant = newTenant
    }

    if (!tenant) throw new Error('Failed to create/update tenant')

    // 4. Update Credit Score asynchronously via Events
    this.eventBus.publish(
      new TenantProfileUpdatedEvent(tenant.id, tenant.email, tenant.fullName, Object.keys(dto)),
    )

    // 5. Generate Tokens
    const payload = { sub: tenant.id, email: tenant.email }
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: '1h',
    })
    const refreshToken = this.jwtService.sign(
      { sub: tenant.id },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    )

    return {
      accessToken,
      refreshToken,
      tenant,
    }
  }
}
