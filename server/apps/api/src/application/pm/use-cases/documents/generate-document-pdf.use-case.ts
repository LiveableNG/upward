import { Inject, Injectable } from '@nestjs/common';
import { 
  PM_TENANT_REPOSITORY, ITenantRepository, 
  PM_UNIT_REPOSITORY, IUnitRepository 
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';

@Injectable()
export class GenerateDocumentPdfUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    @Inject(PM_UNIT_REPOSITORY) private readonly unitRepo: IUnitRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepo: PropertyManagerRepository,
  ) {}

  async execute(params: { 
    content: string; 
    pmId: number;
    tenantUuid?: string; 
    unitUuid?: string;
    recipientName?: string;
  }): Promise<Buffer> {
    const { content: rawContent, pmId, tenantUuid, unitUuid, recipientName } = params;
    let content = rawContent;

    // 1. Fetch Context for Replacement
    const pm = await this.pmRepo.findById(pmId);
    const tenant = tenantUuid ? await this.tenantRepo.findByUuid(tenantUuid) : null;
    const unit = unitUuid ? await this.unitRepo.findByUuid(unitUuid) : (tenant?.units?.[0] || null);

    const formatDate = (date: Date | null | undefined) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const calculateEndDate = (startDate: Date | null | undefined) => {
      if (!startDate) return 'N/A';
      const end = new Date(startDate);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return formatDate(end);
    };

    const placeholders: Record<string, string> = {
      '[Tenant Name]': tenant ? `${tenant.firstName} ${tenant.lastName}` : (recipientName || 'Prospective Tenant'),
      '[TenantFirstName]': tenant?.firstName || recipientName?.split(' ')[0] || '',
      '[TenantLastName]': tenant?.lastName || recipientName?.split(' ').slice(1).join(' ') || '',
      '[TenantPhone]': tenant?.phone || 'N/A',
      '[UnitName]': unit ? unit.unitName : 'N/A',
      '[Unit Name]': unit ? unit.unitName : 'N/A',
      '[RentAmount]': unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : 'N/A',
      '[Rent Amount]': unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : 'N/A',
      '[PropertyName]': unit?.property ? unit.property.name : 'N/A',
      '[Property Name]': unit?.property ? unit.property.name : 'N/A',
      '[RentStartDate]': formatDate(unit?.rentStartDate),
      '[RentEndDate]': calculateEndDate(unit?.rentStartDate),
      '[Date]': formatDate(new Date()),
      '[CurrentDate]': formatDate(new Date()),
      '[ManagerName]': pm ? `${pm.firstName} ${pm.lastName}` : 'The Property Manager',
    };

    Object.entries(placeholders).forEach(([tag, value]) => {
      content = content.split(tag).join(value);
    });

    const htmlToPdf = require('html-pdf-node');
    const options = { 
      format: 'A4', 
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
      printBackground: true
    };
    const file = { content };
    
    return await htmlToPdf.generatePdf(file, options);
  }
}
