import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetAdminPmDetailUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptTenant(t: any) {
    let email = ''
    let firstName = ''
    let lastName = ''
    let phone = ''

    try {
      email = t.emailEncrypted ? this.encryption.decrypt(t.emailEncrypted) : ''
      firstName = t.firstNameEncrypted ? this.encryption.decrypt(t.firstNameEncrypted) : ''
      lastName = t.lastNameEncrypted ? this.encryption.decrypt(t.lastNameEncrypted) : ''
      phone = t.phoneEncrypted ? this.encryption.decrypt(t.phoneEncrypted) : ''
    } catch (err) {
      email = t.emailEncrypted || ''
      firstName = t.firstNameSearch || ''
      lastName = t.lastNameSearch || ''
      phone = t.phoneEncrypted || ''
    }

    return {
      ...t,
      email,
      firstName,
      lastName,
      phone,
    }
  }

  private decryptOptional(value?: string | null) {
    if (!value) return ''

    try {
      return this.encryption.decrypt(value)
    } catch (err) {
      return value
    }
  }

  async execute(uuid: string) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid },
      include: {
        properties: {
          include: {
            units: {
              include: {
                tenant: true,
                userProperties: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        tenants: true,
        verification: true,
        subscription: true,
      },
    })

    const subscriptionLogs = pm
      ? await this.prisma.upward_subscription_log.findMany({
          where: { pmId: pm.id },
          include: {
            admin: {
              select: {
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : []

    if (!pm) {
      // Try finding platform company in upward_company
      const company = await this.prisma.upward_company.findUnique({
        where: { uuid },
        include: {
          properties: {
            include: {
              user: true,
              location: true,
            },
          },
          managers: true,
        },
      })

      if (!company) {
        throw new NotFoundException('Property Manager or Platform Company not found')
      }

      const decryptedName = this.encryption.decrypt(company.name).trim()
      const decryptedEmail = company.email ? this.encryption.decrypt(company.email).trim() : ''
      const decryptedPhone = company.phone ? this.encryption.decrypt(company.phone).trim() : 'N/A'

      const firstManager = company.managers && company.managers[0]
      let resolvedFirstName = ''
      let resolvedLastName = ''
      
      if (firstManager) {
        resolvedFirstName = firstManager.firstName ? this.encryption.decrypt(firstManager.firstName).trim() : ''
        resolvedLastName = firstManager.lastName ? this.encryption.decrypt(firstManager.lastName).trim() : ''
      }

      // Map tenancy properties to standard property/units layout
      const mappedProperties = company.properties.map((p) => {
        let tenantInfo: any = null
        if (p.user) {
          let email = ''
          let firstName = ''
          let lastName = ''
          let phone = ''

          try {
            email = this.encryption.decrypt(p.user.email)
            firstName = this.encryption.decrypt(p.user.firstName)
            lastName = this.encryption.decrypt(p.user.lastName)
            phone = p.user.phone ? this.encryption.decrypt(p.user.phone) : ''
          } catch (err) {
            email = p.user.email
            firstName = p.user.firstName
            lastName = p.user.lastName
            phone = p.user.phone || ''
          }

          tenantInfo = {
            uuid: p.user.uuid,
            firstName,
            lastName,
            email,
            phone,
          }
        }

        return {
          id: p.id,
          address: p.location?.address || 'Property Tenancy',
          currency: p.currency,
          subaccountId: p.subaccountId ? p.subaccountId.toString() : 'None linked',
          units: [
            {
              id: p.id,
              unitName: 'Main Unit',
              rentAmount: p.rentAmount,
              rentStartDate: p.rentStartDate,
              rentDueDate: p.rentEndDate,
              currency: p.currency,
              status: p.user ? 'OCCUPIED' : 'VACANT',
              tenant: tenantInfo,
            }
          ]
        }
      })

      // Get tenants list
      const companyTenants = company.properties.map((p) => {
        if (!p.user) return null
        let email = ''
        let firstName = ''
        let lastName = ''
        let phone = ''

        try {
          email = this.encryption.decrypt(p.user.email)
          firstName = this.encryption.decrypt(p.user.firstName)
          lastName = this.encryption.decrypt(p.user.lastName)
          phone = p.user.phone ? this.encryption.decrypt(p.user.phone) : ''
        } catch (err) {
          email = p.user.email
          firstName = p.user.firstName
          lastName = p.user.lastName
          phone = p.user.phone || ''
        }

        return {
          id: p.user.id,
          uuid: p.user.uuid,
          email,
          firstName,
          lastName,
          phone,
          inviteStatus: 'ACCEPTED',
        }
      }).filter(Boolean)

      return {
        type: 'PM',
        id: `co_${company.id}`,
        uuid: company.uuid,
        email: decryptedEmail,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        businessName: decryptedName,
        phone: decryptedPhone,
        isVerified: true,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        properties: mappedProperties,
        tenants: companyTenants,
        rentPayments: [],
        activityLogs: [],
        verification: null,
      }
    }

    // Decrypt tenants list
    const decryptedTenants = pm.tenants.map((t) => this.decryptTenant(t))

    // Decrypt tenants inside properties.units
    const decryptedProperties = pm.properties.map((prop) => {
      const decryptedUnits = prop.units.map((unit: any) => {
        let tenantInfo: any = null

        if (unit.tenant) {
          tenantInfo = this.decryptTenant(unit.tenant)
        } else if (unit.userProperties && unit.userProperties.length > 0) {
          const activeUpwardUser = unit.userProperties[0]?.user
          if (activeUpwardUser) {
            let email = ''
            let firstName = ''
            let lastName = ''
            let phone = ''

            try {
              email = this.encryption.decrypt(activeUpwardUser.email)
              firstName = this.encryption.decrypt(activeUpwardUser.firstName)
              lastName = this.encryption.decrypt(activeUpwardUser.lastName)
              phone = activeUpwardUser.phone ? this.encryption.decrypt(activeUpwardUser.phone) : ''
            } catch (err) {
              email = activeUpwardUser.email
              firstName = activeUpwardUser.firstName
              lastName = activeUpwardUser.lastName
              phone = activeUpwardUser.phone || ''
            }

            tenantInfo = {
              uuid: activeUpwardUser.uuid,
              firstName,
              lastName,
              email,
              phone,
            }
          }
        }

        return {
          ...unit,
          tenant: tenantInfo
        }
      })
      return {
        ...prop,
        units: decryptedUnits
      }
    })

    // Fetch activity logs
    const activityLogs = await this.prisma.upward_app_activity_log.findMany({
      where: {
        OR: [
          { pmId: pm.id },
          { userEmail: pm.email },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Fetch rent payments recorded
    const rentPayments = await this.prisma.upward_pm_rent_payment.findMany({
      where: {
        unit: {
          property: {
            pmId: pm.id,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    })

    return {
      type: 'PM',
      id: pm.id.toString(),
      uuid: pm.uuid,
      email: this.decryptOptional(pm.email),
      firstName: this.decryptOptional(pm.firstName),
      lastName: this.decryptOptional(pm.lastName),
      businessName: this.decryptOptional(pm.businessName),
      phone: this.decryptOptional(pm.phone),
      personalEmail: this.decryptOptional(pm.personalEmail),
      personalPhone: this.decryptOptional(pm.personalPhone),
      isVerified: pm.isVerified,
      isBlocked: pm.isBlocked,
      isManuallyBlocked: (pm as any).isManuallyBlocked,
      createdAt: pm.createdAt,
      updatedAt: pm.updatedAt,
      properties: decryptedProperties,
      tenants: decryptedTenants,
      rentPayments,
      activityLogs,
      verification: pm.verification,
      subscription: pm.subscription,
      subscriptionLogs,
    }
  }
}
