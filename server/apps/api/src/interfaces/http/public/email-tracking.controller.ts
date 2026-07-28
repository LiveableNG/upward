import { Controller, Get, Query, Req, Res } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { IEmailSequenceRepository, EMAIL_SEQUENCE_REPOSITORY } from '../../../domains/email-sequence/email-sequence.repository.interface'
import { Inject } from '@nestjs/common'

@Controller('email-tracking')
export class EmailTrackingController {
  constructor(
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly sequenceRepository: IEmailSequenceRepository,
  ) {}

  @Get('open')
  async trackOpen(
    @Query('t') token: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    if (token) {
      this.sequenceRepository.markAsOpened(token, (req.headers && (req.headers['user-agent'] as string)) || undefined).catch(() => {})
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
