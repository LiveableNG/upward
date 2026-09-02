import { Injectable, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { 
  IApprovalRequestRepository, 
  CreateApprovalRequestInput, 
  ApprovalRequest 
} from '../../../../domains/pm/IApprovalRequestRepository';
import { EncryptionService } from '../../common/encryption.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class PrismaPmApprovalRequestRepository implements IApprovalRequestRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  async create(input: CreateApprovalRequestInput): Promise<ApprovalRequest> {
    const data: any = {
      requesterPmId: input.requesterPmId,
      ownerPmId: input.ownerPmId,
      type: input.type,
      propertyUuid: input.propertyUuid,
      propertyName: input.propertyName,
      status: 'PENDING',
      payload: {
        unitUuid: input.unitUuid,
        unitName: input.unitName,
        ...(input.payload || {})
      }
    };

    if (input.unitUuid) data.unitUuid = input.unitUuid;
    if (input.unitName) data.unitName = input.unitName;

    const record = await (this.prisma as any).upward_pm_approval_request.create({ data });

    // Create In-App Notification & Send Email to Admin Owner
    try {
      const requester = await this.prisma.upward_property_manager.findUnique({
        where: { id: input.requesterPmId },
        select: { firstName: true, email: true }
      });
      const owner = await this.prisma.upward_property_manager.findUnique({
        where: { id: input.ownerPmId },
        select: { firstName: true, email: true }
      });

      const requesterName = requester?.firstName ? this.encryption.decrypt(requester.firstName) : (requester?.email ? this.encryption.decrypt(requester.email) : 'A team manager');
      const ownerEmail = owner?.email ? this.encryption.decrypt(owner.email) : null;
      const isUnit = input.type.includes('UNIT');
      const itemLabel = isUnit ? `Unit ${input.unitName || ''}` : `Property ${input.propertyName || ''}`;
      const actionLabel = input.type.startsWith('EDIT') ? 'edit' : 'delete';

      const notifTitle = 'Pending Approval Request';
      const notifMsg = `${requesterName} submitted a request to ${actionLabel} ${itemLabel.trim()}.`;

      // 1. In-App Popup Notification
      await this.prisma.upward_pm_notification.create({
        data: {
          pmId: input.ownerPmId,
          title: notifTitle,
          message: notifMsg,
          type: 'APPROVAL_REQUEST',
          isPopup: true, // Shows popup modal when opening app
          url: '/settings?tab=approvals',
        }
      });

      // 2. Email Notification to Admin
      if (ownerEmail && this.emailService) {
        const html = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111827;">
            <h2 style="color: #166534; margin-top: 0;">New Approval Request Submitted</h2>
            <p>Hello,</p>
            <p><strong>${requesterName}</strong> has submitted a request requiring your approval:</p>
            <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Action:</strong> ${actionLabel.toUpperCase()}</p>
              <p style="margin: 0;"><strong>Target:</strong> ${itemLabel.trim()}</p>
            </div>
            <p>Please review and approve or reject this request in your Upward PM settings dashboard.</p>
            <a href="https://pm.upward.ng/settings?tab=approvals" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; margin-top: 12px;">Review Approval Request</a>
          </div>
        `;
        this.emailService.sendGenericEmail(ownerEmail, `Approval Request: ${actionLabel.toUpperCase()} ${itemLabel.trim()}`, html).catch(err => {
          console.error('Failed to send approval request email to admin:', err);
        });
      }
    } catch (err) {
      console.error('Failed to create admin notification for approval request:', err);
    }

    return this.mapToDomain(record);
  }

  async findByUuid(uuid: string): Promise<ApprovalRequest | null> {
    const record = await (this.prisma as any).upward_pm_approval_request.findUnique({
      where: { uuid },
      include: {
        requesterPm: {
          select: {
            uuid: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findPendingByOwner(ownerPmId: number): Promise<ApprovalRequest[]> {
    const records = await (this.prisma as any).upward_pm_approval_request.findMany({
      where: { ownerPmId },
      include: {
        requesterPm: {
          select: {
            uuid: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return records.map((rec: any) => this.mapToDomain(rec));
  }

  async updateStatus(uuid: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Promise<ApprovalRequest> {
    const record = await (this.prisma as any).upward_pm_approval_request.update({
      where: { uuid },
      data: {
        status,
        rejectionReason: rejectionReason || null
      }
    });

    // Create In-App Notification & Send Email to Manager Requester
    try {
      const requester = await this.prisma.upward_property_manager.findUnique({
        where: { id: record.requesterPmId },
        select: { firstName: true, email: true }
      });
      const requesterEmail = requester?.email ? this.encryption.decrypt(requester.email) : null;
      const isUnit = record.type.includes('UNIT');
      const itemLabel = isUnit ? `Unit ${record.unitName || ''}` : `Property ${record.propertyName || ''}`;
      const actionLabel = record.type.startsWith('EDIT') ? 'edit' : 'delete';

      const notifTitle = `Approval Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`;
      const notifMsg = `Your request to ${actionLabel} ${itemLabel.trim()} was ${status.toLowerCase()}.${status === 'REJECTED' && rejectionReason ? ` Reason: ${rejectionReason}` : ''}`;

      // 1. In-App Popup Notification
      await this.prisma.upward_pm_notification.create({
        data: {
          pmId: record.requesterPmId,
          title: notifTitle,
          message: notifMsg,
          type: 'APPROVAL_RESULT',
          isPopup: true, // Shows popup modal when opening app
          url: '/settings?tab=approvals',
        }
      });

      // 2. Email Notification to Manager
      if (requesterEmail && this.emailService) {
        const html = `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111827;">
            <h2 style="color: ${status === 'APPROVED' ? '#166534' : '#dc2626'}; margin-top: 0;">Approval Request ${status}</h2>
            <p>Hello,</p>
            <p>Your request to <strong>${actionLabel}</strong> ${itemLabel.trim()} has been <strong>${status.toLowerCase()}</strong> by your company Admin.</p>
            ${status === 'REJECTED' && rejectionReason ? `<p style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 6px;"><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
            <p>You can view your approval history in your Upward PM settings dashboard.</p>
            <a href="https://pm.upward.ng/settings?tab=approvals" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; margin-top: 12px;">View Approvals</a>
          </div>
        `;
        this.emailService.sendGenericEmail(requesterEmail, `Approval Request ${status}: ${itemLabel.trim()}`, html).catch(err => {
          console.error('Failed to send approval result email to manager:', err);
        });
      }
    } catch (err) {
      console.error('Failed to create manager notification for approval resolution:', err);
    }

    return this.mapToDomain(record);
  }

  private mapToDomain(record: any): ApprovalRequest {
    let requesterPm = undefined;
    if (record.requesterPm) {
      requesterPm = {
        uuid: record.requesterPm.uuid,
        firstName: record.requesterPm.firstName ? this.encryption.decrypt(record.requesterPm.firstName) : '',
        lastName: record.requesterPm.lastName ? this.encryption.decrypt(record.requesterPm.lastName) : '',
        email: record.requesterPm.email ? this.encryption.decrypt(record.requesterPm.email) : '',
      };
    }

    return {
      id: record.id,
      uuid: record.uuid,
      ownerPmId: record.ownerPmId,
      requesterPmId: record.requesterPmId,
      propertyUuid: record.propertyUuid,
      propertyName: record.propertyName,
      unitUuid: record.unitUuid || record.payload?.unitUuid || null,
      unitName: record.unitName || record.payload?.unitName || null,
      type: record.type,
      status: record.status,
      payload: record.payload,
      rejectionReason: record.rejectionReason,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      requesterPm
    };
  }
}
