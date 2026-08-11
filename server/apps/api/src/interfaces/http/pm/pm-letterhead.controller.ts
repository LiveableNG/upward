import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { SubscriptionGateGuard } from '../../../application/auth/guards/subscription-gate.guard'
import { RequireFeature } from '../../../application/auth/decorators/require-feature.decorator'
import { FeatureKey } from '../../../domains/subscription/subscription.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../domains/pm/pm-letterhead.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { randomUUID } from 'crypto'

interface FastifyRequest {
  user?: {
    sub: string
    email: string
    role: string
  }
}

@Controller('pm/letterheads')
@UseGuards(JwtAuthGuard)
export class PmLetterheadController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
    private readonly s3Service: S3Service,
  ) {}

  private async getActorPm(req: FastifyRequest) {
    if (!req.user?.sub) throw new UnauthorizedException()
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
    })
    if (!pm) throw new UnauthorizedException('Property manager not found')
    return pm
  }

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

  /**
   * Letterhead availability for document send/preview.
   * Resolves company PM from unit/tenant so managers see company letterhead.
   */
  @Get('document-context')
  @HttpCode(HttpStatus.OK)
  async getDocumentLetterheadContext(
    @Req() req: FastifyRequest,
    @Query('unitUuid') unitUuid?: string,
    @Query('tenantUuid') tenantUuid?: string,
  ) {
    const actor = await this.getActorPm(req)
    let companyPmId = actor.id

    if (unitUuid) {
      const unit = await this.prisma.upward_pm_unit.findUnique({
        where: { uuid: unitUuid },
        include: { property: { select: { id: true, pmId: true } } },
      })
      if (!unit?.property) throw new NotFoundException('Unit not found')

      const allowed = await this.actorCanAccessCompanyProperty(
        actor.id,
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

      const allowed = await this.actorCanAccessCompanyTenant(actor.id, tenant.pmId)
      if (!allowed) throw new ForbiddenException('No access to this tenant')

      companyPmId = tenant.pmId
    } else {
      const own = await this.pmHasLetterhead(actor.id)
      if (own.hasLetterhead) {
        return { ...own, source: 'own' as const }
      }

      const collabs = await (this.prisma as any).upward_pm_team_collaboration.findMany({
        where: { collaboratorPmId: actor.id, status: 'ACCEPTED' },
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
      source: companyPmId === actor.id ? ('own' as const) : ('company' as const),
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getLetterheads(@Req() req: FastifyRequest) {
    const pm = await this.getActorPm(req)

    const letterheads = await this.letterheadRepo.findByPmId(pm.id)
    return Promise.all(
      letterheads.map(async (lh) => ({
        ...lh,
        previewFirstPageUrl: lh.previewFirstPageKey ? await this.s3Service.getDownloadUrl(lh.previewFirstPageKey) : null,
        previewContinuationPageUrl: lh.previewContinuationPageKey ? await this.s3Service.getDownloadUrl(lh.previewContinuationPageKey) : null,
        templateFileUrl: lh.templateFileKey ? await this.s3Service.getDownloadUrl(lh.templateFileKey) : null,
      }))
    )
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async saveLetterhead(@Req() req: FastifyRequest, @Body() body: any) {
    const pm = await this.getActorPm(req)

    const isDefault = body.isDefault === true

    if (isDefault) {
      await this.prisma.upward_pm_letterhead.updateMany({
        where: { pmId: pm.id },
        data: { isDefault: false },
      })
    }

    const letterhead = await this.letterheadRepo.save({
      uuid: randomUUID(),
      pmId: pm.id,
      isDefault,
      pageCount: Number(body.pageCount) || 1,
      templateFileKey: body.templateFileKey || null,
      previewFirstPageKey: body.previewFirstPageKey || null,
      previewContinuationPageKey: body.previewContinuationPageKey || null,
      templateConfig: body.templateConfig || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return letterhead
  }

  @Patch(':id/set-as-default')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async setAsDefault(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ) {
    const pm = await this.getActorPm(req)

    const letterheadId = Number(id)
    const letterhead = await this.letterheadRepo.findById(letterheadId)
    if (!letterhead || letterhead.pmId !== pm.id) {
      throw new NotFoundException('Letterhead not found')
    }

    await this.prisma.upward_pm_letterhead.updateMany({
      where: { pmId: pm.id },
      data: { isDefault: false },
    })

    return this.letterheadRepo.update(letterheadId, { isDefault: true })
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async updateLetterhead(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const pm = await this.getActorPm(req)

    const letterheadId = Number(id)
    const letterhead = await this.letterheadRepo.findById(letterheadId)
    if (!letterhead || letterhead.pmId !== pm.id) {
      throw new NotFoundException('Letterhead not found')
    }

    return this.letterheadRepo.update(letterheadId, {
      templateConfig: body.templateConfig,
    })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SubscriptionGateGuard)
  @RequireFeature(FeatureKey.BRANDING)
  async deleteLetterhead(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ) {
    const pm = await this.getActorPm(req)

    const letterheadId = Number(id)
    const letterhead = await this.letterheadRepo.findById(letterheadId)
    if (!letterhead || letterhead.pmId !== pm.id) {
      throw new NotFoundException('Letterhead not found')
    }

    await this.letterheadRepo.delete(letterheadId)
  }
}
