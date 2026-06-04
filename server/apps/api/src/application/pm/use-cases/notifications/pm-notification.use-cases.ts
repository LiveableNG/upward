import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetPmNotificationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.upward_pm_notification.findMany({
        where: { pmId },
        orderBy: { createdAt: 'desc' },
        take: 50, // Keep list to a reasonable size
      }),
      this.prisma.upward_pm_notification.count({
        where: { pmId, isRead: false },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  }
}

@Injectable()
export class MarkPmNotificationReadUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number, uuid: string) {
    const notification = await this.prisma.upward_pm_notification.findFirst({
      where: { uuid, pmId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.upward_pm_notification.update({
      where: { id: notification.id },
      data: { isRead: true, popupSeen: true },
    });
  }
}

@Injectable()
export class MarkAllPmNotificationsReadUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number) {
    await this.prisma.upward_pm_notification.updateMany({
      where: { pmId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}

@Injectable()
export class GetUnreadPmPopupsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number) {
    const popups = await this.prisma.upward_pm_notification.findMany({
      where: {
        pmId,
        isPopup: true,
        popupSeen: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (popups.length > 0) {
      // Mark them as seen so they won't pop up again
      await this.prisma.upward_pm_notification.updateMany({
        where: {
          id: { in: popups.map((p) => p.id) },
        },
        data: { popupSeen: true },
      });
    }

    return popups;
  }
}
