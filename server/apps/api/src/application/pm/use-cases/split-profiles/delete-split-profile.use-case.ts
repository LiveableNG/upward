import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  SPLIT_PROFILE_REPOSITORY,
  ISplitProfileRepository,
} from '../../../../domains/pm/ISplitProfileRepository';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';

@Injectable()
export class DeleteSplitProfileUseCase {
  constructor(
    @Inject(SPLIT_PROFILE_REPOSITORY)
    private readonly profileRepo: ISplitProfileRepository,
  ) {}

  async execute(
    uuid: string,
    pmId: number,
    actor?: PmActorContext,
  ): Promise<{ success: boolean }> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only administrators can delete settlement split profiles');
    }

    const profile = await this.profileRepo.findByUuid(uuid);
    if (!profile || profile.pmId !== pmId) {
      throw new NotFoundException('Split profile not found');
    }

    await this.profileRepo.delete(profile.id);
    return { success: true };
  }
}
