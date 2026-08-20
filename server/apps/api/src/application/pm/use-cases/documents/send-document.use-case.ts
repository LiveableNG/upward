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
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { SmsService } from '../../../../shared/infrastructure/sms/sms.service';
import { WhatsappService } from '../../../../shared/infrastructure/whatsapp/whatsapp.service';
import { UnifiedCommunicationService } from '../../../../shared/infrastructure/communication/unified-communication.service';
import * as crypto from 'crypto';


import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { GenerateDocumentPdfUseCase } from './generate-document-pdf.use-case';
import {
  EMPTY_PLACEHOLDER,
  formatDisplayDate,
  getLeaseEndDate,
  getNextRentStartDate,
  getNextRentEndDate,
  formatAmountInWords,
  formatTimeframeUntilDate,
  formatTimeframeUntilDateInWords,
} from '../../utils/documentPlaceholders';

export interface SendDocumentDto {
  uuid?: string;
  tenantUuid?: string;
  unitUuid?: string;
  subject: string;
  fromEmail?: string;
  content: string;
  documentType: string;
  recipientName: string;
  recipientEmail: string;
  paymentRequestUuid?: string;
  includeLetterhead?: boolean;
  deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'MANUAL';
  cc?: string;
  bcc?: string;
  isWelcomeTemplate?: boolean;
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
    private readonly prisma: PrismaService,
    private readonly generatePdfUseCase: GenerateDocumentPdfUseCase,
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsappService,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(actorPmId: number, data: SendDocumentDto) {
    let tenantId: number | null = null;
    let unitId: number | null = null;
    let content = data.content;

    let tenant: TenantEntity | null = null;
    let unit: UnitEntity | null = null;

    const isEdit = !!data.uuid;
    const sentUuid = data.uuid || crypto.randomUUID();

    if (isEdit) {
      const existing = await this.prisma.upward_pm_sent_document.findUnique({
        where: { uuid: data.uuid }
      });
      if (!existing) {
        throw new Error('Document not found');
      }
      tenantId = existing.tenantId;
      unitId = existing.unitId;
      if (unitId) {
        const unitRecord = await this.prisma.upward_pm_unit.findUnique({
          where: { id: unitId },
          include: { property: true }
        });
        if (unitRecord) {
          unit = unitRecord as any;
        }
      }
    }

    if (data.tenantUuid && !isEdit) {
      tenant = await this.tenantRepo.findByUuid(data.tenantUuid);
      if (tenant) {
        tenantId = tenant.id;
        if (tenant.units && tenant.units.length > 0) {
          unit = tenant.units[0] || null;
          unitId = unit?.id || null;
        }

        const isDummyEmail = (email: string) => {
          if (!email) return true;
          const normalized = email.toLowerCase();
          return (
            normalized.includes('@upward.local') ||
            normalized.includes('@upward.com') ||
            normalized.startsWith('guest-') ||
            normalized.includes('dummy')
          );
        };

        if (isDummyEmail(tenant.email || '') && data.recipientEmail && !isDummyEmail(data.recipientEmail)) {
          const newEmailHash = crypto.createHash('sha256').update(data.recipientEmail.toLowerCase().trim()).digest('hex');
          const newEmailEncrypted = this.encryption.encrypt(data.recipientEmail);

          // Update PM Tenant record in database
          await this.prisma.upward_pm_tenant.update({
            where: { id: tenant.id },
            data: {
              emailEncrypted: newEmailEncrypted,
              emailHash: newEmailHash,
            }
          });

          tenant.email = data.recipientEmail;
          tenant.emailHash = newEmailHash;
        }
      }
    }

    if (data.unitUuid && !unit && !isEdit) {
      unit = await this.unitRepo.findByUuid(data.unitUuid);
      if (unit) unitId = unit.id;
    }

    // Resolve ownerPmId from unit or tenant first to support team collaboration settings
    let pmId = actorPmId;
    if (unit?.property?.pmId) {
      pmId = unit.property.pmId;
    } else if (tenant?.pmId) {
      pmId = tenant.pmId;
    }

    // 1. Fetch Context Data
    const pm = await this.pmRepo.findById(pmId);

    let s3Key = `pm-docs/sent/pm_${pmId}/${sentUuid}.html`;
    if (isEdit) {
      const existing = await this.prisma.upward_pm_sent_document.findUnique({
        where: { uuid: data.uuid }
      });
      if (existing) {
        s3Key = existing.content; // Reuse S3 key
      }
    }

    let paymentURL = '__________';
    let bankDetails = '__________';
    let paymentInfo = '__________';

    if (data.paymentRequestUuid) {
      try {
        const pmPR = await this.pmPaymentRepo.findByUuid(data.paymentRequestUuid);
        if (pmPR && pmPR.paymentRequestId) {
          const corePR = await this.corePaymentRepo.findById(pmPR.paymentRequestId);
          if (corePR) {
            const frontendUrl = this.configService.get<string>('FRONTEND_URL');
            const baseUrl = frontendUrl ? frontendUrl?.split(',')[0]?.trim() : 'https://upward.goodtenants.io';
            paymentURL = `${baseUrl}/pay/${corePR.uuid}`;
          }
        }

        if (unit && unit.userPropertyUuid) {
          const userProperty = await this.prisma.upward_user_property.findFirst({
            where: { uuid: unit.userPropertyUuid }
          });
          if (userProperty) {
            const dva = await this.prisma.upward_dedicated_virtual_account.findFirst({
              where: { userPropertyId: userProperty.id }
            });
            if (dva) {
              bankDetails = `
                <div style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin: 16px 0;">
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Bank Name</div>
                  <div style="font-weight: 700; color: #1e293b; margin-bottom: 12px;">${dva.bankName}</div>
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Account Name</div>
                  <div style="font-weight: 700; color: #1e293b; margin-bottom: 12px;">${dva.accountName}</div>
                  <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">Account Number</div>
                  <div style="font-weight: 700; color: #166534; font-size: 18px; letter-spacing: 1px;">${dva.accountNumber}</div>
                </div>
              `;
              paymentInfo = bankDetails;
            }
          }
        }

        if (paymentInfo === '__________' && paymentURL !== '__________') {
          paymentInfo = `<a href="${paymentURL}" style="color: #166534; font-weight: 700; text-decoration: underline;">Pay via Secure Link</a>`;
        }
      } catch (err) {
        console.error('Failed to resolve payment details for document:', err);
      }
    }

    const rentEndDate = (unit as any)?.rentEndDate ? new Date((unit as any).rentEndDate) : getLeaseEndDate(unit?.rentStartDate);
    const nextRentStartDate = getNextRentStartDate(unit?.rentStartDate);
    const nextRentEndDate = getNextRentEndDate(unit?.rentStartDate);
    const amountInWords = formatAmountInWords(unit?.rentAmount, unit?.currency);
    const timeFrame = formatTimeframeUntilDate(rentEndDate);
    const timeFrameInWords = formatTimeframeUntilDateInWords(rentEndDate);

    const lastPayment = unit ? await this.prisma.upward_pm_rent_payment.findFirst({
      where: { unitId: unit.id, status: 'SUCCESS' },
      orderBy: { paymentDate: 'desc' }
    }) : null;

    const lastPaymentDateStr = lastPayment ? formatDisplayDate(lastPayment.paymentDate) : 'N/A';
    const lastPaymentAmountStr = lastPayment ? `${unit?.currency || '₦'}${lastPayment.amount.toLocaleString()}` : 'N/A';

    const getTenantName = (t: any) => {
      if (!t) return '';

      return t.commercialName || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Tenant';
    };

    const now = new Date();
    const currentMonth = now.toLocaleDateString('en-GB', { month: 'long' });
    const currentYear = now.getFullYear().toString();
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(now.getMonth() + 1);
    const nextMonth = nextMonthDate.toLocaleDateString('en-GB', { month: 'long' });
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(now.getMonth() - 1);
    const previousMonth = prevMonthDate.toLocaleDateString('en-GB', { month: 'long' });

    const fallbackAddr = (unit?.unitName && unit?.property?.address) ? `Unit ${unit.unitName}, ${unit.property.address}` : '';
    const tenantAddress = tenant?.formerAddress || fallbackAddr || '__________';
    const unitNumber = unit?.unitName || '__________';
    const propertyType = unit?.property?.propertyType || unit?.unitType || 'Residential';
    const rentType = unit?.rentType || 'Monthly';
    const rentAmountStr = unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : '__________';
    const serviceChargeStr = '__________';
    const totalAmountStr = rentAmountStr;
    const normRentType = (unit?.rentType || '').trim().toUpperCase();
    const rentDuration = (normRentType === 'YEARLY' || normRentType === 'ANNUALLY') ? '12 Months' : normRentType === 'MONTHLY' ? '1 Month' : '__________';

    const companyName = pm?.businessName || '__________';
    const companyAddress = pm?.companyAddress || pm?.country || '__________';
    const companyPhone = pm?.phone || '__________';
    const companyEmail = pm?.email || '__________';
    const managerPhone = pm?.phone || '__________';
    const managerEmail = pm?.email || '__________';
    const managerName = pm ? `${pm.firstName} ${pm.lastName}`.trim() : 'The Property Manager';

    const docHash = sentUuid ? `DOC-${sentUuid.substring(0, 8).toUpperCase()}` : `DOC-${Math.floor(100000 + Math.random() * 900000)}`;

    const placeholders: Record<string, string> = {
      '[Recipient Name]': data.recipientName || (tenant ? getTenantName(tenant) : '__________'),
      '[TenantName]': tenant ? getTenantName(tenant) : (data.recipientName || '__________'),
      '[Tenant Name]': tenant ? getTenantName(tenant) : (data.recipientName || '__________'),
      '[TenantFirstName]': tenant?.commercialName ? tenant.commercialName : (tenant?.firstName || data.recipientName.split(' ')[0] || '__________'),
      '[Tenant FirstName]': tenant?.commercialName ? tenant.commercialName : (tenant?.firstName || data.recipientName.split(' ')[0] || '__________'),
      '[TenantLastName]': tenant?.commercialName ? '' : (tenant?.lastName || data.recipientName.split(' ').slice(1).join(' ') || '__________'),
      '[Tenant LastName]': tenant?.commercialName ? '' : (tenant?.lastName || data.recipientName.split(' ').slice(1).join(' ') || '__________'),
      '[TenantPhone]': tenant?.phone || '__________',
      '[Tenant Phone]': tenant?.phone || '__________',
      '[TenantEmail]': tenant?.email || '__________',
      '[Tenant Email]': tenant?.email || '__________',
      '[TenantAddress]': tenantAddress,
      '[Tenant Address]': tenantAddress,

      '[UnitName]': unit ? unit.unitName : '__________',
      '[Unit Name]': unit ? unit.unitName : '__________',
      '[UnitNumber]': unitNumber,
      '[Unit Number]': unitNumber,
      '[PropertyName]': unit?.property?.name || '__________',
      '[Property Name]': unit?.property?.name || '__________',
      '[PropertyAddress]': unit?.property?.address || '__________',
      '[Property Address]': unit?.property?.address || '__________',
      '[PropertyType]': propertyType,
      '[Property Type]': propertyType,

      '[LeaseStartDate]': formatDisplayDate(unit?.rentStartDate),
      '[Lease Start Date]': formatDisplayDate(unit?.rentStartDate),
      '[LeaseEndDate]': formatDisplayDate(rentEndDate),
      '[Lease End Date]': formatDisplayDate(rentEndDate),
      '[LeaseDuration]': rentDuration,
      '[Lease Duration]': rentDuration,
      '[RentStartDate]': formatDisplayDate(unit?.rentStartDate),
      '[Rent Start Date]': formatDisplayDate(unit?.rentStartDate),
      '[RentEndDate]': formatDisplayDate(rentEndDate),
      '[Rent End Date]': formatDisplayDate(rentEndDate),
      '[RentDuration]': rentDuration,
      '[Rent Duration]': rentDuration,
      '[RentAmount]': rentAmountStr,
      '[Rent Amount]': rentAmountStr,
      '[AmountInWords]': amountInWords,
      '[Amount In Words]': amountInWords,
      '[RentType]': rentType,
      '[Rent Type]': rentType,
      '[NextRentStartDate]': formatDisplayDate(nextRentStartDate),
      '[Next Rent Start Date]': formatDisplayDate(nextRentStartDate),
      '[Next rent start date]': formatDisplayDate(nextRentStartDate),
      '[NextRentEndDate]': formatDisplayDate(nextRentEndDate),
      '[Next Rent End Date]': formatDisplayDate(nextRentEndDate),
      '[Next rent end date]': formatDisplayDate(nextRentEndDate),
      '[TimeFrame]': timeFrame,
      '[Time Frame]': timeFrame,
      '[Timeframe]': timeFrame,
      '[timeframe]': timeFrame,
      '[Time frame (period between now/current_time and rent end date)]': timeFrame,
      '[TimeframeinWords]': timeFrameInWords,
      '[Timeframe in Words]': timeFrameInWords,
      '[Timeframe in words]': timeFrameInWords,
      '[ServiceCharge]': serviceChargeStr,
      '[Service Charge]': serviceChargeStr,
      '[TotalAmount]': totalAmountStr,
      '[Total Amount]': totalAmountStr,
      '[PaymentDueDate]': formatDisplayDate(unit?.rentDueDate),
      '[Payment Due Date]': formatDisplayDate(unit?.rentDueDate),

      '[CompanyName]': companyName,
      '[Company Name]': companyName,
      '[CompanyAddress]': companyAddress,
      '[Company Address]': companyAddress,
      '[CompanyPhone]': companyPhone,
      '[Company Phone]': companyPhone,
      '[CompanyEmail]': companyEmail,
      '[Company Email]': companyEmail,
      '[ManagerName]': managerName,
      '[Manager Name]': managerName,
      '[ManagerPhone]': managerPhone,
      '[Manager Phone]': managerPhone,
      '[ManagerEmail]': managerEmail,
      '[Manager Email]': managerEmail,

      '[Date]': formatDisplayDate(new Date()),
      '[CurrentDate]': formatDisplayDate(new Date()),
      '[Current Date]': formatDisplayDate(new Date()),
      '[CurrentMonth]': currentMonth,
      '[Current Month]': currentMonth,
      '[CurrentYear]': currentYear,
      '[Current Year]': currentYear,
      '[NextMonth]': nextMonth,
      '[Next Month]': nextMonth,
      '[PreviousMonth]': previousMonth,
      '[Previous Month]': previousMonth,

      '[LastPaymentDate]': lastPaymentDateStr,
      '[Last Payment Date]': lastPaymentDateStr,
      '[LastPaymentAmount]': lastPaymentAmountStr,
      '[Last Payment Amount]': lastPaymentAmountStr,

      '[DocumentDate]': formatDisplayDate(new Date()),
      '[Document Date]': formatDisplayDate(new Date()),
      '[DocumentNumber]': docHash,
      '[Document Number]': docHash,
      '[DocumentType]': data.documentType || 'PDF',
      '[Document Type]': data.documentType || 'PDF',

      '[LandlordName]': unit?.property?.landlordName || '__________',
      '[LandlordEmail]': unit?.property?.landlordEmail || '__________',

      '[PaymentInfo]': paymentInfo,
      '[Payment Info]': paymentInfo,
    };

    Object.entries(placeholders).forEach(([tag, value]) => {
      content = content.split(tag).join(value || EMPTY_PLACEHOLDER);
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

    let finalStatus = 'SENT';
    let s3UploadSuccess = false;
    let pdfS3Url: string | null = null;
    let finalError: any = null;

    try {
      // 3. Upload Snapshot to S3
      await this.s3Service.uploadBuffer(
        Buffer.from(content),
        s3Key,
        'text/html'
      );
      s3UploadSuccess = true;

        let pdfBuffer;
        if (data.documentType === 'PDF') {
          pdfBuffer = await this.generatePdfUseCase.execute({
            content: content,
            pmId,
            tenantUuid: data.tenantUuid,
            unitUuid: data.unitUuid,
            recipientName: data.recipientName,
            includeLetterhead: data.includeLetterhead,
          });
          
          const pdfS3Key = s3Key.replace('.html', '.pdf');
          await this.s3Service.uploadBuffer(pdfBuffer, pdfS3Key, 'application/pdf');
          
          const baseUrl = this.configService.get<string>('API_URL') || 
                          this.configService.get<string>('BACKEND_URL') || 
                          'http://localhost:4000';
          pdfS3Url = `${baseUrl}/api/v1/public/documents/${sentUuid}/pdf`;
        }

        const attachments = data.documentType === 'PDF' && pdfBuffer ? [
          {
            filename: `${data.subject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            content: pdfBuffer,
          }
        ] : undefined;

        if (data.deliveryChannel !== 'MANUAL') {
          await this.unifiedCommService.processCommunication({
            recipientEmail: data.recipientEmail,
            recipientPhone: tenant?.phone || undefined,
            recipientName: data.recipientName,
            recipientRole: 'TENANT',
            userId: tenant?.uuid || undefined,
            pmUuid: pm?.uuid,
            type: 'DOCUMENT',
            title: data.subject,
            forceChannel: data.deliveryChannel as any,
            fromOverride: data.fromEmail,
            attachments,
            cc: data.cc,
            bcc: data.bcc,
            context: {
              displayName: data.recipientName,
              subject: data.subject,
              htmlOverride: content,
            },
          });
        }
    } catch (err) {
      console.error('Document dispatch failed:', err);
      finalStatus = 'FAILED';
      finalError = err;
    }

    const finalContent = s3UploadSuccess ? s3Key : content; // Save raw HTML if S3 upload didn't succeed

    // 5. Save the record
    if (isEdit) {
      await this.prisma.upward_pm_sent_document.update({
        where: { uuid: sentUuid },
        data: {
          subject: data.subject,
          documentType: data.documentType,
          recipientName: data.recipientName,
          recipientEmail: data.recipientEmail,
          status: finalStatus,
          content: finalContent,
          includeLetterhead: data.includeLetterhead || false,
        }
      });

      if (finalStatus === 'FAILED') throw finalError;

      if (finalStatus === 'SENT' && tenantId && (data.isWelcomeTemplate || data.subject === 'Welcome to Upward — A Better Rental Experience Starts Here')) {
        await this.prisma.upward_pm_tenant.update({
          where: { id: tenantId },
          data: { hasReceivedWelcomeTemplate: true }
        });
      }

      const updatedDoc = await this.documentRepo.findSentDocumentByUuid(sentUuid);
      return { ...(updatedDoc as any), pdfUrl: pdfS3Url };
    } else {
      const result = await this.documentRepo.saveSentDocument({
        uuid: sentUuid,
        pmId,
        tenantId,
        unitId,
        subject: data.subject,
        content: finalContent,
        documentType: data.documentType,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        status: finalStatus,
        includeLetterhead: data.includeLetterhead || false,
      });

      if (finalStatus === 'FAILED') throw finalError;

      if (finalStatus === 'SENT' && tenantId && (data.isWelcomeTemplate || data.subject === 'Welcome to Upward — A Better Rental Experience Starts Here')) {
        await this.prisma.upward_pm_tenant.update({
          where: { id: tenantId },
          data: { hasReceivedWelcomeTemplate: true }
        });
      }

      return { ...(result as any), pdfUrl: pdfS3Url };
    }
  }
}
