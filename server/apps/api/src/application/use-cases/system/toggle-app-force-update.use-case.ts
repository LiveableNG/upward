import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import {
  APP_VERSION_REPOSITORY,
  IAppVersionRepository,
} from '../../../domains/app-version/app-version.repository'
import { AppVersionPolicy } from '../../../domains/app-version/app-version.entity'

export interface ToggleAppForceUpdateDto {
  app: string
  platform: string
  forceUpdate?: boolean
  maintenanceMode?: boolean
}

@Injectable()
export class ToggleAppForceUpdateUseCase {
  constructor(
    @Inject(APP_VERSION_REPOSITORY)
    private readonly versionRepo: IAppVersionRepository,
  ) {}

  async execute(dto: ToggleAppForceUpdateDto): Promise<AppVersionPolicy> {
    const existing = await this.versionRepo.findByAppAndPlatform(dto.app, dto.platform)
    if (!existing) {
      throw new NotFoundException(
        `Policy for app ${dto.app} and platform ${dto.platform} not found`,
      )
    }

    const updated = await this.versionRepo.upsertPolicy({
      app: dto.app,
      platform: dto.platform,
      forceUpdate: dto.forceUpdate !== undefined ? dto.forceUpdate : existing.forceUpdate,
      maintenanceMode:
        dto.maintenanceMode !== undefined ? dto.maintenanceMode : existing.maintenanceMode,
    })

    return updated
  }
}
