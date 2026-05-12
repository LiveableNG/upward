import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  PM_DOCUMENT_REPOSITORY, IPmDocumentRepository,
  PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity,
  PM_UNIT_REPOSITORY, IUnitRepository, UnitEntity,
  PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository
} from '../../../../domains/pm/IPropertyRepository';
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '../../../../domains/payments/payment.repository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';
import { EmailService } from '../../../../shared/infrastructure/email/email.service';
import * as crypto from 'crypto';


export interface SendDocumentDto {
  tenantUuid?: string;
  unitUuid?: string;
  subject: string;
  content: string;
  documentType: string;
  recipientName: string;
  recipientEmail: string;
  paymentRequestUuid?: string;
  includeLetterhead?: boolean;
}

@Injectable()
export class SendDocumentUseCase {
  constructor(
    @Inject(PM_DOCUMENT_REPOSITORY)
    private readonly documentRepo: IPmDocumentRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly corePaymentRepo: IPaymentRequestRepository,
    private readonly configService: ConfigService,
    private readonly s3Service: S3Service,
    private readonly emailService: EmailService,
  ) {}

  async execute(pmId: number, data: SendDocumentDto) {
    let tenantId: number | null = null;
    let unitId: number | null = null;
    let content = data.content;

    // 1. Fetch Context Data
    const pm = await this.pmRepo.findById(pmId);
    let tenant: TenantEntity | null = null;
    let unit: UnitEntity | null = null;

    if (data.tenantUuid) {
      tenant = await this.tenantRepo.findByUuid(data.tenantUuid);
      if (tenant) {
        tenantId = tenant.id;
        if (tenant.units && tenant.units.length > 0) {
          unit = tenant.units[0] || null;
          unitId = unit?.id || null;
        }
      }
    }

    if (data.unitUuid && !unit) {
      unit = await this.unitRepo.findByUuid(data.unitUuid);
      if (unit) unitId = unit.id;
    }

    const formatDate = (date: Date | null | undefined) => {
      if (!date) return '__________';
      return new Date(date).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    };

    const calculateEndDate = (unit: any) => {
      if (unit?.rentEndDate) return formatDate(unit.rentEndDate);
      if (!unit?.rentStartDate) return '__________';
      const end = new Date(unit.rentStartDate);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return formatDate(end);
    };

    let paymentLink = '__________';
    if (data.paymentRequestUuid) {
      try {
        const pmPR = await this.pmPaymentRepo.findByUuid(data.paymentRequestUuid);
        if (pmPR && pmPR.paymentRequestId) {
          const corePR = await this.corePaymentRepo.findById(pmPR.paymentRequestId);
          if (corePR) {
            const frontendUrl = this.configService.get<string>('FRONTEND_URL');
            const baseUrl = frontendUrl ? frontendUrl?.split(',')[0]?.trim() : 'https://upward.goodtenants.io';
            paymentLink = `${baseUrl}/pay/${corePR.uuid}`;
          }
        }
      } catch (err) {
        console.error('Failed to resolve payment link for document:', err);
      }
    }

    const placeholders: Record<string, string> = {
      '[Recipient Name]': data.recipientName || (tenant ? `${tenant.firstName} ${tenant.lastName}` : '__________'),
      '[Tenant Name]': tenant ? `${tenant.firstName} ${tenant.lastName}` : (data.recipientName || '__________'),
      '[TenantFirstName]': tenant?.firstName || data.recipientName.split(' ')[0] || '__________',
      '[TenantLastName]': tenant?.lastName || data.recipientName.split(' ').slice(1).join(' ') || '__________',
      '[TenantPhone]': tenant?.phone || '__________',
      '[TenantEmail]': tenant?.email || '__________',
      '[UnitName]': unit ? unit.unitName : '__________',
      '[Unit Name]': unit ? unit.unitName : '__________',
      '[RentAmount]': unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : '__________',
      '[Rent Amount]': unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : '__________',
      '[PropertyName]': unit?.property?.name || '__________',
      '[Property Name]': unit?.property?.name || '__________',
      '[PropertyAddress]': unit?.property?.address || '__________',
      '[Property Address]': unit?.property?.address || '__________',
      '[LandlordName]': unit?.property?.landlordName || '__________',
      '[LandlordEmail]': unit?.property?.landlordEmail || '__________',
      '[RentStartDate]': formatDate(unit?.rentStartDate),
      '[RentEndDate]': calculateEndDate(unit),
      '[Date]': formatDate(new Date()),
      '[CurrentDate]': formatDate(new Date()),
      '[ManagerName]': pm ? `${pm.firstName} ${pm.lastName}` : 'The Property Manager',
      '[PaymentLink]': paymentLink,
      '[Payment Link]': paymentLink,
    };

    Object.entries(placeholders).forEach(([tag, value]) => {
      content = content.split(tag).join(value);
    });

    // 2.5 Apply Letterhead if requested
    if (data.includeLetterhead && pm) {
      const headerUrl = pm.letterheadHeaderUrl ? await this.s3Service.getDownloadUrl(pm.letterheadHeaderUrl) : null;
      const footerUrl = pm.letterheadFooterUrl ? await this.s3Service.getDownloadUrl(pm.letterheadFooterUrl) : null;

      let wrappedContent = `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto;">`;
      
      if (headerUrl) {
        wrappedContent += `
          <div style="margin-bottom: 30px; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px;">
            <img src="${headerUrl}" style="max-width: 100%; max-height: 150px; object-fit: contain;" alt="Letterhead Header" />
          </div>`;
      }

      wrappedContent += `<div style="padding: 10px 0; min-height: 500px;">${content}</div>`;

      if (footerUrl) {
        wrappedContent += `
          <div style="margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <img src="${footerUrl}" style="max-width: 100%; max-height: 100px; object-fit: contain;" alt="Letterhead Footer" />
          </div>`;
      }

      wrappedContent += `</div>`;
      content = wrappedContent;
    }

    // 3. Upload Snapshot to S3
    const sentUuid = crypto.randomUUID();
    const s3Key = `pm-docs/sent/pm_${pmId}/${sentUuid}.html`;
    await this.s3Service.uploadBuffer(
      Buffer.from(content),
      s3Key,
      'text/html'
    );

    if (data.documentType === 'PDF') {
      let browser;
      let pdfBuffer;
      try {
        if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
          const chromium = require('@sparticuz/chromium');
          const puppeteer = require('puppeteer-core');
          browser = await puppeteer.launch({
            args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: true,
            ignoreHTTPSErrors: true,
          });
        } else {
          const puppeteer = require('puppeteer');
          browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
        }

        const page = await browser.newPage();
        await page.setContent(content, { waitUntil: 'networkidle0' });
        
        pdfBuffer = await page.pdf({
          format: 'A4',
          margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
          printBackground: true
        });

        await browser.close();
        pdfBuffer = Buffer.from(pdfBuffer);
      } catch (error) {
        if (browser) await browser.close();
        console.error('PDF Generation Error in SendDocument:', error);
        throw error;
      }
      
      await this.emailService.sendEmailWithRetry({
        userId: pm?.uuid || '',
        email: data.recipientEmail,
        subject: data.subject,
        html: `<p>Hello ${data.recipientName},</p><p>Please find the attached document: <strong>${data.subject}</strong> from your property manager.</p>`,
        type: 'DOCUMENT',
        attachments: [
          {
            filename: `${data.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            content: pdfBuffer,
          }
        ]
      } as any);
    } else {
      await this.emailService.sendGenericEmail(
        data.recipientEmail,
        data.subject,
        content,
        pm?.uuid
      );
    }

    // 5. Save the record
    return this.documentRepo.saveSentDocument({
      uuid: sentUuid,
      pmId,
      tenantId,
      unitId,
      subject: data.subject,
      content: s3Key,
      documentType: data.documentType,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      status: 'SENT',
      includeLetterhead: data.includeLetterhead || false,
    });
  }
}
