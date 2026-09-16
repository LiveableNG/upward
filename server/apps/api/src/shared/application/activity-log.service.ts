
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export enum ActivityAction {
  CREATE_PROPERTY = 'CREATE_PROPERTY',
  UPDATE_PROPERTY = 'UPDATE_PROPERTY',
  DELETE_PROPERTY = 'DELETE_PROPERTY',
  CREATE_UNIT = 'CREATE_UNIT',
  UPDATE_UNIT = 'UPDATE_UNIT',
  DELETE_UNIT = 'DELETE_UNIT',
  BULK_CREATE_UNITS = 'BULK_CREATE_UNITS',
  BULK_FULL_IMPORT = 'BULK_FULL_IMPORT',
  ADD_RENT_HISTORY = 'ADD_RENT_HISTORY',
  CREATE_TENANT = 'CREATE_TENANT',
  ASSIGN_TENANT = 'ASSIGN_TENANT',
  INVITE_TENANT = 'INVITE_TENANT',
  BULK_INVITE_TENANTS = 'BULK_INVITE_TENANTS',
  SEND_INVOICE = 'SEND_INVOICE',
  UPDATE_RENT = 'UPDATE_RENT',
  DELETE_RENT = 'DELETE_RENT',
  SEND_REPORT = 'SEND_REPORT',
  CANCEL_PAYMENT = 'CANCEL_PAYMENT',
  PROCESS_REFUND = 'PROCESS_REFUND',
  ACCEPT_PAYMENT = 'ACCEPT_PAYMENT',
  BULK_SEND_DOCUMENT = 'BULK_SEND_DOCUMENT',
  SEND_DOCUMENT = 'SEND_DOCUMENT',
  CREATE_DOCUMENT_TEMPLATE = 'CREATE_DOCUMENT_TEMPLATE',
  UPDATE_DOCUMENT_TEMPLATE = 'UPDATE_DOCUMENT_TEMPLATE',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    pmId: number;
    ownerPmId: number;
    employeeId?: number;
    action: ActivityAction | string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: any;
  }) {
    return (this.prisma as any).upward_pm_activity_log.create({
      data: {
        pmId: params.pmId,
        ownerPmId: params.ownerPmId,
        employeeId: params.employeeId,
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
