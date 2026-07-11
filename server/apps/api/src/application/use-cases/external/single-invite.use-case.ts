import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY, PASS_PLACEHOLDERS } from '../../../domains/users/user.repository'
import {
  CompanyRepository,
  COMPANY_REPOSITORY,
  MANAGER_REPOSITORY,
  ManagerRepository,
  COMPANY_USER_REPOSITORY,
  CompanyUserRepository
} from '../../../domains/companies/company.repository'
import { VERIFICATION_TOKEN_REPOSITORY, VerificationTokenRepository } from '../../../domains/auth/verification-token.repository'
import {
  PropertyRepository,
  PROPERTY_REPOSITORY,
  LOCATION_REPOSITORY,
  LocationRepository
} from '../../../domains/companies/property.repository'
import { PAYMENT_GATEWAY, IPaymentGateway } from '../../../domains/payments/payment.repository'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { ResolveDedicatedAccountUseCase } from '../../use-cases/payments/payment.use-cases'
import { AddManualAccountUseCase } from '../../use-cases/payments/manual-payment.use-cases'
import { randomUUID } from 'crypto'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { TenantSyncedEvent } from '../../events/definition/tenant-synced.event'

import {
  InviteRequestDto as InviteRequest,
  UserPropertyContextDto as InvitePropertyInfo
} from './external-api.dto'

export { InviteRequest, InvitePropertyInfo }
const frontendUrl = process.env['FRONTEND_URL']
const urls = frontendUrl
  ? frontendUrl.split(',').map((url) => url.trim())
  : ['http://localhost:3000', 'http://localhost:5173']

@Injectable()
export class SingleInviteUseCase {
  private readonly logger = new Logger(SingleInviteUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
    @Inject(MANAGER_REPOSITORY) private readonly managerRepository: ManagerRepository,
    @Inject(COMPANY_USER_REPOSITORY) private readonly companyUserRepository: CompanyUserRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    @Inject(LOCATION_REPOSITORY) private readonly locationRepository: LocationRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    @Inject(PAYMENT_GATEWAY) private readonly paymentGateway: IPaymentGateway,
    private readonly notificationService: NotificationService,
    private readonly resolveDedicatedAccount: ResolveDedicatedAccountUseCase,
    private readonly addManualAccountUseCase: AddManualAccountUseCase,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) { }

  async execute(payload: InviteRequest, platformId?: number): Promise<any> {
    const result = await this.setupInviteContext(payload, platformId);
    const firstProp = result.properties[0]

    // 4. Generate expirable verification token for the link
    const token = randomUUID()
    await this.tokenRepository.create({
      token,
      context: 'INVITE',
      identifier: result.user.uuid,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    })

    // Publish TenantSyncedEvent for background subaccount and DVA provisioning
    const propertiesForSync = result.properties.map((p: any) => ({
      propertyId: p.id,
      bankCode: p.bankCode,
      accountNumber: p.accountNumber,
      businessName: p.businessName
    }))

    this.eventBus.publish(new TenantSyncedEvent(
      result.user.id,
      result.user.email,
      `${result.user.firstName || ''} ${result.user.lastName || ''}`.trim() || result.user.email.split('@')[0],
      result.user.phone ?? undefined,
      propertiesForSync
    ))

    return {
      userId: result.user.uuid,
      companyId: result.company.uuid,
      managerId: firstProp?.managerUuid || null,
      userPropertyUuid: firstProp?.uuid || null,
      email: result.user.email,
      inviteLink: urls[0] + `/invite/${token}`,
      properties: result.properties.map(p => ({
        uuid: p.uuid,
        address: p.address,
        managerId: p.managerUuid
      }))
    }
  }

  async setupInviteContext(payload: InviteRequest, platformId?: number): Promise<{
    user: any,
    company: any,
    properties: any[]
  }> {
    const { company: companyData, invite } = payload

    // 1. Find or Create Company
    let company = companyData.uuid
      ? await this.companyRepository.findByUuid(companyData.uuid)
      : (companyData.name ? await this.companyRepository.findByName(companyData.name) : null)

    if (!company) {
      if (!companyData.name) {
        throw new BadRequestException('Company name is required for new company')
      }
      company = await this.companyRepository.save({
        uuid: randomUUID(),
        name: companyData.name,
        address: companyData.address,
        platformId: platformId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    } else {
      const updateData: any = {}
      if (companyData.name && company.name !== companyData.name) updateData.name = companyData.name
      if (companyData.address && company.address !== companyData.address) updateData.address = companyData.address

      if (Object.keys(updateData).length > 0) {
        company = await this.companyRepository.update(company.id!, updateData)
      }
    }

    // 2. Find or Create User
    const userData = invite.user
    
    let effectiveEmail = userData.email;
    let user = null;
    
    if (effectiveEmail) {
      user = await this.userRepository.findByEmail(effectiveEmail);
    } else if (userData.phone) {
      user = await this.userRepository.findByPhone(userData.phone);
      effectiveEmail = `${userData.phone.replace('+', '')}@upward.com`;
    } else {
      throw new BadRequestException('User must have either email or phone');
    }

    if (!user) {
      if (!userData.firstName || !userData.lastName) {
        throw new BadRequestException('firstName and lastName are required for new users')
      }
      user = await this.userRepository.save({
        uuid: randomUUID(),
        email: effectiveEmail,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        passwordHash: PASS_PLACEHOLDERS.INVITED,
        isFromInvite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    }

    const existingLink = await this.companyUserRepository.findByCompanyAndUser(company.id!, user.id!)

    if (!existingLink) {
      await this.companyUserRepository.save({
        companyId: company.id!,
        userId: user.id!,
        invitedAt: new Date(),
      } as any)
    } else {
      await this.companyUserRepository.update(existingLink.id!, { invitedAt: new Date() })
    }

    const propertiesToProcess = invite.properties || (invite.property ? [invite.property] : [])
    const createdProperties = await this.processProperties(user, company, propertiesToProcess)
    return { user, company, properties: createdProperties }
  }

  async processProperties(user: any, company: any, properties: InvitePropertyInfo[]): Promise<any[]> {
    const createdProperties = []

    // 3. Process each property
    for (const propData of properties) {
      const managerData = propData.manager
      const locData = propData.location
      const rentData = propData.rent

      if (!rentData.rentAmount || !rentData.rentEndDate) {
        throw new BadRequestException('Rent amount and rent end date are compulsory for all properties');
      }

      // 3a. Find or Create Manager for this property (if provided)
      let manager = null
      if (managerData) {
        manager = managerData.uuid
          ? await this.managerRepository.findByUuid(managerData.uuid)
          : (managerData.email ? await this.managerRepository.findByEmail(managerData.email) : null)

        if (!manager) {
          if (!managerData.firstName || !managerData.lastName || !managerData.email) {
            throw new BadRequestException('Manager details (firstName, lastName, email) are required for new manager')
          }
          manager = await this.managerRepository.save({
            uuid: randomUUID(),
            companyId: company.id!,
            firstName: managerData.firstName,
            lastName: managerData.lastName,
            email: managerData.email,
            phone: managerData.phone,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any)
        }
      }

      // 3b. Find or Create Location
      let location = await this.locationRepository.findByAddress(
        locData.address || '',
        locData.area || '',
        locData.state || '',
        locData.country || 'Nigeria'
      )

      if (!location) {
        location = await this.locationRepository.save({
          uuid: randomUUID(),
          country: locData.country || 'Nigeria',
          state: locData.state || '',
          area: locData.area || '',
          subarea: locData.subArea || locData.subarea || '',
          address: locData.address || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
      }

      // 3c. Find or Create Property record
      const existingProperties = await this.propertyRepository.findByUserId(user.id!)
      let property = existingProperties.find((p: any) =>
        p.companyId === company.id! && p.locationId === location!.id!
      )

      const bankCode = propData.paymentAccount?.bank_code || propData.bankCode
      const accountNumber = propData.paymentAccount?.account_number || propData.accountNumber
      const businessName = propData.paymentAccount?.account_name ||
        (propData.manager?.firstName
          ? `${propData.manager.firstName} ${propData.manager.lastName || ''}`
          : (company.name || 'Property Owner'))

      if (property) {
        property = await this.propertyRepository.update(property.id!, {
          rentAmount: rentData.rentAmount,
          managerId: manager?.id || property.managerId, // Use existing if not provided
          rentEndDate: new Date(rentData.rentEndDate),
          rentStartDate: rentData.rentStartDate ? new Date(rentData.rentStartDate) : property.rentStartDate,
          subaccountId: property.subaccountId,
          amountRemaining: rentData.rentAmount,
          isVerified: true
        })
      } else {
        property = await this.propertyRepository.save({
          uuid: randomUUID(),
          userId: user.id!,
          companyId: company.id!,
          managerId: manager?.id,
          locationId: location.id!,
          rentAmount: rentData.rentAmount,
          rentEndDate: new Date(rentData.rentEndDate),
          rentStartDate: rentData.rentStartDate ? new Date(rentData.rentStartDate) : undefined,
          currency: (rentData as any).currency || 'NGN',
          subaccountId: undefined,
          amountRemaining: rentData.rentAmount,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
      }

      // Sync Rent History to Rent Cycles
      if (propData.rentHistory && propData.rentHistory.length > 0) {
        this.logger.log(`Syncing ${propData.rentHistory.length} history records for property ${property.uuid}`);
        for (const history of propData.rentHistory) {
          // Check for duplicates to prevent double-counting if invited multiple times
          const existingCycle = await this.prisma.upward_rent_cycle.findFirst({
            where: {
              userPropertyId: property.id,
              paidAt: new Date(history.paymentDate),
              amountPaid: history.amount
            }
          });

          if (!existingCycle) {
            await this.prisma.upward_rent_cycle.create({
              data: {
                userId: user.id,
                userPropertyId: property.id,
                amountOwed: history.amount,
                amountPaid: history.amount,
                currency: (rentData as any).currency || 'NGN',
                dueDate: history.periodEnd ? new Date(history.periodEnd) : new Date(history.paymentDate),
                paidAt: new Date(history.paymentDate),
                status: 'PAID',
                description: history.notes || 'Historical rent payment (PM Sync)',
                source: 'PM_SYNC',
              }
            });
          }
        }
      }

      const now = new Date()
      const dueDate = new Date(rentData.rentEndDate)
      const diff = dueDate.getTime() - now.getTime()
      const daysUntilDue = Math.ceil(diff / (1000 * 60 * 60 * 24))

      if (daysUntilDue <= 14) {
        const amountStr = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(rentData.rentAmount)
        const urgencyMsg = daysUntilDue < 0 ? 'is OVERDUE' : daysUntilDue === 0 ? 'is DUE TODAY' : `is due in ${daysUntilDue} days`

        await this.notificationService.notifyUser(user.id, {
          title: 'Rent Reminder',
          message: `Your rent for ${locData.address || locData.area} ${urgencyMsg}. Amount: ${amountStr}`,
          type: 'RENT_REMINDER',
          url: `/dashboard/pay-rent?propertyUuid=${property.uuid}`
        })
      }

      if (propData.allowDirectBankTransfer && bankCode && accountNumber) {
        await this.addManualAccountUseCase.execute({
          userPropertyId: property.id,
          accountNumber,
          accountName: businessName,
          bankName: propData.paymentAccount?.bank_name || '',
          bankCode,
        })
      }

      const finalManager = (manager || property.manager) as any

      createdProperties.push({
        ...property,
        company,
        manager: finalManager,
        address: locData.address || locData.area,
        managerUuid: finalManager?.uuid || (property.manager as any)?.uuid,
        bankCode,
        accountNumber,
        businessName
      })
    }

    return createdProperties
  }
}