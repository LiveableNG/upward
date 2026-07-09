import { Injectable } from '@nestjs/common'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetPmMetricsUseCase {
  constructor(private readonly encryption: EncryptionService) {}

  execute(allPms: any[], allCompanies: any[], successTransactions: any[], allUsers: any[]) {
    const finalPmDirectoryRaw = allPms.map((pm) => {
      const pmSubaccountUuids = pm.userProperties
        .map((up: any) => up.subaccount?.uuid)
        .filter(Boolean) as string[]

      const pmTx = successTransactions.filter((tx) => {
        if (!tx.landlordId) return false
        return pmSubaccountUuids.includes(tx.landlordId)
      })
      const totalGenerated = pmTx.reduce((sum, tx) => sum + tx.amount, 0)

      const decryptedFirstName = pm.firstName ? this.encryption.decrypt(pm.firstName).trim() : ''
      const decryptedLastName = pm.lastName ? this.encryption.decrypt(pm.lastName).trim() : ''
      const decryptedBusinessName = pm.businessName ? this.encryption.decrypt(pm.businessName).trim() : ''

      let platformCompanyName = ''
      const firstCompany = pm.userProperties.find((up: any) => up.company)?.company
      if (firstCompany && firstCompany.name) {
        platformCompanyName = this.encryption.decrypt(firstCompany.name).trim()
      }

      const resolvedBusinessName = platformCompanyName || (decryptedBusinessName && decryptedBusinessName !== 'No Business Name'
        ? decryptedBusinessName
        : `${decryptedFirstName} ${decryptedLastName}`.trim() || 'Platform PM')

      const companyUuids = Array.from(new Set(
        pm.userProperties.map((up: any) => up.company?.uuid).filter(Boolean) as string[]
      ))

      return {
        id: pm.id.toString(),
        uuid: pm.uuid,
        email: pm.email ? this.encryption.decrypt(pm.email) : '',
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        businessName: resolvedBusinessName,
        phone: pm.phone ? this.encryption.decrypt(pm.phone) : 'N/A',
        isVerified: pm.isVerified,
        propertiesCount: pm.properties.length,
        unitsCount: pm.properties.reduce((sum: number, p: any) => sum + p.units.length, 0),
        totalGenerated,
        createdAt: pm.createdAt,
        pmType: 'Upward PM',
        mergedUuids: [pm.uuid, ...companyUuids],
      }
    })

    const finalCompanyDirectory = allCompanies.map((c) => {
      const companySubaccountUuids = c.properties
        .map((p: any) => p.subaccount?.uuid)
        .filter(Boolean) as string[]

      const companyTx = successTransactions.filter((tx) => {
        if (tx.landlordId && companySubaccountUuids.includes(tx.landlordId)) {
          return true
        }
        const user = allUsers.find((u) => u.id === tx.userId)
        return user && user.properties.some((p: any) => p.companyId === c.id)
      })

      const totalGenerated = companyTx.reduce((sum, tx) => sum + tx.amount, 0)

      const decryptedName = this.encryption.decrypt(c.name).trim()
      const decryptedEmail = c.email ? this.encryption.decrypt(c.email).trim() : ''
      const decryptedPhone = c.phone ? this.encryption.decrypt(c.phone).trim() : 'N/A'

      const firstManager = c.managers && c.managers[0]
      let resolvedFirstName = ''
      let resolvedLastName = ''
      let resolvedEmail = decryptedEmail
      let resolvedPhone = decryptedPhone

      if (firstManager) {
        resolvedFirstName = firstManager.firstName ? this.encryption.decrypt(firstManager.firstName).trim() : ''
        resolvedLastName = firstManager.lastName ? this.encryption.decrypt(firstManager.lastName).trim() : ''
        
        if (!resolvedEmail) {
          resolvedEmail = firstManager.email ? this.encryption.decrypt(firstManager.email).trim() : ''
        }
        if (!resolvedPhone || resolvedPhone === 'N/A') {
          resolvedPhone = firstManager.phone ? this.encryption.decrypt(firstManager.phone).trim() : 'N/A'
        }
      }

      return {
        id: `co_${c.id}`,
        uuid: c.uuid,
        email: resolvedEmail,
        firstName: resolvedFirstName,
        lastName: resolvedLastName,
        businessName: decryptedName,
        phone: resolvedPhone,
        isVerified: true,
        propertiesCount: c.properties.length,
        unitsCount: c.properties.length,
        totalGenerated,
        createdAt: c.createdAt,
        pmType: 'Platform',
      }
    })

    const finalPmDirectory = [...finalPmDirectoryRaw, ...finalCompanyDirectory]

    return {
      finalPmDirectory,
    }
  }
}
