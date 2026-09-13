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
    const toEmployee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: {
        uuid: dto.toCollaborationUuid,
        ownerPmId,
        status: { in: ['ACTIVE', 'PENDING'] },
        accessLevel: TeamAccessLevel.CUSTOM,
      },
    });

    if (!toEmployee) {
      throw new NotFoundException('Target manager not found or is not eligible for property assignments');
    }

    let fromEmployee: any = null;
    if (dto.fromCollaborationUuid) {
      if (dto.fromCollaborationUuid === dto.toCollaborationUuid) {
        throw new BadRequestException('Source and target manager must be different');
      }

      fromEmployee = await (this.prisma as any).upward_pm_employee.findFirst({
        where: {
          uuid: dto.fromCollaborationUuid,
          ownerPmId,
          status: { in: ['ACTIVE', 'PENDING'] },
          accessLevel: TeamAccessLevel.CUSTOM,
        },
      });

      if (!fromEmployee) {
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

    if (fromEmployee) {
      const assignedLinks = await (this.prisma as any).upward_pm_employee_property.findMany({
        where: {
          ownerPmId,
          employeeId: fromEmployee.id,
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
        if (fromEmployee) {
          await (tx as any).upward_pm_employee_property.deleteMany({
            where: {
              ownerPmId,
              propertyId: property.id,
              employeeId: fromEmployee.id,
            },
          });
        } else {
          await (tx as any).upward_pm_employee_property.deleteMany({
            where: {
              ownerPmId,
              propertyId: property.id,
              employeeId: { not: toEmployee.id },
            },
          });
        }

        await (tx as any).upward_pm_employee_property.upsert({
          where: {
            employeeId_propertyId: {
              propertyId: property.id,
              employeeId: toEmployee.id,
            },
          },
          create: {
            propertyId: property.id,
            employeeId: toEmployee.id,
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
