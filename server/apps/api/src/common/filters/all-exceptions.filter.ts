/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import { FastifyReply, FastifyRequest } from 'fastify'
import { PrismaService } from '../../prisma/prisma.service'
import Bugsnag from '@bugsnag/js'
import { EmailService } from '../../email/email.service'

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<FastifyReply>()
    const request = ctx.getRequest<FastifyRequest>()

    const isHttp = exception instanceof HttpException
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    const message = isHttp ? exception.getResponse() : exception.message || 'Internal server error'

    // To prevent infinite loops or spamming for 404/401/etc.
    const isCritical = status >= 500

    // 1. Log to Bugsnag
    if (status >= 400) {
      Bugsnag.notify(exception as any, (event) => {
        event.addMetadata('request', {
          url: request.url,
          method: request.method,
          body: request.body,
          params: request.params,
          query: request.query,
          ip: request.ip,
        })
      })
    }

    // 2. Log to Database if it is an actual error (>= 400)
    if (status >= 400) {
      try {
        await this.prisma.upward_error_log.create({
          data: {
            message: message instanceof Object ? JSON.stringify(message) : String(message),
            stack: (exception as any).stack,
            severity: status >= 500 ? 'ERROR' : 'WARNING',
            context: JSON.stringify({
              url: request.url,
              method: request.method,
              query: request.query,
              params: request.params,
              ip: request.ip,
            }),
          },
        })
      } catch (logErr) {
        console.error('Failed to log error to database', logErr)
      }
    }

    // 3. Email Admin on Critical Errors (500s)
    if (isCritical) {
      this.notifyAdmins(exception, request)
    }

    const payload = isHttp
      ? typeof message === 'object'
        ? message
        : { message }
      : {
          statusCode: status,
          message: 'Internal server error',
          timestamp: new Date().toISOString(),
          path: request.url,
        }

    response.status(status).send({
      ...payload,
      errorId: undefined, // Could attach DB ID here if needed
    })
  }

  private async notifyAdmins(exception: unknown, request: FastifyRequest) {
    try {
      // Find superadmins
      const superadmins = await this.prisma.upward_admin.findMany({
        where: { role: 'SUPERADMIN' },
        select: { email: true },
      })

      if (superadmins.length === 0) return

      const adminEmails = superadmins.map((a) => a.email)
      const errorTime = new Date().toLocaleString()
      const subject = `[CRITICAL ERROR] ${request.method} ${request.url}`

      const html = `
        <div style="font-family: sans-serif; background: #fee2e2; padding: 24px; border-radius: 12px; border: 1px solid #dc2626;">
          <h2 style="color: #991b1b; margin-top: 0;">Server Error Alert</h2>
          <p>A critical error occurred on the Upward API at <strong>${errorTime}</strong>.</p>
          
          <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #fca5a5; margin-top: 20px;">
            <p style="margin: 0; font-size: 14px;"><strong>Endpoint:</strong> ${request.method} ${request.url}</p>
            <p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Message:</strong> ${(exception as any).message}</p>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #991b1b;">Stack Trace Snippet:</p>
          <pre style="background: #111827; color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 11px;">${(exception as any).stack?.split('\n').slice(0, 10).join('\n') || 'No stack trace available'}</pre>

          
          <div style="margin-top: 24px; text-align: center;">
            <a href="https://upward-admin-site.vercel.app/error-logs" style="padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Error Logs</a>
          </div>
        </div>
      `

      for (const email of adminEmails) {
        await this.emailService.sendGenericEmail(email, subject, html)
      }
    } catch (err) {
      console.error('Failed to notify admins of error', err)
    }
  }
}
