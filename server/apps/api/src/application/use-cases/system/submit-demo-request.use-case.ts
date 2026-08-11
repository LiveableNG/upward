import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { CreateDemoRequestDto } from '../../../interfaces/http/dto/create-demo-request.dto'
import { EmailService } from '../../../shared/infrastructure/email/email.service'

@Injectable()
export class SubmitDemoRequestUseCase {
  private readonly logger = new Logger(SubmitDemoRequestUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async execute(dto: CreateDemoRequestDto) {
    const demoDate = new Date(dto.demoDate)

    const demoRequest = await this.prisma.upward_demo_request.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        tenants: dto.tenants,
        demoDate,
      },
    })

    try {
      const dateString = demoDate.toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      })
      await this.emailService.sendSystemAlertToAdmins(
        'New Demo Request Received',
        `A new demo request has been submitted by ${dto.name} (${dto.email}).\nPhone: ${dto.phone}\nEstimated tenants: ${dto.tenants}\nRequested Demo Date: ${dateString}`,
      )
    } catch (err) {
      this.logger.error('Failed to send admin alert email for demo request', err)
    }

    return demoRequest
  }
}

