import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../../domains/pm/pm-letterhead.repository'
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service'

export interface GetDocumentLetterheadContextDto {
  actorPmId: number
  unitUuid?: string
  tenantUuid?: string
}

@Injectable()
export class GetDocumentLetterheadContextUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
    private readonly s3Service: S3Service,
  ) {}

  private async pmHasLetterhead(pmId: number): Promise<{
    hasLetterhead: boolean
    letterheadHeaderUrl: string | null
    letterheadFooterUrl: string | null
  }> {
    const letterheads = await this.letterheadRepo.findByPmId(pmId)
    const defaultOrFirst =
      letterheads.find((lh) => lh.isDefault) || letterheads[0] || null

    return {
      hasLetterhead: letterheads.length > 0,
      letterheadHeaderUrl: defaultOrFirst?.previewFirstPageKey
        ? await this.s3Service.getDownloadUrl(defaultOrFirst.previewFirstPageKey)
        : null,
      letterheadFooterUrl: null,
    }
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

  async execute(dto: GetDocumentLetterheadContextDto) {
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
      const own = await this.pmHasLetterhead(actorPmId)
      if (own.hasLetterhead) {
        return { ...own, source: 'own' as const }
      }

      const collabs = await (this.prisma as any).upward_pm_team_collaboration.findMany({
        where: { collaboratorPmId: actorPmId, status: 'ACCEPTED' },
        select: { ownerPmId: true },
        orderBy: { createdAt: 'asc' },
      })

      for (const collab of collabs) {
        const company = await this.pmHasLetterhead(collab.ownerPmId)
        if (company.hasLetterhead) {
          return { ...company, source: 'company' as const }
        }
      }

      return {
        hasLetterhead: false,
        letterheadHeaderUrl: null,
        letterheadFooterUrl: null,
        source: 'none' as const,
      }
    }

    const result = await this.pmHasLetterhead(companyPmId)
    return {
      ...result,
      source: companyPmId === actorPmId ? ('own' as const) : ('company' as const),
    }
  }
}
