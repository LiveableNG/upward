import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY, PASS_PLACEHOLDERS, User } from '../../../domains/users/user.repository'
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
import { RentalPeriodService } from '../../services/rental-period.service'
import { SyncUserSequenceChannelUseCase } from '../sequence/sync-user-sequence-channel.use-case'

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
    private readonly rentalPeriodService: RentalPeriodService,
    private readonly syncUserSequenceChannelUseCase: SyncUserSequenceChannelUseCase,
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

    const incomingLogo = companyData.logoUrl || (companyData as any).logo

    if (!company) {
      if (!companyData.name) {
        throw new BadRequestException('Company name is required for new company')
      }
      company = await this.companyRepository.save({
        uuid: randomUUID(),
        name: companyData.name,
        address: companyData.address,
        logoUrl: incomingLogo || null,
        platformId: platformId || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
    } else {
      const updateData: any = {}
      if (companyData.name && company.name !== companyData.name) updateData.name = companyData.name
      if (companyData.address && company.address !== companyData.address) updateData.address = companyData.address
      if (incomingLogo && company.logoUrl !== incomingLogo) updateData.logoUrl = incomingLogo

      if (Object.keys(updateData).length > 0) {
        company = await this.companyRepository.update(company.id!, updateData)
      }
    }

    // 2. Find or Create User
    const userData = invite.user
    
    let effectiveEmail = userData.email;
    let user: User | null = null;
    
    if (effectiveEmail) {
      user = await this.userRepository.findByEmail(effectiveEmail);
    }
    
    if (!user && userData.phone) {
      user = await this.userRepository.findByPhone(userData.phone);
    }

    if (!user && !effectiveEmail && userData.phone) {
      effectiveEmail = `${userData.phone.replace('+', '')}@upward.com`;
    }

    if (!user && !effectiveEmail && !userData.phone) {
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
        invitedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      
    } else if (!user.phone && userData.phone) {
      await this.userRepository.update(user.id!, {
        phone: userData.phone,
        phoneHash: this.encryption.hash(userData.phone),
      } as any)
      const reloadedUser = await this.userRepository.findById(user.id!)
      if (reloadedUser) user = reloadedUser

      if (user.passwordHash !== PASS_PLACEHOLDERS.INVITED && (user.phone || userData.phone)) {
        const phone = user.phone || userData.phone!
        this.syncUserSequenceChannelUseCase
          .execute({
            userId: user.id!,
            firstName: user.firstName || userData.firstName || '',
            phoneEncrypted: phone,
            phoneHash: user.phoneHash || this.encryption.hash(phone),
            pmName: company?.name ? this.encryption.decrypt(company.name) : undefined,
          })
          .catch(e => this.logger.error('Failed to sync sequence channel on single invite', e))
      }
    }

    if (!user) {
      throw new Error('Failed to create or update user');
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
    const createdProperties = await this.processProperties(user, company, propertiesToProcess, platformId)
    return { user, company, properties: createdProperties }
  }

  async processProperties(user: any, company: any, properties: InvitePropertyInfo[], platformId?: number): Promise<any[]> {
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
        } else {
          const updateData: any = {}
          if (managerData.firstName && manager.firstName !== managerData.firstName) updateData.firstName = managerData.firstName
          if (managerData.lastName && manager.lastName !== managerData.lastName) updateData.lastName = managerData.lastName
          if (managerData.phone && manager.phone !== managerData.phone) updateData.phone = managerData.phone

          if (Object.keys(updateData).length > 0) {
            manager = await this.managerRepository.update(manager.id!, updateData)
          }
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

      const targetPlatformId = platformId ?? property?.platformId
      const targetExternalUnitId = propData.externalUnitId ?? property?.externalUnitId

      if (targetPlatformId !== undefined && targetPlatformId !== null && targetExternalUnitId !== undefined && targetExternalUnitId !== null) {
        const existingMapping = await this.propertyRepository.findByPlatformUnit(targetPlatformId, targetExternalUnitId)
        if (existingMapping && (!property || existingMapping.id !== property.id)) {
          await this.propertyRepository.update(existingMapping.id!, {
            platformId: null as any,
            externalUnitId: null as any,
            externalPropertyId: null as any,
          })
        }
      }

      const leaseYears = rentData.leaseYears ?? 1
      const rentType = rentData.rentType || 'Annually'

      const rentalState = this.rentalPeriodService.initializeRentalState({
        rentAmount: rentData.rentAmount,
        rentStartDate: rentData.rentStartDate,
        rentEndDate: rentData.rentEndDate,
        rentType,
        initialAmountPaid: rentData.initialAmountPaid,
        isFirstRent: rentData.isFirstRent,
        leaseYears,
      })

      if (property) {
        property = await this.propertyRepository.update(property.id!, {
          rentAmount: rentData.rentAmount,
          managerId: manager?.id || property.managerId, // Use existing if not provided
          rentEndDate: rentalState.rentEndDate,
          rentStartDate: rentalState.rentStartDate,
          subaccountId: property.subaccountId,
          amountPaid: rentalState.amountPaid,
          amountRemaining: rentalState.amountRemaining,
          isFirstRent: rentalState.isFirstRent,
          initialAmountPaid: rentalState.initialAmountPaid,
          leaseYears,
          rentType,
          isVerified: true,
          platformId: platformId ?? property.platformId,
          externalUnitId: propData.externalUnitId ?? property.externalUnitId,
          externalPropertyId: propData.externalPropertyId ?? property.externalPropertyId,
        })
      } else {
        property = await this.propertyRepository.save({
          uuid: randomUUID(),
          userId: user.id!,
          companyId: company.id!,
          managerId: manager?.id,
          locationId: location.id!,
          rentAmount: rentData.rentAmount,
          rentEndDate: rentalState.rentEndDate,
          rentStartDate: rentalState.rentStartDate,
          currency: (rentData as any).currency || 'NGN',
          platformId: platformId,
          externalUnitId: propData.externalUnitId,
          externalPropertyId: propData.externalPropertyId,
          subaccountId: undefined,
          amountPaid: rentalState.amountPaid,
          amountRemaining: rentalState.amountRemaining,
          isFirstRent: rentalState.isFirstRent,
          initialAmountPaid: rentalState.initialAmountPaid,
          leaseYears,
          rentType,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
      }

      if (property.id && rentalState.rentStartDate && rentalState.rentEndDate) {
        await this.rentalPeriodService.ensureInitialTenancyPeriod({
          userPropertyId: property.id,
          startDate: rentalState.rentStartDate,
          endDate: rentalState.rentEndDate,
          rentAmount: rentData.rentAmount,
          currency: (rentData as any).currency || 'NGN',
          txClient: this.prisma,
        });
      }

      if (rentalState.initialAmountPaid > 0 && property.id) {
        const existingRecord = await this.prisma.upward_platform_rent_payment.findFirst({
          where: { userPropertyId: property.id, notes: 'Initial Onboarding Payment' }
        })
        if (!existingRecord) {
          await this.prisma.upward_platform_rent_payment.create({
            data: {
              userPropertyId: property.id,
              amount: rentalState.initialAmountPaid,
              rentAmountAtPayment: rentData.rentAmount,
              paymentDate: new Date(),
              method: 'INITIAL_ONBOARDING',
              status: 'SUCCESS',
              notes: 'Initial Onboarding Payment',
              periodStart: rentalState.rentStartDate,
              periodEnd: rentalState.rentEndDate,
            }
          })
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