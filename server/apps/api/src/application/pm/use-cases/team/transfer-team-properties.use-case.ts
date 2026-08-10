
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { TransferTeamPropertiesDto } from '../../dtos/team.dto';
import { TeamAccessLevel } from '../../dtos/team.dto';

@Injectable()
export class TransferTeamPropertiesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ownerPmId: number, dto: TransferTeamPropertiesDto) {
    const toCollaboration = await (this.prisma as any).upward_pm_team_collaboration.findFirst({
      where: {
        uuid: dto.toCollaborationUuid,
        ownerPmId,
        status: 'ACCEPTED',
        accessLevel: TeamAccessLevel.CUSTOM,
      },
    });

    if (!toCollaboration) {
      throw new NotFoundException('Target manager not found or is not eligible for property assignments');
    }

    let fromCollaboration: any = null;
    if (dto.fromCollaborationUuid) {
      if (dto.fromCollaborationUuid === dto.toCollaborationUuid) {
        throw new BadRequestException('Source and target manager must be different');
      }

      fromCollaboration = await (this.prisma as any).upward_pm_team_collaboration.findFirst({
        where: {
          uuid: dto.fromCollaborationUuid,
          ownerPmId,
          status: 'ACCEPTED',
          accessLevel: TeamAccessLevel.CUSTOM,
        },
      });

      if (!fromCollaboration) {
        throw new NotFoundException('Source manager not found or is not eligible');
      }
    }

    if (!dto.propertyUuids?.length) {
      throw new BadRequestException('Select at least one property to transfer');
    }

    const uniquePropertyUuids = [...new Set(dto.propertyUuids)];

    const properties = await (this.prisma as any).upward_pm_property.findMany({
      where: {
        uuid: { in: uniquePropertyUuids },
        pmId: ownerPmId,
      },
      select: { id: true, uuid: true, name: true },
    });

    if (properties.length !== uniquePropertyUuids.length) {
      throw new BadRequestException('One or more properties were not found in your portfolio');
    }

    if (fromCollaboration) {
      const assignedLinks = await (this.prisma as any).upward_pm_property_collaboration.findMany({
        where: {
          ownerPmId,
          collaboratorPmId: fromCollaboration.collaboratorPmId,
          propertyId: { in: properties.map((p: any) => p.id) },
        },
        select: { propertyId: true },
      });

      if (assignedLinks.length !== properties.length) {
        throw new BadRequestException('One or more properties are not assigned to the selected source manager');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const property of properties) {
        if (fromCollaboration) {
          await (tx as any).upward_pm_property_collaboration.deleteMany({
            where: {
              ownerPmId,
              propertyId: property.id,
              collaboratorPmId: fromCollaboration.collaboratorPmId,
            },
          });
        } else {
          await (tx as any).upward_pm_property_collaboration.deleteMany({
            where: {
              ownerPmId,
              propertyId: property.id,
              collaboratorPmId: { not: toCollaboration.collaboratorPmId },
            },
          });
        }

        await (tx as any).upward_pm_property_collaboration.upsert({
          where: {
            propertyId_collaboratorPmId: {
              propertyId: property.id,
              collaboratorPmId: toCollaboration.collaboratorPmId,
            },
          },
          create: {
            propertyId: property.id,
            collaboratorPmId: toCollaboration.collaboratorPmId,
            ownerPmId,
          },
          update: {},
        });
      }
    });

    return {
      success: true,
      transferredCount: properties.length,
    };
  }
}
