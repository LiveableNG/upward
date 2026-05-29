import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetFeeOverridesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute() {
    const overrides = await this.prisma.upward_fee_override.findMany({
      orderBy: { createdAt: 'desc' }
    })

    const resolvedOverrides: any[] = []

    for (const override of overrides) {
      let name = 'Unknown'
      let email = ''

      try {
        if (override.targetType === 'USER') {
          const u = await this.prisma.upward_user.findUnique({
            where: { uuid: override.targetId }
          })
          if (u) {
            const firstName = u.firstName ? (u.firstName.includes(':') ? this.encryption.decrypt(u.firstName) : u.firstName) : ''
            const lastName = u.lastName ? (u.lastName.includes(':') ? this.encryption.decrypt(u.lastName) : u.lastName) : ''
            name = `${firstName} ${lastName}`.trim() || 'Unnamed User'
            email = u.email ? (u.email.includes(':') ? this.encryption.decrypt(u.email) : u.email) : ''
          }
        } else if (override.targetType === 'PM') {
          const pm = await this.prisma.upward_property_manager.findUnique({
            where: { uuid: override.targetId }
          })
          if (pm) {
            const firstName = pm.firstName ? (pm.firstName.includes(':') ? this.encryption.decrypt(pm.firstName) : pm.firstName) : ''
            const lastName = pm.lastName ? (pm.lastName.includes(':') ? this.encryption.decrypt(pm.lastName) : pm.lastName) : ''
            const businessName = pm.businessName ? (pm.businessName.includes(':') ? this.encryption.decrypt(pm.businessName) : pm.businessName) : ''
            name = businessName || `${firstName} ${lastName}`.trim() || 'Unnamed PM'
            email = pm.email ? (pm.email.includes(':') ? this.encryption.decrypt(pm.email) : pm.email) : ''
          }
        } else if (override.targetType === 'COMPANY') {
          const c = await this.prisma.upward_company.findUnique({
            where: { uuid: override.targetId }
          })
          if (c) {
            name = c.name ? (c.name.includes(':') ? this.encryption.decrypt(c.name) : c.name) : 'Unnamed Company'
            email = c.email ? (c.email.includes(':') ? this.encryption.decrypt(c.email) : c.email) : ''
          }
        } else if (override.targetType === 'PLATFORM') {
          const p = await this.prisma.upward_platform.findUnique({
            where: { uuid: override.targetId }
          })
          if (p) {
            name = p.name ? (p.name.includes(':') ? this.encryption.decrypt(p.name) : p.name) : 'Unnamed Platform'
            email = p.email ? (p.email.includes(':') ? this.encryption.decrypt(p.email) : p.email) : ''
          }
        }
      } catch (err) {
        console.error(`Failed to resolve override target: ${override.targetType} / ${override.targetId}`, err)
      }

      resolvedOverrides.push({
        ...override,
        targetName: name,
        targetEmail: email,
      })
    }

    return resolvedOverrides
  }
}

import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'

@Injectable()
export class UpsertFeeOverrideUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentConfig: PaymentConfigurationService,
  ) {}

  async execute(data: { targetType: string; targetId: string; fee: number }) {
    const res = await this.prisma.upward_fee_override.upsert({
      where: {
        targetType_targetId: {
          targetType: data.targetType,
          targetId: data.targetId
        }
      },
      create: {
        targetType: data.targetType,
        targetId: data.targetId,
        fee: data.fee
      },
      update: {
        fee: data.fee
      }
    })

    if (data.targetType === 'SYSTEM' && data.targetId === 'GLOBAL') {
      await this.paymentConfig.refreshCache()
    }

    return res
  }
}

@Injectable()
export class DeleteFeeOverrideUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentConfig: PaymentConfigurationService,
  ) {}

  async execute(targetType: string, targetId: string) {
    const res = await this.prisma.upward_fee_override.delete({
      where: {
        targetType_targetId: {
          targetType,
          targetId
        }
      }
    })

    if (targetType === 'SYSTEM' && targetId === 'GLOBAL') {
      await this.paymentConfig.refreshCache()
    }

    return res
  }
}

@Injectable()
export class SearchFeeTargetsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(query: string, filterType?: string, pmUuid?: string) {
    const searchString = query ? query.toLowerCase().trim() : ''

    // 1. Fetch existing overrides to attach to results
    const overrides = await this.prisma.upward_fee_override.findMany()
    const getActiveFee = (type: string, id: string) => {
      const match = overrides.find(o => o.targetType === type && o.targetId === id)
      return match ? match.fee : null
    }

    const results: any[] = []

    // 2. Fetch and Decrypt Platforms (Filter 'PLATFORM' or all)
    if (!filterType || filterType === 'PLATFORM') {
      const platforms = await this.prisma.upward_platform.findMany()
      for (const p of platforms) {
        const email = p.email ? (p.email.includes(':') ? this.encryption.decrypt(p.email) : p.email) : ''
        const name = p.name ? (p.name.includes(':') ? this.encryption.decrypt(p.name) : p.name) : ''

        const matchesSearch = !searchString || 
          name.toLowerCase().includes(searchString) || 
          email.toLowerCase().includes(searchString)

        if (matchesSearch) {
          results.push({
            id: p.uuid,
            name,
            email,
            type: 'PLATFORM',
            fee: getActiveFee('PLATFORM', p.uuid)
          })
        }
      }
    }

    // 3. Fetch and Decrypt Companies (Filter 'COMPANY' or all)
    if (!filterType || filterType === 'COMPANY') {
      const companies = await this.prisma.upward_company.findMany()
      for (const c of companies) {
        const name = c.name ? (c.name.includes(':') ? this.encryption.decrypt(c.name) : c.name) : 'Unnamed Company'
        const email = c.email ? (c.email.includes(':') ? this.encryption.decrypt(c.email) : c.email) : ''

        const matchesSearch = !searchString || 
          name.toLowerCase().includes(searchString) || 
          email.toLowerCase().includes(searchString)

        if (matchesSearch) {
          results.push({
            id: c.uuid,
            name,
            email,
            type: 'COMPANY',
            fee: getActiveFee('COMPANY', c.uuid)
          })
        }
      }
    }

    // 4. Fetch and Decrypt Property Managers (Filter 'PM' or all)
    if (!filterType || filterType === 'PM') {
      const pms = await this.prisma.upward_property_manager.findMany()
      for (const pm of pms) {
        const firstName = pm.firstName ? (pm.firstName.includes(':') ? this.encryption.decrypt(pm.firstName) : pm.firstName) : ''
        const lastName = pm.lastName ? (pm.lastName.includes(':') ? this.encryption.decrypt(pm.lastName) : pm.lastName) : ''
        const businessName = pm.businessName ? (pm.businessName.includes(':') ? this.encryption.decrypt(pm.businessName) : pm.businessName) : ''
        const email = pm.email ? (pm.email.includes(':') ? this.encryption.decrypt(pm.email) : pm.email) : ''

        const displayName = businessName || `${firstName} ${lastName}`.trim() || 'Unnamed PM'

        const matchesSearch = !searchString || 
          displayName.toLowerCase().includes(searchString) || 
          email.toLowerCase().includes(searchString)

        if (matchesSearch) {
          results.push({
            id: pm.uuid,
            name: displayName,
            email,
            type: 'PM',
            fee: getActiveFee('PM', pm.uuid)
          })
        }
      }
    }

    if (!filterType || filterType === 'USER') {
      let users: any[] = []

      if (pmUuid) {
        const pm = await this.prisma.upward_property_manager.findUnique({
          where: { uuid: pmUuid }
        })
        if (pm) {
          const userProps = await this.prisma.upward_user_property.findMany({
            where: { pmId: pm.id, isPastTenancy: false },
            include: { user: true }
          })
          users = userProps.map(up => up.user).filter(Boolean)
        }
      } else {
        users = await this.prisma.upward_user.findMany()
      }

      for (const u of users) {
        const firstName = u.firstName ? (u.firstName.includes(':') ? this.encryption.decrypt(u.firstName) : u.firstName) : ''
        const lastName = u.lastName ? (u.lastName.includes(':') ? this.encryption.decrypt(u.lastName) : u.lastName) : ''
        const email = u.email ? (u.email.includes(':') ? this.encryption.decrypt(u.email) : u.email) : ''

        const displayName = `${firstName} ${lastName}`.trim() || 'Unnamed User'

        const matchesSearch = !searchString || 
          displayName.toLowerCase().includes(searchString) || 
          email.toLowerCase().includes(searchString)

        if (matchesSearch) {
          results.push({
            id: u.uuid,
            name: displayName,
            email,
            type: 'USER',
            fee: getActiveFee('USER', u.uuid)
          })
        }
      }
    }

    return results.slice(0, 100)
  }
}
