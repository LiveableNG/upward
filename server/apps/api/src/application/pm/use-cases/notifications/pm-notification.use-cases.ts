import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetPmNotificationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number, employeeId?: number) {
    const whereClause: any = { pmId };
    if (employeeId !== undefined) {
      whereClause.employeeId = employeeId;
    } else {
      whereClause.employeeId = null;
    }

    const [notifications, unreadCount] = await Promise.all([
      (this.prisma as any).upward_pm_notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50, // Keep list to a reasonable size
      }),
      (this.prisma as any).upward_pm_notification.count({
        where: { ...whereClause, isRead: false },
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

  async execute(pmId: number, uuid: string, employeeId?: number) {
    const whereClause: any = { uuid, pmId };
    if (employeeId !== undefined) {
      whereClause.employeeId = employeeId;
    } else {
      whereClause.employeeId = null;
    }

    const notification = await (this.prisma as any).upward_pm_notification.findFirst({
      where: whereClause,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return (this.prisma as any).upward_pm_notification.update({
      where: { id: notification.id },
      data: { isRead: true, popupSeen: true },
    });
  }
}

@Injectable()
export class MarkAllPmNotificationsReadUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number, employeeId?: number) {
    const whereClause: any = { pmId, isRead: false };
    if (employeeId !== undefined) {
      whereClause.employeeId = employeeId;
    } else {
      whereClause.employeeId = null;
    }

    await (this.prisma as any).upward_pm_notification.updateMany({
      where: whereClause,
      data: { isRead: true },
    });
    return { success: true };
  }
}

@Injectable()
export class GetUnreadPmPopupsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(pmId: number, employeeId?: number) {
    const whereClause: any = {
      pmId,
      isPopup: true,
      popupSeen: false,
    };
    if (employeeId !== undefined) {
      whereClause.employeeId = employeeId;
    } else {
      whereClause.employeeId = null;
    }

    const popups = await (this.prisma as any).upward_pm_notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    if (popups.length > 0) {
      // Mark them as seen so they won't pop up again
      await (this.prisma as any).upward_pm_notification.updateMany({
        where: {
          id: { in: popups.map((p: any) => p.id) },
        },
        data: { popupSeen: true },
      });
    }

    return popups;
  }
}
