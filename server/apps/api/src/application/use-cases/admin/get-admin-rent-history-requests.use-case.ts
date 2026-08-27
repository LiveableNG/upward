import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetAdminRentHistoryRequestsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute() {
    const requests = await this.prisma.upward_credibility_request.findMany({
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const enriched = await Promise.all(
      requests.map(async (req) => {
        let tenantEmail = ''
        let tenantName = ''
        let tenantPhone = ''

        try {
          tenantEmail = this.encryption.decrypt(req.user.email)
          tenantName = `${this.encryption.decrypt(req.user.firstName)} ${this.encryption.decrypt(req.user.lastName)}`.trim()
          tenantPhone = req.user.phone ? this.encryption.decrypt(req.user.phone) : ''
        } catch (e) {
          tenantEmail = req.user.email
          tenantName = `${req.user.firstName} ${req.user.lastName}`.trim()
          tenantPhone = req.user.phone || ''
        }

        const property = await this.prisma.upward_user_property.findFirst({
          where: { uuid: req.propertyUuid, userId: req.userId },
          include: { location: true },
        })

        const propertyAddress =
          property?.location?.address || property?.location?.area || 'Property'

        // Fetch ingested rent cycles for this property
        const pastCycles = await this.prisma.upward_rent_cycle.findMany({
          where: {
            userId: req.userId,
            userPropertyId: property?.id,
          },
          orderBy: { dueDate: 'asc' },
        })

        let yearsOfHistory = 0
        const firstCycle = pastCycles[0]
        const lastCycle = pastCycles[pastCycles.length - 1]
        if (firstCycle && lastCycle) {
          const firstDate = new Date(firstCycle.dueDate).getTime()
          const lastDate = new Date(lastCycle.dueDate).getTime()
          const diffMs = Math.max(0, lastDate - firstDate)
          yearsOfHistory = parseFloat((diffMs / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1))
        }

        let companyName = null
        let managerName = null
        let pmEmail = null
        let pmPhone = null

        try {
          companyName = req.companyName ? this.encryption.decrypt(req.companyName) : null
          managerName = req.managerName ? this.encryption.decrypt(req.managerName) : null
          pmEmail = req.email ? this.encryption.decrypt(req.email) : null
          pmPhone = req.phone ? this.encryption.decrypt(req.phone) : null
        } catch (e) {
          companyName = req.companyName
          managerName = req.managerName
          pmEmail = req.email
          pmPhone = req.phone
        }

        return {
          id: req.id,
          uuid: req.uuid,
          tenant: {
            id: req.user.id,
            uuid: req.user.uuid,
            name: tenantName,
            email: tenantEmail,
            phone: tenantPhone,
          },
          propertyUuid: req.propertyUuid,
          propertyAddress,
          pmDetails: {
            companyName,
            managerName,
            email: pmEmail,
            phone: pmPhone,
          },
          status: req.status,
          sentToPmAt: req.createdAt,
          fulfilledAt: req.status === 'COMPLETED' ? req.updatedAt : null,
          yearsOfHistory,
          submittedRecordsCount: pastCycles.length,
          submittedRecords: pastCycles.map((c) => ({
            id: c.id,
            uuid: c.uuid,
            amountOwed: c.amountOwed,
            amountPaid: c.amountPaid,
            dueDate: c.dueDate,
            paidAt: c.paidAt,
            status: c.status,
            source: c.source,
          })),
        }
      })
    )

    return enriched
  }
}
