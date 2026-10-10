import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  SPLIT_PROFILE_REPOSITORY,
  ISplitProfileRepository,
  SplitProfileEntity,
} from '../../../../domains/pm/ISplitProfileRepository';
import {
  SETTLEMENT_ACCOUNT_REPOSITORY,
  ISettlementAccountRepository,
} from '../../../../domains/pm/ISettlementAccountRepository';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';
import { UpdateSplitProfileDto } from './dtos/split-profile.dto';

@Injectable()
export class UpdateSplitProfileUseCase {
  constructor(
    @Inject(SPLIT_PROFILE_REPOSITORY)
    private readonly profileRepo: ISplitProfileRepository,
    @Inject(SETTLEMENT_ACCOUNT_REPOSITORY)
    private readonly accountRepo: ISettlementAccountRepository,
  ) {}

  async execute(
    uuid: string,
    pmId: number,
    dto: UpdateSplitProfileDto,
    actor?: PmActorContext,
  ): Promise<SplitProfileEntity> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only administrators can edit settlement split profiles');
    }

    const profile = await this.profileRepo.findByUuid(uuid);
    if (!profile || profile.pmId !== pmId) {
      throw new NotFoundException('Split profile not found');
    }

    let mappedItems: Array<{ manualAccountId: number; percentage: number; lineItemName?: string }> | undefined;

    if (dto.items) {
      if (dto.items.length === 0) {
        throw new BadRequestException('At least one settlement account split item is required');
      }

      // 1. Validate Rent total percentage equals 100%
      const rentItems = dto.items.filter(
        (it) => !it.lineItemName || it.lineItemName.toLowerCase().trim() === 'rent',
      );

      if (rentItems.length === 0) {
        throw new BadRequestException('A split profile must specify distribution for the Rent line item');
      }

      const totalRentPercentage = rentItems.reduce(
        (sum, it) => sum + Number(it.percentage || 0),
        0,
      );

      if (Math.abs(totalRentPercentage - 100) > 0.05) {
        throw new BadRequestException(
          `Total split percentage for Rent must equal exactly 100%. Current sum: ${totalRentPercentage.toFixed(1)}%`,
        );
      }

      // 2. Validate all settlement accounts exist and belong to this PM
      const accountUuids = Array.from(new Set(dto.items.map((it) => it.manualAccountUuid)));
      const pmAccounts = await this.accountRepo.findByPmId(pmId);
      const pmAccountMap = new Map<string, number>();

      for (const acc of pmAccounts) {
        pmAccountMap.set(acc.uuid, acc.id);
      }

      for (const u of accountUuids) {
        if (!pmAccountMap.has(u)) {
          throw new BadRequestException(`Settlement account with UUID ${u} does not belong to your organization`);
        }
      }

      mappedItems = dto.items.map((it) => ({
        manualAccountId: pmAccountMap.get(it.manualAccountUuid)!,
        percentage: Number(it.percentage),
        lineItemName: it.lineItemName?.trim() || 'Rent',
      }));
    }

    return this.profileRepo.update(profile.id, {
      name: dto.name?.trim(),
      description: dto.description?.trim(),
      isDefault: dto.isDefault,
      items: mappedItems,
    });
  }
}
