import { Controller, Get, Query, Req, Res, Inject } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { IEmailSequenceRepository, EMAIL_SEQUENCE_REPOSITORY } from '../../../domains/email-sequence/email-sequence.repository.interface'

@Controller('email-tracking')
export class EmailTrackingController {
  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Get('open')
  async trackOpen(
    @Query('t') token: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const userAgent = (req.headers && (req.headers['user-agent'] as string)) || undefined
    let updatedCount = 0
    if (token) {
      updatedCount = await this.sequenceRepository.markAsOpened(token, userAgent)
      if (updatedCount === 0) {
        await this.prisma.upward_communication_log.updateMany({
          where: { emailTrackingToken: token },
          data: {
            isOpened: true,
            openedAt: new Date(),
            openCount: { increment: 1 },
            userAgent: userAgent ?? null,
          },
        })
      }
    }

    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')
    // Fastify reply uses `header()` to set response headers
    res.header('Content-Type', 'image/gif')
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '0')
    res.send(pixel)
  }
}
