import { Inject, Injectable } from '@nestjs/common'
import {
  APP_VERSION_REPOSITORY,
  IAppVersionRepository,
  UpsertAppVersionPolicyData,
} from '../../../domains/app-version/app-version.repository'
import { AppVersionPolicy } from '../../../domains/app-version/app-version.entity'

@Injectable()
export class UpdateAppVersionPolicyUseCase {
  constructor(
    @Inject(APP_VERSION_REPOSITORY)
    private readonly versionRepo: IAppVersionRepository,
  ) {}

  async execute(dto: UpsertAppVersionPolicyData): Promise<AppVersionPolicy> {
    return this.versionRepo.upsertPolicy(dto)
  }
}
