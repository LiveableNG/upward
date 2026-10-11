import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetTenantAdminNotesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(userUuidOrId: string) {
    const isNumeric = /^\d+$/.test(userUuidOrId)
    const user = await this.prisma.upward_user.findFirst({
      where: isNumeric
        ? { OR: [{ id: parseInt(userUuidOrId, 10) }, { uuid: userUuidOrId }] }
        : { uuid: userUuidOrId },
      select: { id: true, uuid: true },
    })

    if (!user) {
      throw new NotFoundException('Tenant user not found')
    }

    const notes = await (this.prisma as any).upward_admin_tenant_note.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        uuid: true,
        userId: true,
        adminId: true,
        adminEmail: true,
        adminName: true,
        category: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return notes
  }
}
