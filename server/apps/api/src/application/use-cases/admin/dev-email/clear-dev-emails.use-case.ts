import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service'

@Injectable()
export class ClearDevEmailsAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute() {
    await this.prisma.upward_dev_email_preview.deleteMany()
    await this.s3Service.deleteObjectsWithPrefix('dev-emails/')
    return { success: true, message: 'All dev preview emails have been cleared.' }
  }
}
