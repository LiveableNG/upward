import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';
import { PM_PROPERTY_REPOSITORY, IPropertyRepository } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetTenantUploadedDocumentsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number, unitUuid: string) {
    const unit = await this.prisma.upward_pm_unit.findUnique({
      where: { uuid: unitUuid },
    });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const hasAccess = await this.propertyRepository.hasAccessToProperty(pmId, unit.propertyId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this unit');
    }

    // Identify UUIDs of PM documents intentionally pushed to vault
    const vaultPmDocuments = await this.prisma.upward_pm_sent_document.findMany({
      where: { unitId: unit.id, isVaultDocument: true },
      select: { uuid: true },
    });
    const vaultPmUuids = new Set(vaultPmDocuments.map((doc) => doc.uuid));

    // Find user property records linked to this unit
    const userProperties = await this.prisma.upward_user_property.findMany({
      where: { pmUnitId: unit.id },
    });
    const userPropertyIds = userProperties.map((up) => up.id);

    // Fetch all user contracts linked to those user properties
    const contracts = await this.prisma.upward_user_contract.findMany({
      where: { userPropertyId: { in: userPropertyIds } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    // Filter to ONLY vault-relevant documents:
    //   - Tenant self-uploaded (source=TENANT)
    //   - PM deliberately vault-pushed (source=PM or uuid in vaultPmUuids)
    // Excludes old email-only sends auto-created by the send-document flow
    const vaultContracts = contracts.filter((c) => {
      const source = (c as any).source as string | undefined;
      if (source === 'PM') return true;
      if (source === 'TENANT') return true;
      if (vaultPmUuids.has(c.uuid)) return true; // legacy fallback
      return false;
    });

    return Promise.all(
      vaultContracts.map(async (c) => {
        const fileUrl = await this.s3Service.getDownloadUrl(c.fileUrl);
        const source = (c as any).source as string | undefined;
        const isPm = source === 'PM' || vaultPmUuids.has(c.uuid);
        return {
          uuid: c.uuid,
          fileName: c.fileName,
          fileUrl,
          fileType: c.fileType,
          fileSize: c.fileSize,
          source: source || (isPm ? 'PM' : 'TENANT'),
          isTenantUploaded: !isPm,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          user: {
            uuid: c.user.uuid,
            firstName: c.user.firstName,
            lastName: c.user.lastName,
            email: c.user.email,
          },
        };
      }),
    );
  }
}
