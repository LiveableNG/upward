import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class DeleteUnitUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
  ) {}

  async execute(pmId: number, uuid: string) {
    const units = await this.unitRepository.findByPmId(pmId);
    const unit = units.find(u => u.uuid === uuid);
    
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return this.unitRepository.delete(uuid);
  }
}
