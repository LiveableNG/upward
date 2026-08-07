import { Injectable, Logger, Inject, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { ActivityAction, ActivityLogService } from '../../../shared/application/activity-log.service'
import { resolveCanManageCompanySettings } from '../../../shared/application/pm-settings-access'

@Injectable()
export class UpdatePmProfileUseCase {
  private readonly logger = new Logger(UpdatePmProfileUseCase.name)

  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async execute(pmUuid: string, dto: {
    firstName?: string
    lastName?: string
    phone?: string
    businessName?: string
    pmType?: string
    profilePic?: string
    letterheadHeaderUrl?: string
    letterheadFooterUrl?: string
    country?: string
    companyAddress?: string
    cacNumber?: string
  }) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) throw new NotFoundException('Property manager not found')

    const canManageCompanySettings = await resolveCanManageCompanySettings(this.prisma, pm.id!)

    const companyOnlyKeys = [
      'businessName',
      'pmType',
      'country',
      'companyAddress',
      'cacNumber',
      'letterheadHeaderUrl',
      'letterheadFooterUrl',
    ] as const

    const sanitizedDto = { ...dto }
    if (!canManageCompanySettings) {
      const attempted = companyOnlyKeys.filter((key) => sanitizedDto[key] !== undefined)
      if (attempted.length > 0) {
        throw new ForbiddenException(
          'Team members can only update personal profile fields (name, phone, avatar)',
        )
      }
    }

    const changedFields = Object.entries(sanitizedDto)
      .filter(([_, value]) => value !== undefined)
      .filter(([key, value]) => (pm as any)[key] !== value)
      .map(([key]) => key)

    if (sanitizedDto.profilePic !== undefined && pm.profilePic && pm.profilePic !== sanitizedDto.profilePic) {
      await this.s3Service.deleteObject(pm.profilePic)
    }
    if (sanitizedDto.letterheadHeaderUrl !== undefined && pm.letterheadHeaderUrl && pm.letterheadHeaderUrl !== sanitizedDto.letterheadHeaderUrl) {
      await this.s3Service.deleteObject(pm.letterheadHeaderUrl)
    }
    if (sanitizedDto.letterheadFooterUrl !== undefined && pm.letterheadFooterUrl && pm.letterheadFooterUrl !== sanitizedDto.letterheadFooterUrl) {
      await this.s3Service.deleteObject(pm.letterheadFooterUrl)
    }

    const updatedPm = await this.pmRepository.update(pm.id!, sanitizedDto)
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, id: serverId, uuid, ...rest } = updatedPm
    const clientProfile: any = {
      id: uuid,
      uuid,
      ...rest,
      canManageCompanySettings,
    }

    if (clientProfile.profilePic) {
      clientProfile.profilePic = await this.s3Service.getDownloadUrl(clientProfile.profilePic)
    }
    if (clientProfile.letterheadHeaderUrl) {
      clientProfile.letterheadHeaderUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadHeaderUrl)
    }
    if (clientProfile.letterheadFooterUrl) {
      clientProfile.letterheadFooterUrl = await this.s3Service.getDownloadUrl(clientProfile.letterheadFooterUrl)
    }

    if (changedFields.length > 0) {
      try {
        const collaborations = await (this.prisma as any).upward_pm_team_collaboration.findMany({
          where: {
            collaboratorPmId: pm.id,
            status: 'ACCEPTED',
          },
          select: { ownerPmId: true },
        })

        await Promise.all(
          collaborations.map((collab: { ownerPmId: number }) =>
            this.activityLog.log({
              pmId: pm.id!,
              ownerPmId: collab.ownerPmId,
              action: ActivityAction.UPDATE_PROFILE,
              entityType: 'PROFILE',
              entityId: pm.uuid,
              description: `Updated profile settings (${changedFields.join(', ')})`,
              metadata: {
                changedFields,
                companyAddress: updatedPm.companyAddress || null,
              },
            })
          )
        )
      } catch (err) {
        this.logger.error('Failed to log profile update activity', err as any)
      }
    }

    return clientProfile
  }
}
