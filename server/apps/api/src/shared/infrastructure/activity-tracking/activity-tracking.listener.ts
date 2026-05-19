import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { AppActivityEvent } from './activity-tracking.service';

@Injectable()
export class ActivityTrackingListener {
  private readonly logger = new Logger(ActivityTrackingListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('app.activity')
  async handleActivity(event: AppActivityEvent) {
    try {
      let userId: number | null = null;
      let pmId: number | null = null;

      if (event.userUuid) {
        if (event.userRole === 'PM') {
          const pm = await this.prisma.upward_property_manager.findUnique({
            where: { uuid: event.userUuid },
            select: { id: true },
          });
          if (pm) {
            pmId = pm.id;
          }
        } else if (event.userRole === 'TENANT') {
          const user = await this.prisma.upward_user.findUnique({
            where: { uuid: event.userUuid },
            select: { id: true },
          });
          if (user) {
            userId = user.id;
          }
        }
      }

      await this.prisma.upward_app_activity_log.create({
        data: {
          app: event.app,
          userId,
          pmId,
          userRole: event.userRole,
          userEmail: event.userEmail || null,
          action: event.action,
          entityType: event.entityType || null,
          entityId: event.entityId || null,
          description: event.description,
          metadata: event.metadata ? JSON.parse(JSON.stringify(event.metadata)) : null,
          ipAddress: event.ipAddress || null,
          userAgent: event.userAgent || null,
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to record app activity log: ${error?.message || error}`, error?.stack);
    }
  }
}
