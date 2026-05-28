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

    const placeholders: Record<string, string> = {
      '[Recipient Name]': recipientName || (tenant ? `${tenant.firstName} ${tenant.lastName}` : '__________'),
      '[Tenant Name]': tenant ? `${tenant.firstName} ${tenant.lastName}` : (recipientName || '__________'),
      '[TenantFirstName]': tenant?.firstName || recipientName?.split(' ')[0] || '__________',
      '[TenantLastName]': tenant?.lastName || recipientName?.split(' ').slice(1).join(' ') || '__________',
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

    content = `${marginStyle}\n<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6;">${content}</div>`;
    
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
        printBackground: true
      });

      await browser.close();

      // Overlay background letterhead if configuration exists
      if (activeLetterhead && activeLetterhead.templateFileKey) {
        try {
          const downloadUrl = await this.s3Service.getDownloadUrl(activeLetterhead.templateFileKey);
          const response = await fetch(downloadUrl);
          const templateBuffer = Buffer.from(await response.arrayBuffer());

          const { PDFDocument: PDFLibDocument } = require('pdf-lib');
          const contentPdfDoc = await PDFLibDocument.load(pdfBuffer);
          const templatePdfDoc = await PDFLibDocument.load(templateBuffer);

          const contentPages = contentPdfDoc.getPages();
          const templatePages = templatePdfDoc.getPages();

          for (let i = 0; i < contentPages.length; i++) {
            const contentPage = contentPages[i];
            let bgPageToUse = templatePages[0];

            if (i > 0) {
              const reuse = activeLetterhead.templateConfig?.reuse_first_page_for_continuation !== false;
              if (templatePages.length >= 2) {
                bgPageToUse = templatePages[1];
              } else if (!reuse) {
                bgPageToUse = null; // No letterhead on continuation pages if not reusing
              }
            }

            if (bgPageToUse) {
              const [embeddedBg] = await contentPdfDoc.embedPages([bgPageToUse]);
              contentPage.drawPage(embeddedBg, {
                x: 0,
                y: 0,
                width: contentPage.getWidth(),
                height: contentPage.getHeight(),
              });
            }
          }

          const modifiedPdfBytes = await contentPdfDoc.save();
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
