
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export enum ActivityAction {
  CREATE_PROPERTY = 'CREATE_PROPERTY',
  UPDATE_PROPERTY = 'UPDATE_PROPERTY',
  CREATE_UNIT = 'CREATE_UNIT',
  UPDATE_UNIT = 'UPDATE_UNIT',
  DELETE_UNIT = 'DELETE_UNIT',
  INVITE_TENANT = 'INVITE_TENANT',
  SEND_INVOICE = 'SEND_INVOICE',
  UPDATE_RENT = 'UPDATE_RENT',
  SEND_REPORT = 'SEND_REPORT',
  CANCEL_PAYMENT = 'CANCEL_PAYMENT',
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    pmId: number;
    ownerPmId: number;
    action: ActivityAction | string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: any;
  }) {
    // Only skip same-PM logs for standard collaboration actions, allow tenant requests
    if (params.pmId === params.ownerPmId && params.action !== 'TENANT_JOIN_REQUEST') return;

    return (this.prisma as any).upward_pm_activity_log.create({
      data: {
        pmId: params.pmId,
        ownerPmId: params.ownerPmId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        metadata: params.metadata,
      },
    });
  }

  async logPropertyAction(params: {
    pmId: number;
    propertyId: number;
    action: ActivityAction | string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: any;
  }) {
    const property = await (this.prisma as any).upward_pm_property.findUnique({
      where: { id: params.propertyId },
      select: { pmId: true }
    });

    if (!property) return;

    return this.log({
      ...params,
      ownerPmId: property.pmId,
    });
  }

  async logUnitAction(params: {
    pmId: number;
    unitId: number;
    action: ActivityAction | string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: any;
  }) {
    const unit = await (this.prisma as any).upward_pm_unit.findUnique({
      where: { id: params.unitId },
      include: { property: { select: { pmId: true } } }
    });

    if (!unit) return;

    return this.log({
      ...params,
      ownerPmId: unit.property.pmId,
    });
  }

  async getLogsForCollaborator(ownerPmId: number, collaboratorPmId: number) {
    return (this.prisma as any).upward_pm_activity_log.findMany({
      where: {
        ownerPmId,
        pmId: collaboratorPmId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
