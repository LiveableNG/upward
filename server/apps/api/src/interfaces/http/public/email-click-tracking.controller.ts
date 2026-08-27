import { Controller, Get, Param, Req, Res } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { ConfigService } from '@nestjs/config'

@Controller()
export class EmailClickTrackingController {
  private readonly frontendUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'https://upward.ng').replace(/\/$/, '')
  }

  @Get('emails/:uuid')
  async trackClick(
    @Param('uuid') uuid: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    return this.handleRedirect(uuid, req, res)
  }

  @Get('api/v1/emails/:uuid')
  async trackClickApi(
    @Param('uuid') uuid: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    return this.handleRedirect(uuid, req, res)
  }

  private async handleRedirect(
    uuid: string,
    req: FastifyRequest,
    res: FastifyReply,
  ) {
    const userAgent = (req.headers && (req.headers['user-agent'] as string)) || undefined
    const ipAddress = (req.headers && (req.headers['x-forwarded-for'] as string)) || req.ip || undefined

    const link = await (this.prisma as any).upward_email_link.findUnique({
      where: { id: uuid },
      include: { communicationLog: true },
    })

    if (!link || !link.originalUrl) {
      return res.redirect(this.frontendUrl, 302)
    }

    // Security validation: Prevent open redirect exploits / CRLF injection
    let targetUrl = link.originalUrl.trim().replace(/[\r\n]/g, '')
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = this.frontendUrl
    }

    const now = new Date()

    try {
      // Record click statistics on link
      await (this.prisma as any).upward_email_link.update({
        where: { id: uuid },
        data: {
          clickCount: { increment: 1 },
          firstClickedAt: link.firstClickedAt ?? now,
          lastClickedAt: now,
        },
      })

      // Store granular click activity record
      await (this.prisma as any).upward_email_link_click.create({
        data: {
          linkId: uuid,
          clickedAt: now,
          userAgent: userAgent ?? null,
          ipAddress: ipAddress ?? null,
        },
      })

      // Also mark parent email log as opened if not already opened
      if (link.communicationLogId) {
        await this.prisma.upward_communication_log.update({
          where: { id: link.communicationLogId },
          data: {
            isOpened: true,
            openedAt: link.communicationLog.openedAt ?? now,
            openCount: { increment: link.communicationLog.isOpened ? 0 : 1 },
            userAgent: userAgent ?? link.communicationLog.userAgent ?? null,
          },
        })
      }
    } catch (err) {
      console.error('Failed to log email link click metrics:', err)
    }

    return res.redirect(targetUrl, 302)
  }
}
