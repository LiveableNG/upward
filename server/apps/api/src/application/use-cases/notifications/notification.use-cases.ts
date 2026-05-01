import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '../../../domains/notifications/notification.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { SendPushToUserUseCase } from '../push/push.use-cases'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '../../../domains/payments/payment.repository'

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

@Injectable()
export class GetAdminAnnouncementsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute() {
    return this.notificationRepository.findAllAnnouncements()
  }
}

@Injectable()
export class SendNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly sendPushToUser: SendPushToUserUseCase,
  ) {}

  async execute(data: { userId: string; title: string; message: string; type: string }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new UnauthorizedException('User not found')

    const notification = await this.notificationRepository.createNotification({
      ...data,
      userId: user.id!,
    })

    // Fire-and-forget push notification
    this.sendPushToUser.execute(user.id!, {
      title: data.title,
      body: data.message,
      data: { type: data.type, notificationId: String(notification.id) },
    }).catch(() => { /* silent – push is best-effort */ })

    return notification
  }
}

@Injectable()
export class GetUserNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepository: IPaymentRequestRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')

    const numericUserId = user.id
    if (!numericUserId) throw new UnauthorizedException('Invalid user account state')

    // 1. Get active announcement (Global)
    const activeAnnouncement = await this.notificationRepository.findActiveAnnouncement()

    let activeAnnouncementWithState = null
    if (activeAnnouncement) {
      const state = await this.notificationRepository.getAnnouncementState(
        numericUserId,
        activeAnnouncement.id,
      )
      activeAnnouncementWithState = {
        ...activeAnnouncement,
        state: state || {
          seenPopup: false,
          interactedPopup: false,
          seenBanner: false,
          interactedBanner: false,
        },
      }
    }

    // 2. CHECK FOR SMART RENT REMINDER (Transactional)
    // Instead of virtual IDs, we look for real RENT_REMINDER notifications
    // or simply calculate based on property data and return as a separate field.
    let activeRentReminder = null;
    const properties = await this.prisma.upward_user_property.findMany({
        where: { userId: numericUserId, rentEndDate: { not: null } },
        include: { location: true }
    })
    
    for (const prop of properties) {
        const now = new Date()
        const due = new Date(prop.rentEndDate!)
        const diff = due.getTime() - now.getTime()
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

        if (days <= 7) {
            const isOverdue = days < 0
            const address = prop.location?.address || prop.location?.area || 'your property'
            
            // Look for a real notification for this property cycle
            const startOfCycle = new Date(now.getFullYear(), now.getMonth(), 1)
            const notification = await this.prisma.upward_notification.findFirst({
                where: {
                    userId: numericUserId,
                    type: 'RENT_REMINDER',
                    url: { contains: prop.uuid },
                    isRead: false
                },
                orderBy: { createdAt: 'desc' }
            })

            // If we have an unread notification, we treat it as an active reminder 
            // This notification ID is a REAL ID from the database.
            if (notification) {
                activeRentReminder = {
                    id: notification.id,
                    propertyUuid: prop.uuid,
                    title: notification.title,
                    message: notification.message,
                    daysLeft: days,
                    urgencyLevel: isOverdue ? 'overdue' : days <= 3 ? 'critical' : days <= 7 ? 'warning' : 'notice',
                    url: notification.url,
                    isRead: notification.isRead
                }
                break;
            }
        }
    }

    // 3. Get personal notifications
    const personalNotifications =
      await this.notificationRepository.findUserNotifications(numericUserId)

    // 4. Get unread count
    const unreadCountFromDb = await this.notificationRepository.countUnreadNotifications(numericUserId)

    // 5. Get pending payments count
    const pendingRequests = await this.paymentRequestRepository.findByUserIdAndStatus(numericUserId, 'PENDING')
    const partialRequests = await this.paymentRequestRepository.findByUserIdAndStatus(numericUserId, 'PARTIAL')
    const pendingPaymentCount = (pendingRequests?.length || 0) + (partialRequests?.length || 0)

    // Calculate un-interacted announcement count
    const announcementUnread =
      activeAnnouncementWithState && 
      !activeAnnouncementWithState.state.interactedBanner && 
      !activeAnnouncementWithState.state.interactedPopup ? 1 : 0
      
    const rentReminderUnread = 0

    const enhancedNotifications = [...personalNotifications]
    if (activeAnnouncementWithState) {
      enhancedNotifications.unshift({
        id: `announcement-${activeAnnouncementWithState.id}`,
        title: activeAnnouncementWithState.title,
        message: activeAnnouncementWithState.message,
        type: 'SUPPORT', 
        createdAt: activeAnnouncementWithState.createdAt,
        isRead: activeAnnouncementWithState.state.interactedBanner,
        url: activeAnnouncementWithState.url,
      } as any)
    }

    return {
      activeAnnouncement: activeAnnouncementWithState,
      activeRentReminder,
      notifications: enhancedNotifications,
      unreadCount: unreadCountFromDb + announcementUnread + pendingPaymentCount + rentReminderUnread,
    }
  }
}

@Injectable()
export class UpdateAnnouncementStateUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(data: {
    userId: string
    announcementId: number
    seenPopup?: boolean
    interactedPopup?: boolean
    seenBanner?: boolean
    interactedBanner?: boolean
  }) {
    const user = await this.userRepository.findByUuid(data.userId)
    if (!user) throw new UnauthorizedException('User not found')

    return this.notificationRepository.upsertAnnouncementState({
      ...data,
      userId: user.id!,
      announcementId: data.announcementId,
    })
  }
}

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly updateAnnouncementState: UpdateAnnouncementStateUseCase,
  ) {}

  async execute(userId: string, notificationId: string) {
    if (notificationId.startsWith('announcement-')) {
      const annId = parseInt(notificationId.replace('announcement-', ''))
      return this.updateAnnouncementState.execute({
        userId,
        announcementId: annId,
        interactedBanner: true,
        interactedPopup: true,
      })
    }
    
    // Regular notification
    return this.notificationRepository.markNotificationAsRead(Number(notificationId))
  }
}

@Injectable()
export class MarkNotificationsByCategoryReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: NotificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, category: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')

    let types: string[] = []
    if (category === 'Transactions') types = ['PAYMENT']
    else if (category === 'Services') types = ['SUPPORT', 'SYSTEM']
    else if (category === 'Activities') types = ['RENT_REMINDER']

    if (types.length > 0) {
      await this.notificationRepository.markNotificationsByCategoryAsRead(user.id!, types)
    }
  }
}
