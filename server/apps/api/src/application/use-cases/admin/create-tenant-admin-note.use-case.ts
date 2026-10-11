import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

export class CreateTenantAdminNoteDto {
  @IsNotEmpty()
  @IsString()
  note!: string

  @IsOptional()
  @IsString()
  @IsIn(['PAID_OUTSIDE', 'GENERAL'])
  category?: string
}

@Injectable()
export class CreateTenantAdminNoteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    userUuidOrId: string,
    dto: CreateTenantAdminNoteDto,
    admin: { id: string; email?: string },
  ) {
    if (!dto.note || !dto.note.trim()) {
      throw new BadRequestException('Note content cannot be empty')
    }

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

    const adminRecord = await this.prisma.upward_admin.findUnique({
      where: { id: admin.id },
      select: { id: true, email: true },
    })

    const note = await (this.prisma as any).upward_admin_tenant_note.create({
      data: {
        userId: user.id,
        adminId: admin.id,
        adminEmail: admin.email || adminRecord?.email || 'admin@upward.local',
        category: dto.category || 'PAID_OUTSIDE',
        note: dto.note.trim(),
      },
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

    return note
  }
}
