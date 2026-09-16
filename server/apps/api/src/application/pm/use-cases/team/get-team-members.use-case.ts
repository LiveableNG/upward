import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GetTeamMembersUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(ownerPmId: number) {
    const employees = await (this.prisma as any).upward_pm_employee.findMany({
      where: {
        ownerPmId,
        status: { in: ['ACTIVE', 'PENDING', 'SUSPENDED'] },
      },
      include: {
        assignedProperties: {
          include: {
            property: {
              select: {
                uuid: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = await Promise.all(
      employees.map(async (emp: any) => {
        let profilePicUrl = emp.profilePic;
        if (profilePicUrl) {
          profilePicUrl = await this.s3Service.getDownloadUrl(profilePicUrl);
        }

        const decryptedMember = {
          uuid: emp.uuid,
          profilePic: profilePicUrl,
          firstName: this.encryption.decrypt(emp.firstName),
          lastName: this.encryption.decrypt(emp.lastName),
          email: this.encryption.decrypt(emp.email),
          phone: emp.phone ? this.encryption.decrypt(emp.phone) : null,
          jobTitle: emp.jobTitle || 'Property Officer',
        };

        const properties = emp.accessLevel === 'CUSTOM'
          ? emp.assignedProperties.map((ap: any) => ap.property)
          : [];

        return {
          uuid: emp.uuid,
          accessLevel: emp.accessLevel,
          status: emp.status,
          createdAt: emp.createdAt,
          member: decryptedMember,
          properties,
        };
      }),
    );

    return result;
  }
}
