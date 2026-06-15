import { Inject, Injectable } from '@nestjs/common';
import { 
  PM_TENANT_REPOSITORY, ITenantRepository, 
  PM_UNIT_REPOSITORY, IUnitRepository 
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { PM_LETTERHEAD_REPOSITORY, IPmLetterheadRepository } from '../../../../domains/pm/pm-letterhead.repository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GenerateDocumentPdfUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepo: IUnitRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepo: PropertyManagerRepository,
    @Inject(PM_LETTERHEAD_REPOSITORY) private readonly letterheadRepo: IPmLetterheadRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(params: { 
    content: string; 
    pmId: number;
    tenantUuid?: string; 
    unitUuid?: string;
    recipientName?: string;
    includeLetterhead?: boolean;
  }): Promise<Buffer> {
    const { content: rawContent, pmId, tenantUuid, unitUuid, recipientName, includeLetterhead } = params;
    let content = rawContent;

    // 1. Fetch Context for Replacement
    const pm = await this.pmRepo.findById(pmId);
    const tenant = tenantUuid ? await this.tenantRepo.findByUuid(tenantUuid) : null;
    const unit = unitUuid ? await this.unitRepo.findByUuid(unitUuid) : (tenant?.units?.[0] || null);

    const formatDate = (date: Date | null | undefined) => {
      if (!date) return '__________';
      return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const calculateEndDate = (unit: any) => {
      if (unit?.rentEndDate) return formatDate(unit.rentEndDate);
      if (!unit?.rentStartDate) return '__________';
      
      const end = new Date(unit.rentStartDate);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return formatDate(end);
    };

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

    const tenantAddress = tenant?.formerAddress || '__________';
    const unitNumber = unit?.unitName || '__________';
    const propertyType = unit?.property?.propertyType || unit?.unitType || 'Residential';
    const rentType = unit?.rentType || 'Monthly';
    const rentAmountStr = unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : '__________';
    const serviceChargeStr = '__________';
    const totalAmountStr = rentAmountStr;
    const rentDuration = unit?.rentType === 'YEARLY' ? '12 Months' : unit?.rentType === 'MONTHLY' ? '1 Month' : '__________';

    const companyName = pm?.businessName || '__________';
    const companyAddress = pm?.country || '__________';
    const companyPhone = pm?.phone || '__________';
    const companyEmail = pm?.email || '__________';
    const managerPhone = pm?.phone || '__________';
    const managerEmail = pm?.email || '__________';
    const managerName = pm ? `${pm.firstName} ${pm.lastName}`.trim() : 'The Property Manager';

    const placeholders: Record<string, string> = {
      '[Recipient Name]': recipientName || (tenant ? getTenantName(tenant) : '__________'),
      '[TenantName]': tenant ? getTenantName(tenant) : (recipientName || '__________'),
      '[Tenant Name]': tenant ? getTenantName(tenant) : (recipientName || '__________'),
      '[TenantFirstName]': tenant?.commercialName ? tenant.commercialName : (tenant?.firstName || recipientName?.split(' ')[0] || '__________'),
      '[Tenant FirstName]': tenant?.commercialName ? tenant.commercialName : (tenant?.firstName || recipientName?.split(' ')[0] || '__________'),
      '[TenantLastName]': tenant?.commercialName ? '' : (tenant?.lastName || recipientName?.split(' ').slice(1).join(' ') || '__________'),
      '[Tenant LastName]': tenant?.commercialName ? '' : (tenant?.lastName || recipientName?.split(' ').slice(1).join(' ') || '__________'),
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
      '[Bedrooms]': 'N/A',
      '[Bathrooms]': 'N/A',

      '[LeaseStartDate]': formatDate(unit?.rentStartDate),
      '[Lease Start Date]': formatDate(unit?.rentStartDate),
      '[LeaseEndDate]': calculateEndDate(unit),
      '[Lease End Date]': calculateEndDate(unit),
      '[LeaseDuration]': rentDuration,
      '[Lease Duration]': rentDuration,
      '[RentStartDate]': formatDate(unit?.rentStartDate),
      '[Rent Start Date]': formatDate(unit?.rentStartDate),
      '[RentEndDate]': calculateEndDate(unit),
      '[Rent End Date]': calculateEndDate(unit),
      '[RentDuration]': rentDuration,
      '[Rent Duration]': rentDuration,
      '[RentAmount]': rentAmountStr,
      '[Rent Amount]': rentAmountStr,
      '[RentType]': rentType,
      '[Rent Type]': rentType,
      '[ServiceCharge]': serviceChargeStr,
      '[Service Charge]': serviceChargeStr,
      '[TotalAmount]': totalAmountStr,
      '[Total Amount]': totalAmountStr,
      '[PaymentDueDate]': formatDate(unit?.rentDueDate),
      '[Payment Due Date]': formatDate(unit?.rentDueDate),

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

      '[Date]': formatDate(new Date()),
      '[CurrentDate]': formatDate(new Date()),
      '[Current Date]': formatDate(new Date()),
      '[CurrentMonth]': currentMonth,
      '[Current Month]': currentMonth,
      '[CurrentYear]': currentYear,
      '[Current Year]': currentYear,
      '[NextMonth]': nextMonth,
      '[Next Month]': nextMonth,
      '[PreviousMonth]': previousMonth,
      '[Previous Month]': previousMonth,

      '[OutstandingBalance]': 'N/A',
      '[Outstanding Balance]': 'N/A',
      '[LastPaymentDate]': 'N/A',
      '[Last Payment Date]': 'N/A',
      '[LastPaymentAmount]': 'N/A',
      '[Last Payment Amount]': 'N/A',

      '[DocumentDate]': formatDate(new Date()),
      '[Document Date]': formatDate(new Date()),
      '[DocumentNumber]': '__________',
      '[Document Number]': '__________',
      '[DocumentType]': 'PDF',
      '[Document Type]': 'PDF',

      '[LandlordName]': unit?.property?.landlordName || '__________',
      '[LandlordEmail]': unit?.property?.landlordEmail || '__________',

      '[PaymentURL]': '__________',
      '[Payment URL]': '__________',
      '[BankDetails]': '__________',
      '[Bank Details]': '__________',
      '[PaymentInfo]': '__________',
      '[Payment Info]': '__________',
      '[PaymentLink]': '__________', 
      '[Payment Link]': '__________',
    };

    Object.entries(placeholders).forEach(([tag, value]) => {
      content = content.split(tag).join(value);
    });

    // 1.5 Fetch Letterhead configuration
    const activeLetterhead = includeLetterhead && pm ? await this.letterheadRepo.findDefaultByPmId(pmId) : null;
    let marginStyle = '';

    if (activeLetterhead && activeLetterhead.templateConfig) {
      const config = activeLetterhead.templateConfig;
      const fp = config.first_page || { top: 170, bottom: 110, left: 50, right: 50 };
      const cp = config.continuation_page || { top: 100, bottom: 80, left: 50, right: 50 };
      
      marginStyle = `
        <style>
          @page :first {
            margin-top: ${fp.top ?? 170}pt;
            margin-bottom: ${fp.bottom ?? 110}pt;
            margin-left: ${fp.left ?? 50}pt;
            margin-right: ${fp.right ?? 50}pt;
          }
          @page {
            margin-top: ${cp.top ?? 100}pt;
            margin-bottom: ${cp.bottom ?? 80}pt;
            margin-left: ${cp.left ?? 50}pt;
            margin-right: ${cp.right ?? 50}pt;
          }
        </style>
      `;
    } else {
      marginStyle = `
        <style>
          @page {
            margin-top: 40px;
            margin-bottom: 40px;
            margin-left: 40px;
            margin-right: 40px;
          }
        </style>
      `;
    }

    content = `
      <style>
        html, body {
          background: transparent !important;
          -webkit-print-color-adjust: exact;
        }
        /* Strip any borders/outlines on top-level page wrappers from templates/editor */
        body > div, body > div > div {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
      </style>
      ${marginStyle}
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6;">${content}</div>
    `;
    
    let browser;
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
      
      // Set the content and wait for it to be ready
      await page.setContent(content, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        omitBackground: true
      });

      await browser.close();

      if (activeLetterhead && activeLetterhead.templateFileKey) {
        try {
          const templateBuffer = await this.s3Service.getFileBuffer(activeLetterhead.templateFileKey);

          const { PDFDocument: PDFLibDocument } = require('pdf-lib');
          const contentPdfDoc = await PDFLibDocument.load(pdfBuffer);
          const templatePdfDoc = await PDFLibDocument.load(templateBuffer);
          
          const resultPdfDoc = await PDFLibDocument.create();
          const contentPages = contentPdfDoc.getPages();
          const templatePages = templatePdfDoc.getPages();

          const embeddedContentPages = await resultPdfDoc.embedPages(contentPages);
          const embeddedTemplatePages = await resultPdfDoc.embedPages(templatePages);

          for (let i = 0; i < contentPages.length; i++) {
            const contentPage = contentPages[i];
            const { width, height } = contentPage.getSize();
            const newPage = resultPdfDoc.addPage([width, height]);

            let bgPageToUse = embeddedTemplatePages[0];
            if (i > 0) {
              const reuse = activeLetterhead.templateConfig?.reuse_first_page_for_continuation !== false;
              if (embeddedTemplatePages.length >= 2) {
                bgPageToUse = embeddedTemplatePages[1];
              } else if (!reuse) {
                bgPageToUse = null;
              }
            }

            if (bgPageToUse) {
              newPage.drawPage(bgPageToUse, {
                x: 0,
                y: 0,
                width,
                height,
              });
            }

            const embeddedContentPage = embeddedContentPages[i];
            newPage.drawPage(embeddedContentPage, {
              x: 0,
              y: 0,
              width,
              height,
            });
          }

          const modifiedPdfBytes = await resultPdfDoc.save();
          return Buffer.from(modifiedPdfBytes);
        } catch (overlayError) {
          console.error('Failed to overlay PDF template:', overlayError);
          // Return default PDF if overlay fails
          return Buffer.from(pdfBuffer);
        }
      }

      return Buffer.from(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      console.error('PDF Generation Error:', error);
      throw error;
    }
  }
}
