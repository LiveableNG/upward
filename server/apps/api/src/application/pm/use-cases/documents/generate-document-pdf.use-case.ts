import { Inject, Injectable } from '@nestjs/common';
import { 
  PM_TENANT_REPOSITORY, ITenantRepository, 
  PM_UNIT_REPOSITORY, IUnitRepository 
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { S3Service } from '../../../../shared/infrastructure/common/s3/s3.service';

@Injectable()
export class GenerateDocumentPdfUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepo: IUnitRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepo: PropertyManagerRepository,
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

    // 1.5 Apply Letterhead if requested
    if (includeLetterhead && pm) {
      const headerUrl = pm.letterheadHeaderUrl ? await this.s3Service.getDownloadUrl(pm.letterheadHeaderUrl) : null;
      const footerUrl = pm.letterheadFooterUrl ? await this.s3Service.getDownloadUrl(pm.letterheadFooterUrl) : null;

      let wrappedContent = `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto;">`;
      
      if (headerUrl) {
        wrappedContent += `
          <div style="margin-bottom: 30px; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px;">
            <img src="${headerUrl}" style="max-width: 100%; max-height: 150px; object-fit: contain;" alt="Letterhead Header" />
          </div>`;
      }

      wrappedContent += `<div style="padding: 10px 0; min-height: 600px;">${content}</div>`;

      if (footerUrl) {
        wrappedContent += `
          <div style="margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            <img src="${footerUrl}" style="max-width: 100%; max-height: 100px; object-fit: contain;" alt="Letterhead Footer" />
          </div>`;
      } else {
         wrappedContent += `
          <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 10px; color: #999;">
            Generated via Upward Property Management Portal
          </div>`;
      }

      wrappedContent += `</div>`;
      content = wrappedContent;
    }

    
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
        margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
        printBackground: true
      });

      await browser.close();
      return Buffer.from(pdfBuffer);
    } catch (error) {
      if (browser) await browser.close();
      console.error('PDF Generation Error:', error);
      throw error;
    }
  }
}
