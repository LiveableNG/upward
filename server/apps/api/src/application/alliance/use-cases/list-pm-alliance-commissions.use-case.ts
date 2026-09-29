import {
  Inject,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import {
  ALLIANCE_PROFILE_REPOSITORY,
  ALLIANCE_COMMISSION_REPOSITORY,
  IAllianceProfileRepository,
  IAllianceCommissionRepository,
} from '../../../domains/alliance/alliance.repository.interface';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { ListAllianceCommissionsQueryDto } from '../dtos/alliance-commission.dto';

@Injectable()
export class ListPmAllianceCommissionsUseCase {
  constructor(
    @Inject(ALLIANCE_PROFILE_REPOSITORY)
    private readonly profileRepo: IAllianceProfileRepository,
    @Inject(ALLIANCE_COMMISSION_REPOSITORY)
    private readonly commissionRepo: IAllianceCommissionRepository,
  ) {}

  async execute(dto: ListAllianceCommissionsQueryDto, actor: PmActorContext) {
    const pmId = actor.ownerPmId;

    // 1. Verify PM is enabled for Alliance
    const profile = await this.profileRepo.findByPmId(pmId);
    if (!profile || !profile.isEnabled) {
      throw new ForbiddenException('Property manager is not enabled for Upward Alliance');
    }

    const page = Math.max(1, Number(dto.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(dto.limit) || 20));
    const skip = (page - 1) * limit;

    // 2. Query commissions strictly owned by this referring PM
    const [{ items, total }, stats] = await Promise.all([
      this.commissionRepo.listByReferringPm(pmId, {
        status: dto.status,
        listingUuid: dto.listingUuid,
        search: dto.search?.trim(),
        skip,
        take: limit,
      }),
      this.commissionRepo.getPmCommissionStats(pmId),
    ]);

    return {
      items,
      stats,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
