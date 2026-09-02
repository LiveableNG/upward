import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../../domains/pm/property-manager.repository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { UnifiedCommunicationService } from '../../../../shared/infrastructure/communication/unified-communication.service';

@Injectable()
export class ResendTeamInviteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    private readonly encryption: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute(ownerPmId: number, collaborationUuid: string) {
    const collab = await (this.prisma as any).upward_pm_team_collaboration.findFirst({
      where: {
        uuid: collaborationUuid,
        ownerPmId,
      },
      include: {
        collaboratorPm: true,
      },
    });

    if (!collab) {
      throw new NotFoundException('Team member invitation record not found');
    }

    const collaborator = collab.collaboratorPm;
    if (!collaborator) {
      throw new NotFoundException('Collaborator account not found');
    }

    if (collaborator.passwordHash !== 'PENDING_INVITE') {
      throw new BadRequestException('This team member has already accepted their invitation.');
    }

    const decryptedEmail = this.encryption.decrypt(collaborator.email);
    const decryptedFirstName = this.encryption.decrypt(collaborator.firstName);
    const decryptedLastName = this.encryption.decrypt(collaborator.lastName);
    const recipientName = `${decryptedFirstName} ${decryptedLastName}`.trim() || decryptedEmail;

    const owner = await this.pmRepo.findById(ownerPmId);
    const ownerName = owner?.businessName || `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || 'Team Admin';

    await this.unifiedCommService.processCommunication({
      recipientEmail: decryptedEmail,
      recipientName,
      recipientRole: 'PM',
      type: 'TEAM_INVITATION',
      context: {
        name: recipientName,
        inviterName: ownerName,
        isNewAccount: true,
        claimLink: `${(process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()}/pm-invite/${collaborator.uuid}`,
      },
    });

    return {
      success: true,
      message: `Invitation resent to ${decryptedEmail}`,
    };
  }
}
