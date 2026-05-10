import { Injectable, Inject } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../../domains/pm/IPropertyRepository';

@Injectable()
export class GetPmLandlordsUseCase {
  constructor(
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(pmId: number) {
    const properties = await this.propertyRepository.findByPmId(pmId);
    
    const landlordsMap = new Map<string, { name: string, email: string, phone: string }>();
    
    properties.forEach(prop => {
      if (prop.landlordEmail) {
        const email = prop.landlordEmail.toLowerCase().trim();
        if (!landlordsMap.has(email)) {
          landlordsMap.set(email, {
            name: prop.landlordName || '',
            email: prop.landlordEmail,
            phone: prop.landlordPhone || '',
          });
        }
      }
    });

    return Array.from(landlordsMap.values());
  }
}
