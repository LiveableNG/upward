import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetWaitlistFilterOptionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return {
      roles: [],
      countries: [],
      cities: [],
      sessions: [],
    }
  }
}

