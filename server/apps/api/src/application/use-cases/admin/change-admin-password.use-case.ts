import { Injectable } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class ChangeAdminPasswordUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(adminId: string, newPasswordPlain: string) {
    const passwordHash = await bcrypt.hash(newPasswordPlain, 10)
    return this.prisma.upward_admin.update({
      where: { id: adminId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    })
  }
}
