
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetTeamMembersUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ownerPmId: number) {
    const collaborations = await (this.prisma as any).upward_pm_team_collaboration.findMany({
      where: { ownerPmId, status: 'ACCEPTED' },
      include: {
        collaboratorPm: {
          select: {
            uuid: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePic: true
          }
        }
      }
    });

    // For each collaborator, get the properties they have access to if CUSTOM
    const result = await Promise.all(collaborations.map(async (collab: any) => {
        let properties = [];
        if (collab.accessLevel === 'CUSTOM') {
            const propertyCollabs = await (this.prisma as any).upward_pm_property_collaboration.findMany({
                where: {
                    ownerPmId,
                    collaboratorPmId: collab.collaboratorPmId
                },
                include: {
                    property: {
                        select: {
                            uuid: true,
                            name: true
                        }
                    }
                }
            });
            properties = propertyCollabs.map((pc: any) => pc.property);
        }

        return {
            uuid: collab.uuid,
            accessLevel: collab.accessLevel,
            status: collab.status,
            createdAt: collab.createdAt,
            member: collab.collaboratorPm,
            properties
        };
    }));

    return result;
  }
}
