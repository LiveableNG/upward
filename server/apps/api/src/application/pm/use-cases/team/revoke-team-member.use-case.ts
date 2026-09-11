import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class RevokeTeamMemberUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ownerPmId: number, employeeUuid: string) {
    const employee = await (this.prisma as any).upward_pm_employee.findFirst({
      where: { uuid: employeeUuid, ownerPmId },
    });

    if (!employee) {
      throw new NotFoundException('Team member not found');
    }

    // 1. Delete property links
    await (this.prisma as any).upward_pm_employee_property.deleteMany({
      where: {
        employeeId: employee.id,
        ownerPmId,
      },
    });

    // 2. Delete employee auth sessions
    await (this.prisma as any).upward_pm_employee_auth_session.deleteMany({
      where: { employeeId: employee.id },
    });

    // 3. Delete employee record
    await (this.prisma as any).upward_pm_employee.delete({
      where: { id: employee.id },
    });

    return { success: true };
  }
}
