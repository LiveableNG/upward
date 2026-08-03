import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { CreateDemoRequestDto } from '../../../interfaces/http/dto/create-demo-request.dto'

@Injectable()
export class SubmitDemoRequestUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateDemoRequestDto) {
    return this.prisma.upward_demo_request.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        tenants: dto.tenants,
        demoDate: new Date(dto.demoDate),
      },
    })
  }
}
