import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EmailService } from '../../../shared/infrastructure/email/email.service'
import { NotificationService } from '../../../shared/infrastructure/common/notification.service'

@Injectable()
export class RentReminderWorkflowUseCase {
  private readonly logger = new Logger(RentReminderWorkflowUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Invoked by ScheduleService (Kernel) daily at 08:00. */
  async execute() {
    this.logger.log('[Workflow] Starting daily rent reminder check...')
    const properties = await this.prisma.upward_user_property.findMany({
      where: {
        rentEndDate: { not: null },
        isPastTenancy: false,
      },
      include: {
        user: true,
        location: true,
      },
    })

    for (const prop of properties) {
      await this.processProperty(prop)
    }
  }

  private async processProperty(prop: any) {
    if (prop.user?.email && prop.user.email.endsWith('@upward.com')) return;

    const now = new Date()
    const due = new Date(prop.rentEndDate)
    
    // Normalize dates to midnight for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate())
    
    const diffMs = dueDate.getTime() - today.getTime()
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    // Determine target level
    let targetLevel = 0
    if (daysLeft === 14) targetLevel = 14
    else if (daysLeft === 7) targetLevel = 7
    else if (daysLeft === 3) targetLevel = 3
    else if (daysLeft === 0) targetLevel = 1 // 1 represents "Due Day"

    if (targetLevel === 0) return

    // Check if there is already a PENDING payment request for this property
    const activePayment = await this.prisma.upward_payment_request.findFirst({
      where: {
        userPropertyId: prop.id,
        status: { in: ['PENDING', 'PARTIAL'] },
      },
    })

    // Skip if there's an active manual/nudged invoice, as the Activity Center handles it
    if (activePayment) return

    // Deduplicate: Check if a notification for this property cycle was already sent today
    const startOfToday = new Date(today)
    const alreadyNotified = await this.prisma.upward_notification.findFirst({
        where: {
            userId: prop.userId,
            type: 'RENT_REMINDER',
            createdAt: { gte: startOfToday },
            message: { contains: prop.uuid } 
        }
    })

    if (alreadyNotified) return

    await this.sendAlert(prop, targetLevel)
  }

  private async sendAlert(prop: any, level: number) {
    const { user, location, uuid: propertyUuid } = prop
    const address = location?.address || location?.area || 'your property'
    const name = user.firstName || 'there'
    const payUrl = `/dashboard/pay-rent?propertyUuid=${propertyUuid}`

    const templates: Record<number, any> = {
      14: {
        title: 'Rent Check-in 👋',
        push: `Hi ${name}, just a friendly heads-up that rent for ${address} is due in 2 weeks.`,
        inApp: `Friendly heads-up! Your rent for ${address} is due in 2 weeks. Just letting you know so you can plan ahead.`,
        email: `Time for a check-in! Your rent for ${address} is due in two weeks. No rush, just a friendly heads-up.`,
      },
      7: {
        title: 'Rent Due in 7 Days 🗓️',
        push: `Hi ${name}, your rent for ${address} is due in a week. Pay early to boost your Upward Score!`,
        inApp: `Your rent for ${address} is due in 7 days. Remember, every on-time payment helps your Upward Score grow!`,
        email: `Your rent for ${address} is due in one week. Start prepping your payment to keep that credit building on track!`,
      },
      3: {
        title: '3 Days Until Rent Day 🔥',
        push: `Quick reminder: Rent for ${address} is due in 3 days. Let's keep that payment streak alive!`,
        inApp: `Quick reminder: Only 3 days left until rent is due for ${address}. Don't let your streak break!`,
        email: `Don't break the streak! You have 3 days left until rent is due for ${address}. Keep up the great standing!`,
      },
      1: {
        title: 'It\'s Rent Day! 🎉',
        push: `Your payment for ${address} is due today. Settle it now to stay in great standing!`,
        inApp: `It's finally here! Rent for ${address} is due today. Tap here to pay now and maintain your Upward Score.`,
        email: `Happy Rent Day! Your payment for ${address} is due today. Settle it easily through your dashboard to keep your score in the green.`,
      }
    }

    const tpl = templates[level]

    // 1. Send In-App + Push via centralized NotificationService
    await this.notificationService.notifyUser(user.id, {
        title: tpl.title,
        message: `${tpl.inApp} [Property: ${propertyUuid}]`,
        type: 'RENT_REMINDER',
        url: payUrl,
        data: {
          property_uuid: propertyUuid,
          days_left: level.toString()
        }
    })

    const baseUrl = process.env.FRONTEND_URL || 'https://upward.goodtenants.io'

    // 2. Send Email
    await this.emailService.sendEmailWithRetry({
        userId: user.id,
        email: user.email,
        subject: tpl.title,
        html: `<p>Hi ${name},</p><p>${tpl.email}</p><p><a href="${baseUrl}${payUrl}" style="background:#d97757;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Pay Now</a></p><p>Keeping your payments consistent impacts your credit score and helps you unlock better financial opportunities.</p>`,
        type: 'RENT_REMINDER'
    }).catch(() => {})

    this.logger.log(`[Workflow] Sent ${level}-day reminder to ${user.email} for property ${propertyUuid}`)
  }
}
