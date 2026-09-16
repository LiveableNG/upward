import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { UpdateTeamMemberPermissionsDto, TeamAccessLevel } from '../../dtos/team.dto';

@Injectable()
export class UpdateTeamMemberPermissionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ownerPmId: number, employeeUuid: string, dto: UpdateTeamMemberPermissionsDto) {
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { uuid: employeeUuid, ownerPmId },
    });

    if (!employee) {
      throw new NotFoundException('Team member not found');
    }

    // 1. Update access level
    await (this.prisma as any).upward_pm_employee.update({
      where: { id: employee.id },
      data: { accessLevel: dto.accessLevel },
    });

    // 2. Handle property links
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

    return { success: true };
  }
}
