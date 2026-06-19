
import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { InviteTeamMemberDto, TeamAccessLevel } from '../../dtos/team.dto';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../../domains/pm/property-manager.repository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { EmailService } from '../../../../shared/infrastructure/email/email.service';
import * as crypto from 'crypto';

@Injectable()
export class InviteTeamMemberUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
  ) {}

  async execute(ownerPmId: number, dto: InviteTeamMemberDto) {
    // 1. Check if PM exists or create shadow account
    let collaborator = await this.pmRepo.findByEmail(dto.email);
    const isNewAccount = !collaborator;

    if (isNewAccount) {
      const passwordHash = 'PENDING_INVITE';
      const nameParts = (dto.name || '').split(' ');
      const firstName = nameParts[0] || 'Member';
      const lastName = nameParts.slice(1).join(' ') || 'Manager';

      collaborator = await this.pmRepo.save({
        uuid: crypto.randomUUID(),
        email: dto.email,
        emailHash: this.encryption.hash(dto.email),
        passwordHash,
        firstName,
        firstNameHash: this.encryption.hash(firstName),
        lastName,
        lastNameHash: this.encryption.hash(lastName),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    } else {
      // If already exists, check if they are already collaborating
      const existingCollab = await (this.prisma as any).upward_pm_team_collaboration.findUnique({
        where: {
          ownerPmId_collaboratorPmId: {
            ownerPmId,
            collaboratorPmId: collaborator!.id!
          }
        }
      });

      if (existingCollab && existingCollab.status !== 'REVOKED') {
        throw new ConflictException('This person is already a member of your team');
      }
    }

    // 2. Create/Update Collaboration Record
    const collaboration = await (this.prisma as any).upward_pm_team_collaboration.upsert({
      where: {
        ownerPmId_collaboratorPmId: {
          ownerPmId,
          collaboratorPmId: collaborator!.id!,
        }
      },
      update: {
        accessLevel: dto.accessLevel,
        status: 'ACCEPTED'
      },
      create: {
        ownerPmId,
        collaboratorPmId: collaborator!.id!,
        accessLevel: dto.accessLevel,
        status: 'ACCEPTED'
      }
    });

    // 3. Link Custom Properties if applicable
    if (dto.accessLevel === TeamAccessLevel.CUSTOM && dto.propertyUuids) {
      // Clear old ones first
      await (this.prisma as any).upward_pm_property_collaboration.deleteMany({
        where: {
          ownerPmId,
          collaboratorPmId: collaborator!.id!
        }
      });

      const properties = await (this.prisma as any).upward_pm_property.findMany({
        where: { uuid: { in: dto.propertyUuids }, pmId: ownerPmId }
      });

      if (properties.length > 0) {
        await (this.prisma as any).upward_pm_property_collaboration.createMany({
          data: properties.map((p: any) => ({
            propertyId: p.id,
            collaboratorPmId: collaborator!.id!,
            ownerPmId
          }))
        });
      }
    }

    // 4. Send Invitation Email
    const owner = await this.pmRepo.findById(ownerPmId);
    const ownerName = owner?.businessName || `${owner?.firstName} ${owner?.lastName}`;

    await this.emailService.sendTeamInvitation({
      email: dto.email,
      name: dto.name,
      inviterName: ownerName,
      isNewAccount,
      claimLink: `${process.env.FRONTEND_URL || 'https://upward.goodtenants.io'}/invite/${collaborator!.uuid}`
    });

    return collaboration;
  }
}
