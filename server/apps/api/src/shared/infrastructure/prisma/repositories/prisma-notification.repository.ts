import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma.service'
import {
  Announcement,
  Notification,
  NotificationRepository,
  TenantAnnouncementState,
} from '@domains/notifications/notification.repository'

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Announcements
  async createAnnouncement(data: {
    title: string
    message: string
    iconType: string
  }): Promise<Announcement> {
    const record = await this.prisma.upward_announcement.create({
      data: {
        title: data.title,
        message: data.message,
        iconType: data.iconType,
        isActive: true,
      },
    })
    return record as Announcement
  }

  async findActiveAnnouncement(): Promise<Announcement | null> {
    const record = await this.prisma.upward_announcement.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return record as Announcement | null
  }

  async findAllAnnouncements(): Promise<Announcement[]> {
    const records = await this.prisma.upward_announcement.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return records as Announcement[]
  }

  async deactivateAllAnnouncements(): Promise<void> {
    await this.prisma.upward_announcement.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    })
  }

  // Announcement State
  async getAnnouncementState(
    tenantId: string,
    announcementId: string,
  ): Promise<TenantAnnouncementState | null> {
    const record = await this.prisma.upward_tenant_announcement_state.findUnique({
      where: {
        tenantId_announcementId: {
          tenantId,
          announcementId,
        },
      },
    })
    return record as TenantAnnouncementState | null
  }

  async upsertAnnouncementState(data: {
    tenantId: string
    announcementId: string
    seenPopup?: boolean
    interactedPopup?: boolean
    seenBanner?: boolean
    interactedBanner?: boolean
  }): Promise<void> {
    await this.prisma.upward_tenant_announcement_state.upsert({
      where: {
        tenantId_announcementId: {
          tenantId: data.tenantId,
          announcementId: data.announcementId,
        },
      },
      update: {
        seenPopup: data.seenPopup,
        interactedPopup: data.interactedPopup,
        seenBanner: data.seenBanner,
        interactedBanner: data.interactedBanner,
      },
      create: {
        tenantId: data.tenantId,
        announcementId: data.announcementId,
        seenPopup: data.seenPopup ?? false,
        interactedPopup: data.interactedPopup ?? false,
        seenBanner: data.seenBanner ?? false,
        interactedBanner: data.interactedBanner ?? false,
      },
    })
  }

  // Direct Notifications
  async createNotification(data: {
    tenantId: string
    title: string
    message: string
    type: string
  }): Promise<Notification> {
    const record = await this.prisma.upward_notification.create({
      data: {
        tenantId: data.tenantId,
        title: data.title,
        message: data.message,
        type: data.type,
      },
    })
    return record as Notification
  }

  async findTenantNotifications(tenantId: string): Promise<Notification[]> {
    const records = await this.prisma.upward_notification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return records as Notification[]
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.prisma.upward_notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
  }

  async countUnreadNotifications(tenantId: string): Promise<number> {
    return this.prisma.upward_notification.count({
      where: { tenantId, isRead: false },
    })
  }
}
