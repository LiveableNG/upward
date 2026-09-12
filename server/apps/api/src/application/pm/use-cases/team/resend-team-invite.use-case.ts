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

  async execute(ownerPmId: number, employeeUuid: string) {
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: {
        uuid: employeeUuid,
        ownerPmId,
      },
    });

    if (!employee) {
      throw new NotFoundException('Team member invitation record not found');
    }

    if (employee.status !== 'PENDING' && employee.passwordHash) {
      throw new BadRequestException('This team member has already accepted their invitation.');
    }

    const recipientEmail = this.encryption.decrypt(employee.email);
    const firstName = this.encryption.decrypt(employee.firstName);
    const lastName = this.encryption.decrypt(employee.lastName);
    const recipientName = `${firstName} ${lastName}`.trim() || recipientEmail;

    const owner = await this.pmRepo.findById(ownerPmId);
    const ownerName = owner?.businessName || `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || 'Team Admin';

    await this.unifiedCommService.processCommunication({
      recipientEmail,
      recipientName,
      recipientRole: 'PM',
      type: 'TEAM_INVITATION',
      context: {
        name: recipientName,
        inviterName: ownerName,
        isNewAccount: true,
        claimLink: `${(process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()}/pm-invite/${employee.uuid}`,
      },
    });

    return {
      success: true,
      message: `Invitation resent to ${employee.email}`,
    };
  }
}
