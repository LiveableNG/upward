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
import { AttachSplitProfileDto } from './dtos/split-profile.dto';

@Injectable()
export class AttachSplitProfileUseCase {
  constructor(
    @Inject(SPLIT_PROFILE_REPOSITORY)
    private readonly profileRepo: ISplitProfileRepository,
  ) {}

  async execute(
    profileUuid: string,
    pmId: number,
    dto: AttachSplitProfileDto,
    actor?: PmActorContext,
  ): Promise<{ success: boolean }> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only administrators can attach split profiles to properties');
    }

    const profile = await this.profileRepo.findByUuid(profileUuid);
    if (!profile || profile.pmId !== pmId) {
      throw new NotFoundException('Split profile not found');
    }

    await this.profileRepo.attachToProperties(profile.id, pmId, dto.propertyUuids);
    return { success: true };
  }

  async detachProperty(
    propertyUuid: string,
    pmId: number,
    actor?: PmActorContext,
  ): Promise<{ success: boolean }> {
    if (actor?.isEmployee) {
      throw new ForbiddenException('Only administrators can detach split profiles from properties');
    }

    await this.profileRepo.detachProperty(propertyUuid, pmId);
    return { success: true };
  }
}
