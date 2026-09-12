import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { InviteTeamMemberDto, TeamAccessLevel } from '../../dtos/team.dto';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../../domains/pm/property-manager.repository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { UnifiedCommunicationService } from '../../../../shared/infrastructure/communication/unified-communication.service';
import * as crypto from 'crypto';

@Injectable()
export class InviteTeamMemberUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    private readonly encryption: EncryptionService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute(ownerPmId: number, dto: InviteTeamMemberDto) {
    const emailHash = this.encryption.hash(dto.email);

    // 1. Check if employee already exists for this owner
    let employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: {
        emailHash,
        ownerPmId,
      },
    });

    const nameParts = (dto.name || '').trim().split(' ');
    const firstName = nameParts[0] || 'Member';
    const lastName = nameParts.slice(1).join(' ') || 'Manager';

    if (employee) {
      if (employee.status !== 'REVOKED') {
        throw new ConflictException('This person is already an active or invited member of your team');
      }

      // Re-activate revoked employee
      employee = await (this.prisma as any).upward_pm_employee.update({
        where: { id: employee.id },
        data: {
          firstName: this.encryption.encrypt(firstName),
          firstNameHash: this.encryption.hash(firstName),
          lastName: this.encryption.encrypt(lastName),
          lastNameHash: this.encryption.hash(lastName),
          accessLevel: dto.accessLevel,
          status: 'PENDING',
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new employee with encrypted PII
      employee = await (this.prisma as any).upward_pm_employee.create({
        data: {
          uuid: crypto.randomUUID(),
          ownerPmId,
          email: this.encryption.encrypt(dto.email),
          emailHash,
          firstName: this.encryption.encrypt(firstName),
          firstNameHash: this.encryption.hash(firstName),
          lastName: this.encryption.encrypt(lastName),
          lastNameHash: this.encryption.hash(lastName),
          jobTitle: 'Property Officer',
          accessLevel: dto.accessLevel,
          status: 'PENDING',
        },
      });
    }

    // 2. Link Custom Properties if applicable
    await (this.prisma as any).upward_pm_employee_property.deleteMany({
      where: {
        employeeId: employee.id,
        ownerPmId,
      },
    });

    if (dto.accessLevel === TeamAccessLevel.CUSTOM && dto.propertyUuids && dto.propertyUuids.length > 0) {
      const properties = await (this.prisma as any).upward_pm_property.findMany({
        where: { uuid: { in: dto.propertyUuids }, pmId: ownerPmId },
      });

      if (properties.length > 0) {
        await (this.prisma as any).upward_pm_employee_property.createMany({
          data: properties.map((p: any) => ({
            propertyId: p.id,
            employeeId: employee.id,
            ownerPmId,
          })),
        });
      }
    }

    // 3. Send Invitation Email
    const owner = await this.pmRepo.findById(ownerPmId);
    const ownerName = owner?.businessName || `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || 'Team Admin';

    await this.unifiedCommService.processCommunication({
      recipientEmail: dto.email,
      recipientName: dto.name,
      recipientRole: 'PM',
      type: 'TEAM_INVITATION',
      context: {
        name: dto.name,
        inviterName: ownerName,
        isNewAccount: employee.status === 'PENDING',
        claimLink: `${(process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim()}/pm-invite/${employee.uuid}`,
      },
    });

    return employee;
  }
}
