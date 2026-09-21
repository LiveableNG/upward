import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { PM_SIGNATURE_REPOSITORY, IPmSignatureRepository } from '../../../../domains/pm/pm-signature.repository'

export interface GetDocumentSignatureContextDto {
  actorPmId: number
  unitUuid?: string
  tenantUuid?: string
}

@Injectable()
export class GetDocumentSignatureContextUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_SIGNATURE_REPOSITORY) private readonly signatureRepo: IPmSignatureRepository,
  ) {}

  private async mapSignaturesForPm(pmId: number) {
    const signatures = await this.signatureRepo.findByPmId(pmId)
    return signatures.map((sig) => ({
      ...sig,
      fileUrl: sig.fileKey ? `/api/v1/public/documents/signatures/${sig.uuid}/image` : null,
    }))
  }

  private async actorCanAccessCompanyProperty(
    actorPmId: number,
    companyPmId: number,
    propertyId: number,
  ): Promise<boolean> {
    if (actorPmId === companyPmId) return true

    const teamCollab = await (this.prisma as any).upward_pm_team_collaboration.findUnique({
      where: {
        ownerPmId_collaboratorPmId: {
          ownerPmId: companyPmId,
          collaboratorPmId: actorPmId,
        },
      },
    })

    if (!teamCollab || teamCollab.status !== 'ACCEPTED') return false
    if (teamCollab.accessLevel === 'ALL') return true

    const propertyCollab = await (this.prisma as any).upward_pm_property_collaboration.findUnique({
      where: {
        propertyId_collaboratorPmId: {
          propertyId,
          collaboratorPmId: actorPmId,
        },
      },
    })

    return !!propertyCollab
  }

  private async actorCanAccessCompanyTenant(actorPmId: number, companyPmId: number): Promise<boolean> {
    if (actorPmId === companyPmId) return true

    const teamCollab = await (this.prisma as any).upward_pm_team_collaboration.findUnique({
      where: {
        ownerPmId_collaboratorPmId: {
          ownerPmId: companyPmId,
          collaboratorPmId: actorPmId,
        },
      },
    })

    return !!(teamCollab && teamCollab.status === 'ACCEPTED')
  }

  async execute(dto: GetDocumentSignatureContextDto) {
    const { actorPmId, unitUuid, tenantUuid } = dto
    let companyPmId = actorPmId

    if (unitUuid) {
      const unit = await this.prisma.upward_pm_unit.findUnique({
        where: { uuid: unitUuid },
        include: { property: { select: { id: true, pmId: true } } },
      })
      if (!unit?.property) throw new NotFoundException('Unit not found')

      const allowed = await this.actorCanAccessCompanyProperty(
        actorPmId,
        unit.property.pmId,
        unit.property.id,
      )
      if (!allowed) throw new ForbiddenException('No access to this unit')

      companyPmId = unit.property.pmId
    } else if (tenantUuid) {
      const tenant = await (this.prisma as any).upward_pm_tenant.findUnique({
        where: { uuid: tenantUuid },
        select: { pmId: true },
      })
      if (!tenant) throw new NotFoundException('Tenant not found')

      const allowed = await this.actorCanAccessCompanyTenant(actorPmId, tenant.pmId)
      if (!allowed) throw new ForbiddenException('No access to this tenant')

      companyPmId = tenant.pmId
    } else {
      const own = await this.mapSignaturesForPm(actorPmId)
      if (own.length > 0) {
        return {
          hasSignature: true,
          signatures: own,
          source: 'own' as const,
        }
      }

      const collabs = await (this.prisma as any).upward_pm_team_collaboration.findMany({
        where: { collaboratorPmId: actorPmId, status: 'ACCEPTED' },
        select: { ownerPmId: true },
        orderBy: { createdAt: 'asc' },
      })

      for (const collab of collabs) {
        const company = await this.mapSignaturesForPm(collab.ownerPmId)
        if (company.length > 0) {
          return {
            hasSignature: true,
            signatures: company,
            source: 'company' as const,
          }
        }
      }

      return {
        hasSignature: false,
        signatures: [],
        source: 'none' as const,
      }
    }

    const signatures = await this.mapSignaturesForPm(companyPmId)
    return {
      hasSignature: signatures.length > 0,
      signatures,
      source: companyPmId === actorPmId ? ('own' as const) : ('company' as const),
    }
  }
}
