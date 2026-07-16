import { Inject, Injectable } from '@nestjs/common';
import { PM_DOCUMENT_REPOSITORY, IPmDocumentRepository } from '../../../../domains/pm/IPropertyRepository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

const DEFAULT_TEMPLATES = [
  {
    uuid: 'system-sample-template',
    name: 'Sample Template',
    type: 'SAMPLE',
    content: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header Section -->
        <div style="text-align: center; padding: 40px 20px; background-color: #f8fafc; border-bottom: 3px solid #1a4d2e; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #1a4d2e; font-size: 28px; letter-spacing: 1px; text-transform: uppercase;">Comprehensive Lease Review</h1>
          <p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Document ID: <strong>[DocumentNumber]</strong> &bull; Type: <strong>[DocumentType]</strong></p>
        </div>

        <!-- Body Content -->
        <div style="padding: 40px;">
          <!-- Date and Parties Grid -->
          <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding-right: 20px;">
                <h3 style="color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Prepared For</h3>
                <p style="margin: 4px 0;"><strong>[TenantName]</strong></p>
                <p style="margin: 4px 0; color: #475569;">[TenantPhone] | [TenantEmail]</p>
                <p style="margin: 4px 0; color: #475569;">[TenantAddress]</p>
              </td>
              <td style="width: 50%; vertical-align: top; padding-left: 20px;">
                <h3 style="color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Property Details</h3>
                <p style="margin: 4px 0;"><strong>Unit:</strong> [UnitName]</p>
                <p style="margin: 4px 0; color: #475569;"><strong>Property:</strong> [PropertyName]</p>
                <p style="margin: 4px 0; color: #475569;">[PropertyAddress]</p>
              </td>
            </tr>
          </table>

          <div style="background-color: #f1f5f9; padding: 15px 20px; border-left: 4px solid #1a4d2e; border-radius: 0 4px 4px 0; margin-bottom: 30px;">
            <p style="margin: 0; font-size: 14px;"><em>Issued on <strong>[Date]</strong>. This document covers the billing period from <strong>[PreviousMonth]</strong> to <strong>[NextMonth]</strong> of the year <strong>[CurrentYear]</strong>.</em></p>
          </div>

          <p>Dear <strong>[TenantFirstName] [TenantLastName]</strong>,</p>
          <p>We hope this correspondence finds you well. As the designated management team representing your landlord, <strong>[LandlordName]</strong> ([LandlordEmail]), we are reaching out regarding your ongoing tenancy at <strong>[PropertyName]</strong>.</p>

          <h2 style="color: #1a4d2e; font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 30px;">Financial & Lease Summary</h2>
          <p>Below is a dynamic breakdown of your current lease terms, automatically generated using our advanced placeholder system:</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <tr style="background-color: #1a4d2e; color: white; text-align: left;">
              <th style="padding: 12px 15px; border-radius: 4px 0 0 0;">Description</th>
              <th style="padding: 12px 15px; border-radius: 0 4px 0 0;">Detail</th>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 15px; background-color: #f8fafc;"><strong>Rent Amount</strong></td>
              <td style="padding: 12px 15px;">[RentAmount]</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 15px; background-color: #ffffff;"><strong>Payment Cycle</strong></td>
              <td style="padding: 12px 15px;">[RentType] ([RentDuration])</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 15px; background-color: #f8fafc;"><strong>Lease Period</strong></td>
              <td style="padding: 12px 15px;">[RentStartDate] to [RentEndDate]</td>
            </tr>
            <tr>
              <td style="padding: 12px 15px; background-color: #ffffff;"><strong>Next Payment Due</strong></td>
              <td style="padding: 12px 15px; color: #b91c1c; font-weight: bold;">[RentDueDate]</td>
            </tr>
          </table>

          <h2 style="color: #1a4d2e; font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 30px;">Payment Instructions</h2>
          <p>Please ensure your payments are routed to the following account to avoid any late penalties. You can pay directly online using the link below:</p>
          
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #92400e;"><strong>Bank Name:</strong> [BankName] &nbsp;&bull;&nbsp; <strong>Account Name:</strong> [AccountName]</p>
            <p style="margin: 0 0 15px 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1e3a8a;">[AccountNumber]</p>
            <a href="[PaymentLink]" style="display: inline-block; background-color: #1a4d2e; color: white; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold;">Pay Securely Online</a>
          </div>

          <p>If you require any assistance or wish to discuss these terms, please do not hesitate to contact our office.</p>
        </div>

        <!-- Footer Section -->
        <div style="background-color: #1e293b; color: #f8fafc; padding: 30px 40px; border-radius: 0 0 8px 8px; font-size: 13px;">
          <table style="width: 100%;">
            <tr>
              <td style="width: 60%;">
                <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: white;">[CompanyName]</p>
                <p style="margin: 0; color: #94a3b8;">[CompanyAddress]</p>
                <p style="margin: 5px 0 0 0; color: #94a3b8;">[CompanyEmail] &nbsp;&bull;&nbsp; [CompanyPhone]</p>
              </td>
              <td style="width: 40%; text-align: right; vertical-align: bottom;">
                <p style="margin: 0; color: #94a3b8;">Digitally Issued By:</p>
                <p style="margin: 5px 0 0 0; font-weight: bold; color: white;">[ManagerName]</p>
                <p style="margin: 2px 0 0 0; color: #94a3b8;">[ManagerEmail] | [ManagerPhone]</p>
              </td>
            </tr>
          </table>
        </div>
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
