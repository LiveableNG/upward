import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class DeleteTenantAdminNoteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(noteUuid: string) {
    const existing = await (this.prisma as any).upward_admin_tenant_note.findUnique({
      where: { uuid: noteUuid },
    })

    if (!existing) {
      throw new NotFoundException('Tenant note not found')
    }

    await (this.prisma as any).upward_admin_tenant_note.delete({
      where: { uuid: noteUuid },
    })

    return { success: true }
  }
}
