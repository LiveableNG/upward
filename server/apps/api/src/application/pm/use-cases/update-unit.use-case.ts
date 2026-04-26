import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class UpdateUnitUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
  ) {}

  async execute(pmId: number, uuid: string, data: any) {
    const units = await this.unitRepository.findByPmId(pmId);
    const unit = units.find(u => u.uuid === uuid);
    
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return this.unitRepository.update(uuid, data);
  }
}
