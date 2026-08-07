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
  BadRequestException,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PM_SIGNATURE_REPOSITORY, IPmSignatureRepository } from '../../../domains/pm/pm-signature.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { randomUUID } from 'crypto'

interface FastifyRequest {
  user?: {
    sub: string
    email: string
    role: string
  }
}

@Controller('pm/signatures')
@UseGuards(JwtAuthGuard)
export class PmSignatureController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PM_SIGNATURE_REPOSITORY) private readonly signatureRepo: IPmSignatureRepository,
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

  /**
   * Signatures available for document insert.
   * Resolves company PM from unit/tenant so managers see company signatures.
   */
  @Get('document-context')
  @HttpCode(HttpStatus.OK)
  async getDocumentSignatureContext(
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
      const own = await this.mapSignaturesForPm(actor.id)
      if (own.length > 0) {
        return {
          hasSignature: true,
          signatures: own,
          source: 'own' as const,
        }
      }

      const collabs = await (this.prisma as any).upward_pm_team_collaboration.findMany({
        where: { collaboratorPmId: actor.id, status: 'ACCEPTED' },
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
      source: companyPmId === actor.id ? ('own' as const) : ('company' as const),
    }
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  async uploadSignature(
    @Req() req: FastifyRequest,
    @Body() body: { base64Data: string; contentType: string },
  ) {
    const pm = await this.getActorPm(req)

    if (!body.contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for signatures')
    }

    const buffer = Buffer.from(body.base64Data, 'base64')
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File is too large. Max 5MB.')
    }

    const ext = body.contentType.split('/')[1] || 'png'
    const key = `pm/${pm.uuid}/signatures/sig_${randomUUID()}.${ext}`

    const publicUrl = await this.s3Service.uploadBuffer(buffer, key, body.contentType)

    return { fileKey: key, publicUrl }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getSignatures(@Req() req: FastifyRequest) {
    const pm = await this.getActorPm(req)
    return this.mapSignaturesForPm(pm.id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveSignature(@Req() req: FastifyRequest, @Body() body: any) {
    const pm = await this.getActorPm(req)

    const isDefault = body.isDefault === true

    if (isDefault) {
      await (this.prisma as any).upward_pm_signature.updateMany({
        where: { pmId: pm.id },
        data: { isDefault: false },
      })
    }

    const signature = await this.signatureRepo.save({
      uuid: randomUUID(),
      pmId: pm.id,
      name: body.name || 'Unnamed Signature',
      type: body.type, // 'upload' | 'pad' | 'digital'
      fileKey: body.fileKey || null,
      content: body.content || null,
      isDefault,
    })

    return signature
  }

  @Patch(':id/set-as-default')
  @HttpCode(HttpStatus.OK)
  async setAsDefault(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ) {
    const pm = await this.getActorPm(req)

    const signatureId = Number(id)
    const signature = await this.signatureRepo.findById(signatureId)
    if (!signature || signature.pmId !== pm.id) {
      throw new NotFoundException('Signature not found')
    }

    await (this.prisma as any).upward_pm_signature.updateMany({
      where: { pmId: pm.id },
      data: { isDefault: false },
    })

    return this.signatureRepo.update(signatureId, { isDefault: true })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSignature(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
  ) {
    const pm = await this.getActorPm(req)

    const signatureId = Number(id)
    const signature = await this.signatureRepo.findById(signatureId)
    if (!signature || signature.pmId !== pm.id) {
      throw new NotFoundException('Signature not found')
    }

    await this.signatureRepo.delete(signatureId)
  }
}
