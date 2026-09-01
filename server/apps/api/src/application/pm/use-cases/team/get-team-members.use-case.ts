
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetTeamMembersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(ownerPmId: number) {
    const collaborations = await (this.prisma as any).upward_pm_team_collaboration.findMany({
      where: { ownerPmId, status: { in: ['ACCEPTED', 'PENDING'] } },
      include: {
        collaboratorPm: {
          select: {
            uuid: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePic: true,
            passwordHash: true,
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

        const member = collab.collaboratorPm;
        const decryptedMember = {
            uuid: member.uuid,
            profilePic: member.profilePic,
            firstName: this.encryption.decrypt(member.firstName),
            lastName: this.encryption.decrypt(member.lastName),
            email: this.encryption.decrypt(member.email)
        };

        const isPendingInvite = member.passwordHash === 'PENDING_INVITE' || collab.status === 'PENDING';
        const status = isPendingInvite ? 'PENDING' : 'ACCEPTED';

        return {
            uuid: collab.uuid,
            accessLevel: collab.accessLevel,
            status,
            createdAt: collab.createdAt,
            member: decryptedMember,
            properties
        };
    }));

    return result;
  }
}
