import { Inject, Injectable } from '@nestjs/common';
import { PM_DOCUMENT_REPOSITORY, IPmDocumentRepository } from '../../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

const DEFAULT_TEMPLATES = [
  {
    uuid: 'system-default-rent-review',
    name: 'Rent Review Notice',
    type: 'RENT_REVIEW',
    content: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h1 style="text-align: center; color: #1a4d2e; font-size: 24px; margin-bottom: 20px;">Rent Review Notice</h1>
        <div style="margin-bottom: 20px; color: #666;">
          <p><strong>Date:</strong> [Date]</p>
          <p><strong>To:</strong> [Tenant Name]</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Dear [TenantFirstName],</p>
        <p>This is to inform you of a rent review for your unit at <strong>[UnitName]</strong>, <strong>[PropertyName]</strong>.</p>
        <p>As part of our commitment to maintaining high standards of property management and in line with current market trends, we have conducted a review of your current rental agreement.</p>
        <p>Your current rent of <strong>[RentAmount]</strong> is being reviewed to ensure it aligns with the value and services provided at the property.</p>
        <br />
        <p>Best regards,</p>
        <p><strong>[ManagerName]</strong></p>
        <p style="font-size: 12px; color: #999; margin-top: 40px; text-align: center;">Generated via Upward Property Management</p>
      </div>
    `,
    updatedAt: new Date().toISOString(),
    isSystem: true
  },
  {
    uuid: 'system-default-rent-renewal',
    name: 'Rent Renewal Notice',
    type: 'LEASE_AGREEMENT',
    content: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h1 style="text-align: center; color: #1a4d2e; font-size: 24px; margin-bottom: 20px;">Rent Renewal Notice</h1>
        <div style="margin-bottom: 20px; color: #666;">
          <p><strong>Date:</strong> [Date]</p>
          <p><strong>To:</strong> [Tenant Name]</p>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Dear [TenantFirstName],</p>
        <p>Your lease is due for renewal for your unit at <strong>[UnitName]</strong>, <strong>[PropertyName]</strong>.</p>
        <p>We have enjoyed having you as a tenant and would like to offer you a renewal of your tenancy agreement. Your current lease is set to expire on <strong>[RentEndDate]</strong>.</p>
        <p>Please contact our office at your earliest convenience to discuss the terms of your renewal and to ensure a seamless transition into your next lease term.</p>
        <br />
        <p>Best regards,</p>
        <p><strong>[ManagerName]</strong></p>
        <p style="font-size: 12px; color: #999; margin-top: 40px; text-align: center;">Generated via Upward Property Management</p>
      </div>
    `,
    updatedAt: new Date().toISOString(),
    isSystem: true
  }
];

@Injectable()
export class GetPmDocumentsUseCase {
  constructor(
    @Inject(PM_DOCUMENT_REPOSITORY)
    private readonly documentRepo: IPmDocumentRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(pmId: number) {
    const [templates, history] = await Promise.all([
      this.documentRepo.findTemplatesByPmId(pmId),
      this.documentRepo.findSentDocumentsByPmId(pmId),
    ]);

    const [resolvedTemplates, resolvedHistory] = await Promise.all([
      Promise.all(templates.map(async (t) => {
        if (t.content && t.content.startsWith('pm-docs/')) {
          try {
            const actualContent = await this.s3Service.getFileContent(t.content);
            return { ...t, content: actualContent };
          } catch (error) {
            console.error(`Failed to fetch S3 content for template ${t.uuid}:`, error);
            return t;
          }
        }
        return t;
      })),
      Promise.all(history.map(async (h) => {
        if (h.content && h.content.startsWith('pm-docs/')) {
          try {
            const actualContent = await this.s3Service.getFileContent(h.content);
            return { ...h, content: actualContent };
          } catch (error) {
            console.error(`Failed to fetch S3 content for history ${h.uuid}:`, error);
            return h;
          }
        }
        return h;
      }))
    ]);

    return {
      templates: [...DEFAULT_TEMPLATES, ...resolvedTemplates],
      history: resolvedHistory,
    };
  }
}
