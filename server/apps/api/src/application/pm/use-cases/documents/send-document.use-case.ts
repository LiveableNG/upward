
import { Inject, Injectable } from '@nestjs/common';
import { 
  PM_DOCUMENT_REPOSITORY, IPmDocumentRepository,
  PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity,
  PM_UNIT_REPOSITORY, IUnitRepository, UnitEntity
} from '../../../../domains/pm/IPropertyRepository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';

export interface SendDocumentDto {
  tenantUuid?: string;
  unitUuid?: string;
  subject: string;
  content: string;
  documentType: string;
  recipientName: string;
  recipientEmail: string;
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
        // If tenant is linked to units, take the first one for context
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

    // Helper to format dates professionally
    const formatDate = (date: Date | null | undefined) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    };

    // Calculate Rent End Date (usually 1 year - 1 day after start if not specified)
    const calculateEndDate = (startDate: Date | null | undefined) => {
      if (!startDate) return 'N/A';
      const end = new Date(startDate);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      return formatDate(end);
    };

    // 2. Perform Placeholder Replacement
    const placeholders: Record<string, string> = {
      // Tenant Info
      '[Tenant Name]': tenant ? `${tenant.firstName} ${tenant.lastName}` : data.recipientName,
      '[TenantFirstName]': tenant?.firstName || data.recipientName.split(' ')[0] || '',
      '[TenantLastName]': tenant?.lastName || data.recipientName.split(' ').slice(1).join(' ') || '',
      '[TenantPhone]': tenant?.phone || 'N/A',
      
      // Property/Unit Info
      '[UnitName]': unit ? unit.unitName : 'N/A',
      '[Unit Name]': unit ? unit.unitName : 'N/A',
      '[RentAmount]': unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : 'N/A',
      '[Rent Amount]': unit ? `${unit.currency || '₦'}${unit.rentAmount.toLocaleString()}` : 'N/A',
      '[PropertyName]': unit?.property ? unit.property.name : 'N/A',
      '[Property Name]': unit?.property ? unit.property.name : 'N/A',
      
      // Dates
      '[RentStartDate]': formatDate(unit?.rentStartDate),
      '[RentEndDate]': calculateEndDate(unit?.rentStartDate),
      '[Date]': formatDate(new Date()),
      
      // Manager Info
      '[ManagerName]': pm ? `${pm.firstName} ${pm.lastName}` : 'The Property Manager',
    };

    // Replace all occurrences
    Object.entries(placeholders).forEach(([tag, value]) => {
      content = content.split(tag).join(value);
    });

    return this.documentRepo.saveSentDocument({
      pmId,
      tenantId,
      unitId,
      subject: data.subject,
      content,
      documentType: data.documentType,
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      status: 'SENT',
    });
  }
}
