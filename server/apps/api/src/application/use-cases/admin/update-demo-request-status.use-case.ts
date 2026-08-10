import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class UpdateDemoRequestStatusUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number, status: string) {
    const exists = await this.prisma.upward_demo_request.findUnique({
      where: { id },
    })

    if (!exists) {
      throw new NotFoundException(`Demo request with ID ${id} not found`)
    }

    return this.prisma.upward_demo_request.update({
      where: { id },
      data: { status },
    })
  }
}
