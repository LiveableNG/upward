import { Inject, Injectable } from '@nestjs/common';
import {
  SPLIT_PROFILE_REPOSITORY,
  ISplitProfileRepository,
  SplitProfileEntity,
} from '../../../../domains/pm/ISplitProfileRepository';
import { PmActorContext } from '../../../../domains/pm/types/pm-actor-context';

@Injectable()
export class GetSplitProfilesUseCase {
  constructor(
    @Inject(SPLIT_PROFILE_REPOSITORY)
    private readonly profileRepo: ISplitProfileRepository,
  ) {}

  async execute(pmId: number, actor?: PmActorContext): Promise<SplitProfileEntity[]> {
    return this.profileRepo.findByPmId(pmId);
  }
}
