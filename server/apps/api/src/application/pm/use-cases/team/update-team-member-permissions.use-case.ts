
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { UpdateTeamMemberPermissionsDto, TeamAccessLevel } from '../../dtos/team.dto';

@Injectable()
export class UpdateTeamMemberPermissionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ownerPmId: number, collaborationUuid: string, dto: UpdateTeamMemberPermissionsDto) {
    const collaboration = await (this.prisma as any).upward_pm_team_collaboration.findUnique({
      where: { uuid: collaborationUuid, ownerPmId }
    });

    if (!collaboration) {
      throw new NotFoundException('Team member collaboration not found');
    }

    // 1. Update global access level
    await (this.prisma as any).upward_pm_team_collaboration.update({
      where: { id: collaboration.id },
      data: { accessLevel: dto.accessLevel }
    });

    // 2. Handle property links
    if (dto.accessLevel === TeamAccessLevel.CUSTOM && dto.propertyUuids) {
        // Clear old ones
        await (this.prisma as any).upward_pm_property_collaboration.deleteMany({
            where: {
                ownerPmId,
                collaboratorPmId: collaboration.collaboratorPmId
            }
        });

        const properties = await (this.prisma as any).upward_pm_property.findMany({
            where: { uuid: { in: dto.propertyUuids }, pmId: ownerPmId }
        });

        if (properties.length > 0) {
            await (this.prisma as any).upward_pm_property_collaboration.createMany({
                data: properties.map((p: any) => ({
                    propertyId: p.id,
                    collaboratorPmId: collaboration.collaboratorPmId,
                    ownerPmId
                }))
            });
        }
    } else if (dto.accessLevel === TeamAccessLevel.ALL) {
        await (this.prisma as any).upward_pm_property_collaboration.deleteMany({
            where: {
                ownerPmId,
                collaboratorPmId: collaboration.collaboratorPmId
            }
        });
    }

    return { success: true };
  }
}
