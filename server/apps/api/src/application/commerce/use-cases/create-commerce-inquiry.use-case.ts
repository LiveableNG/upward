import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { OFFERING_REPOSITORY, OfferingRepository } from '../../../domains/goals/offering.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'
import { CreateCommerceInquiryDto } from '../dto/commerce-inquiry.dto'

@Injectable()
export class CreateCommerceInquiryUseCase {
  private readonly logger = new Logger(CreateCommerceInquiryUseCase.name)

  constructor(
    @Inject(OFFERING_REPOSITORY)
    private readonly offeringRepo: OfferingRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  async execute(userIdentifier: number | string, dto: CreateCommerceInquiryDto) {
    const user =
      typeof userIdentifier === 'number'
        ? await this.userRepo.findById(userIdentifier)
        : await this.userRepo.findByUuid(userIdentifier)
    if (!user?.id) {
      throw new NotFoundException('User not found')
    }

    let offering = await this.offeringRepo.findOfferingByUuid(dto.offeringUuid)
    if (!offering && !isNaN(Number(dto.offeringUuid))) {
      offering = await this.offeringRepo.findOfferingById(Number(dto.offeringUuid))
    }
    if (!offering) {
      throw new NotFoundException(`Offering '${dto.offeringUuid}' not found`)
    }

    const categoryLabels: Record<string, string> = {
      GENERAL: 'General Product / Service Question',
      DELIVERY: 'Delivery Area & Scheduling Inquiry',
      CUSTOMIZATION: 'Customization / Special Request',
      PRICING: 'Pricing & Corporate Volume Quote',
    }
    const topic = categoryLabels[dto.category] || dto.category
    const vendorName = offering.vendor?.name || 'Upward Partner'
    const inquiryUuid = randomUUID()

    // Decrypt tenant details
    let tenantName = 'Tenant User'
    if (user.firstName || user.lastName) {
      const first = user.firstName ? this.encryption.decrypt(user.firstName) : ''
      const last = user.lastName ? this.encryption.decrypt(user.lastName) : ''
      tenantName = `${first} ${last}`.trim() || 'Tenant User'
    }

    let tenantEmail: string | null = null
    if (user.email) {
      tenantEmail = this.encryption.decrypt(user.email)
    }

    let tenantPhone: string | null = null
    if (user.phone) {
      tenantPhone = this.encryption.decrypt(user.phone)
    }

    // 1. Create inquiry record in upward_support_ticket so it surfaces in Inquiries & Disputes
    let ticket: any = null
    try {
      ticket = await this.prisma.upward_support_ticket.create({
        data: {
          uuid: inquiryUuid,
          userId: user.id,
          message: `[Commerce Inquiry: ${offering.title}]\nTopic: ${topic}\nOffering UUID: ${offering.uuid}\nVendor: ${vendorName}\nTenant: ${tenantName} (${tenantEmail || 'N/A'})\n\n${dto.message.trim()}`,
          status: 'OPEN',
        },
      })
    } catch (err: any) {
      this.logger.error(`Failed to persist inquiry support ticket: ${err?.message}`, err)
    }

    // 2. In-app & push notification to tenant
    try {
      await this.notificationService.notifyUser(user.id, {
        title: 'Inquiry Logged with Upward Support',
        message: `Your inquiry regarding "${offering.title}" (${topic}) has been logged. Upward Support is reviewing it.`,
        type: 'SUPPORT',
        url: `/dashboard/lifestyle/${offering.uuid}`,
      })
    } catch (err) {
      this.logger.error(`Failed to dispatch in-app notification for inquiry ${inquiryUuid}`, err)
    }

    // 3. Transactional Email to tenant
    try {
      if (tenantEmail && !tenantEmail.endsWith('@upward.com')) {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E1B18; line-height: 1.5;">
            <div style="background-color: #B65B37; height: 6px; width: 100%;"></div>
            <div style="padding: 32px 24px; background-color: #FAF8F6; border-radius: 0 0 12px 12px; border: 1px solid #E5E2DC; border-top: none;">
              <h2 style="color: #B65B37; margin: 0 0 8px; font-size: 20px;">We Received Your Inquiry</h2>
              <p style="font-size: 14px; color: #666666; margin: 0 0 20px;">Your inquiry regarding <strong>${offering.title}</strong> has been logged directly with the Upward Support team.</p>
              
              <div style="background-color: #FFFFFF; border: 1px solid #E5E2DC; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
                <div style="font-size: 12px; color: #888888; margin-bottom: 4px;">Topic</div>
                <div style="font-size: 15px; font-weight: 700; color: #1E1B18; margin-bottom: 12px;">${topic}</div>
                
                <div style="font-size: 12px; color: #888888; margin-bottom: 4px;">Merchant / Partner</div>
                <div style="font-size: 14px; font-weight: 600; color: #1E1B18; margin-bottom: 12px;">${vendorName}</div>

                <div style="font-size: 12px; color: #888888; margin-bottom: 4px;">Your Message</div>
                <div style="font-size: 13.5px; color: #444444; white-space: pre-wrap;">${dto.message.trim()}</div>
              </div>

              <div style="background-color: #EBF8F2; border: 1px solid #A7F3D0; border-radius: 8px; padding: 14px; margin-bottom: 24px; font-size: 12.5px; color: #065F46;">
                <strong>Upward Support:</strong> We coordinate directly with the merchant partner so you never have to deal with third parties directly. We will reply to this email once confirmed.
              </div>

              <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">Reference ID: ${inquiryUuid}</p>
            </div>
          </div>
        `

        await this.emailService.sendEmailWithRetry({
          email: tenantEmail,
          subject: `Inquiry Received: ${offering.title} — Upward Support`,
          html,
          type: 'COMMERCE_INQUIRY_LOGGED',
        })
      }
    } catch (err) {
      this.logger.error(
        `Failed to send inquiry confirmation email to tenant for inquiry ${inquiryUuid}`,
        err,
      )
    }

    // 4. Alert Email to Admins who can receive alerts / mail
    try {
      const alertAdmins = await this.prisma.upward_admin.findMany({
        where: {
          OR: [
            { receivesSystemAlerts: true },
            { role: { in: ['SUPERADMIN', 'ADMIN', 'DEVELOPER', 'CUSTOMER_SUPPORT'] } },
          ],
        },
        select: { email: true },
      })

      if (alertAdmins.length > 0) {
        const adminHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1E1B18; line-height: 1.5;">
            <div style="background-color: #B65B37; height: 6px; width: 100%;"></div>
            <div style="padding: 28px 24px; background-color: #FAF8F6; border-radius: 0 0 12px 12px; border: 1px solid #E5E2DC; border-top: none;">
              <h2 style="color: #B65B37; margin: 0 0 8px; font-size: 20px;">[Commerce Support] New Inquiry Received</h2>
              <p style="font-size: 14px; color: #555555; margin: 0 0 20px;">A tenant has submitted a product inquiry for offering <strong>${offering.title}</strong>.</p>
              
              <div style="background-color: #FFFFFF; border: 1px solid #E5E2DC; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
                <div style="font-size: 11px; font-weight: 700; color: #888888; text-transform: uppercase; margin-bottom: 4px;">Inquiry Topic</div>
                <div style="font-size: 15px; font-weight: 700; color: #1E1B18; margin-bottom: 12px;">${topic}</div>

                <div style="font-size: 11px; font-weight: 700; color: #888888; text-transform: uppercase; margin-bottom: 4px;">Offering &amp; Merchant</div>
                <div style="font-size: 14px; font-weight: 600; color: #1E1B18; margin-bottom: 12px;">${offering.title} · Partner: ${vendorName}</div>

                <div style="font-size: 11px; font-weight: 700; color: #888888; text-transform: uppercase; margin-bottom: 4px;">Tenant Details</div>
                <div style="font-size: 13.5px; color: #1E1B18; margin-bottom: 12px;">
                  <strong>${tenantName}</strong> &lt;${tenantEmail || 'N/A'}&gt; ${tenantPhone ? `· ${tenantPhone}` : ''}
                </div>

                <div style="font-size: 11px; font-weight: 700; color: #888888; text-transform: uppercase; margin-bottom: 4px;">Tenant Message</div>
                <div style="font-size: 13.5px; color: #333333; background: #F8F6F2; padding: 12px; border-radius: 6px; white-space: pre-wrap; line-height: 1.5;">${dto.message.trim()}</div>
              </div>

              <p style="font-size: 12px; color: #888888; text-align: center; margin: 0;">
                Logged under Reference: <strong>${inquiryUuid}</strong><br/>
                Action via Admin Site: <strong>Commerce Workspace &gt; Inquiries &amp; Disputes</strong>
              </p>
            </div>
          </div>
        `

        await Promise.allSettled(
          alertAdmins.map(({ email }) =>
            this.emailService.sendEmailWithRetry({
              email,
              subject: `[Commerce Support] New Inquiry: ${offering.title} (${topic})`,
              html: adminHtml,
              type: 'SYSTEM_ALERT',
            }),
          ),
        )
        this.logger.log(`Dispatched inquiry alert email to ${alertAdmins.length} admins`)
      }
    } catch (err: any) {
      this.logger.error(`Failed to send inquiry alert to admins: ${err?.message}`, err)
    }

    this.logger.log(
      `Commerce inquiry logged for offering ${offering.uuid} by user ${user.id} (Ticket UUID: ${ticket?.uuid || inquiryUuid})`,
    )

    return {
      message:
        'Your inquiry has been logged with Upward Support. We will reply via email and notification.',
      inquiry: {
        uuid: ticket?.uuid || inquiryUuid,
        offeringUuid: offering.uuid,
        offeringTitle: offering.title,
        vendorName,
        category: dto.category,
        topic,
        message: dto.message.trim(),
        createdAt: new Date().toISOString(),
      },
    }
  }
}
