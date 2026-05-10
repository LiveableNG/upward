
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class RevokeTeamMemberUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ownerPmId: number, collaborationUuid: string) {
    const collaboration = await (this.prisma as any).upward_pm_team_collaboration.findUnique({
      where: { uuid: collaborationUuid, ownerPmId }
    });

    if (!collaboration) {
      throw new NotFoundException('Team member collaboration not found');
    }

    // 1. Delete property links
    await (this.prisma as any).upward_pm_property_collaboration.deleteMany({
        where: {
            ownerPmId,
            collaboratorPmId: collaboration.collaboratorPmId
        }
    });

    // 2. Delete main collaboration
    await (this.prisma as any).upward_pm_team_collaboration.delete({
      where: { id: collaboration.id }
    });

    return { success: true };
  }
}
