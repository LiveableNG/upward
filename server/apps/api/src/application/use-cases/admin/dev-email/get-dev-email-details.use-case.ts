import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service'

@Injectable()
export class GetDevEmailDetailsAdminUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(uuid: string) {
    const email = (await this.prisma.upward_dev_email_preview.findUnique({
      where: { uuid },
    })) as any

    if (!email) return null

    if (email.html && !email.html.includes(' ') && email.html.startsWith('dev-emails/')) {
      try {
        email.html = await this.s3Service.getFileContent(email.html)
      } catch (err) {
        console.error('Failed to get email HTML from S3:', err)
      }
    }

    if (email.attachments && Array.isArray(email.attachments)) {
      const resolvedAttachments = []
      for (const att of email.attachments as any[]) {
        let url = att.url || ''
        if (!url && att.s3Key) {
          try {
            url = await this.s3Service.getDownloadUrl(att.s3Key)
          } catch {
            url = ''
          }
        }
        if (!url && att.content) {
          const mime = att.contentType || 'application/pdf'
          url = att.content.startsWith('data:') ? att.content : `data:${mime};base64,${att.content}`
        }
        resolvedAttachments.push({
          filename: att.filename,
          url,
        })
      }
      ;(email as any).attachments = resolvedAttachments
    }

    return email
  }
}
