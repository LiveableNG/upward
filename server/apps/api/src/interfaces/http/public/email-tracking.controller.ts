import { Controller, Get, Query, Req, Res } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { TrackEmailOpenUseCase } from '../../../application/use-cases/email/track-email-open.use-case'

@Controller('email-tracking')
export class EmailTrackingController {
  constructor(
    private readonly trackEmailOpenUseCase: TrackEmailOpenUseCase,
  ) {}

  @Get('open')
  async trackOpen(
    @Query('t') token: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const userAgent = (req.headers && (req.headers['user-agent'] as string)) || undefined
    await this.trackEmailOpenUseCase.execute({ token, userAgent })

    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')
    res.header('Content-Type', 'image/gif')
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '0')
    res.send(pixel)
  }
}
