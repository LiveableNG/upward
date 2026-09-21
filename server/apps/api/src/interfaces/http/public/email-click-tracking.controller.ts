import { Controller, Get, Req, Res } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ResolveEmailClickUseCase } from '../../../application/use-cases/email/resolve-email-click.use-case'

@Controller('l')
export class EmailClickTrackingController {
  constructor(
    private readonly resolveEmailClickUseCase: ResolveEmailClickUseCase,
  ) {}

  @Get('*')
  async trackClick(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    const params = (req.params as Record<string, string | undefined>) || {}
    const rawToken =
      params['*'] ||
      params['token'] ||
      (req.url ? req.url.replace(/^\/l\/?/, '').split('?')[0] : '') ||
      ''

    const userAgent = (req.headers && (req.headers['user-agent'] as string)) || undefined
    const ipAddress = (req.headers && (req.headers['x-forwarded-for'] as string)) || req.ip || undefined

    const result = await this.resolveEmailClickUseCase.execute({
      token: rawToken,
      userAgent,
      ipAddress,
    })

    return res.redirect(result.redirectUrl, 302)
  }
}
