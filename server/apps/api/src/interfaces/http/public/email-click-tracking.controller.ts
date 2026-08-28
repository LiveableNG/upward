import { Controller, Get, Param, Req, Res } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'crypto'

@Controller('l')
export class EmailClickTrackingController {
  private readonly frontendUrl: string
  private readonly secret: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'https://upward.ng').replace(/\/$/, '')
    this.secret = this.configService.get<string>('JWT_SECRET') || 'upward-email-tracking-secret'
  }

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

    return this.handleRedirect(rawToken, req, res)
  }

  private async handleRedirect(
    token: string,
    req: FastifyRequest,
    res: FastifyReply,
  ) {
    const userAgent = (req.headers && (req.headers['user-agent'] as string)) || undefined
    const ipAddress = (req.headers && (req.headers['x-forwarded-for'] as string)) || req.ip || undefined

    let targetUrl = ''
    let linkId: string | null = null

    // 1. Decode signed stateless token format: <payload>.<sig>
    if (token.includes('.')) {
      const [payload, sig] = token.split('.')
      if (payload && sig) {
        const expectedSig = createHmac('sha256', this.secret).update(payload).digest('base64url').slice(0, 10)
        if (sig === expectedSig) {
          try {
            const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
            if (decoded && decoded.u && typeof decoded.u === 'string') {
              targetUrl = decoded.u
            }
            if (decoded && decoded.l && typeof decoded.l === 'string') {
              linkId = decoded.l
            }
          } catch (e) {
            // Ignore parse errors, will fall back to DB lookup or frontendUrl
          }
        }
      }
    }

    // 2. Backwards compatibility fallback & DB click metrics logging
    const lookupId = linkId || token
    const now = new Date()

    if (lookupId) {
      try {
        const link = await (this.prisma as any).upward_email_link.findUnique({
          where: { id: lookupId },
          include: { communicationLog: true },
        })

        if (link) {
          if (!targetUrl) {
            targetUrl = link.originalUrl
          }

          // Record click statistics on link
          await (this.prisma as any).upward_email_link.update({
            where: { id: link.id },
            data: {
              clickCount: { increment: 1 },
              firstClickedAt: link.firstClickedAt ?? now,
              lastClickedAt: now,
            },
          })

          // Store granular click activity record
          await (this.prisma as any).upward_email_link_click.create({
            data: {
              linkId: link.id,
              clickedAt: now,
              userAgent: userAgent ?? null,
              ipAddress: ipAddress ?? null,
            },
          })

          // Also mark parent email log as opened if not already opened
          if (link.communicationLogId && link.communicationLog) {
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
        }
      } catch (err) {
        console.error('Failed to log email link click metrics:', err)
      }
    }

    // Default fallback if targetUrl couldn't be extracted or resolved
    if (!targetUrl) {
      targetUrl = this.frontendUrl
    }

    // Security validation: Prevent open redirect exploits / CRLF injection
    let cleanTargetUrl = targetUrl.trim().replace(/[\r\n]/g, '')
    if (!/^https?:\/\//i.test(cleanTargetUrl)) {
      cleanTargetUrl = this.frontendUrl
    }

    return res.redirect(cleanTargetUrl, 302)
  }
}
