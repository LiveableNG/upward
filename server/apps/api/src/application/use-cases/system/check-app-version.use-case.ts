import { Inject, Injectable } from '@nestjs/common'
import {
  APP_VERSION_REPOSITORY,
  IAppVersionRepository,
} from '../../../domains/app-version/app-version.repository'
import {
  VersionCheckResult,
  VersionStatus,
} from '../../../domains/app-version/app-version.entity'
import { isVersionOlder } from '../../../shared/utils/semver'

export interface CheckAppVersionQuery {
  app?: string
  platform: string
  version?: string
  build?: number
}

const DEFAULT_STORE_URLS: Record<string, { native: string; web: string }> = {
  ios: {
    native: 'itms-apps://itunes.apple.com/app/id6807898152',
    web: 'https://apps.apple.com/us/app/upwardpay/id6807898152',
  },
  android: {
    native: 'market://details?id=com.goodtenants.upward',
    web: 'https://play.google.com/store/apps/details?id=com.goodtenants.upward&hl=en',
  },
}

@Injectable()
export class CheckAppVersionUseCase {
  constructor(
    @Inject(APP_VERSION_REPOSITORY)
    private readonly versionRepo: IAppVersionRepository,
  ) {}

  async execute(query: CheckAppVersionQuery): Promise<VersionCheckResult> {
    const app = (query.app || 'upward-pay').toLowerCase()
    const platform = (query.platform || 'android').toLowerCase()
    const currentVersion = query.version || '1.0.0'
    const currentBuild = Number(query.build || 1)

    let policy = await this.versionRepo.findByAppAndPlatform(app, platform)

    // Fallback defaults if no record exists in DB yet
    if (!policy) {
      policy = {
        id: 0,
        uuid: '',
        app,
        platform,
        minSupportedVersion: '1.0.0',
        latestVersion: '1.1.2',
        minBuildNumber: 1,
        latestBuildNumber: 11,
        forceUpdate: false,
        maintenanceMode: false,
        gatedFeatures: [],
        title: null,
        message: null,
        releaseNotes: null,
        storeUrl: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    const defaultUrls = DEFAULT_STORE_URLS[platform] ?? DEFAULT_STORE_URLS['android'] ?? {
      native: 'market://details?id=com.goodtenants.upward',
      web: 'https://play.google.com/store/apps/details?id=com.goodtenants.upward&hl=en',
    }
    const nativeStoreUrl = policy.storeUrl || defaultUrls.native
    const fallbackStoreUrl = defaultUrls.web

    let status: VersionStatus = 'UP_TO_DATE'

    if (policy.maintenanceMode) {
      status = 'HARD_UPDATE'
    } else if (policy.forceUpdate) {
      status = 'HARD_UPDATE'
    } else if (
      isVersionOlder(
        currentVersion,
        currentBuild,
        policy.minSupportedVersion,
        policy.minBuildNumber,
      )
    ) {
      status = 'HARD_UPDATE'
    } else if (
      isVersionOlder(
        currentVersion,
        currentBuild,
        policy.latestVersion,
        policy.latestBuildNumber,
      )
    ) {
      status = 'SOFT_UPDATE'
    } else if (policy.gatedFeatures && policy.gatedFeatures.length > 0) {
      status = 'FEATURE_GATED'
    }

    return {
      status,
      maintenance: policy.maintenanceMode,
      currentVersion,
      currentBuild,
      latestVersion: policy.latestVersion,
      latestBuild: policy.latestBuildNumber,
      minSupportedVersion: policy.minSupportedVersion,
      minBuildNumber: policy.minBuildNumber,
      forceUpdate: policy.forceUpdate,
      gatedFeatures: policy.gatedFeatures || [],
      policy: {
        title: policy.title,
        message: policy.message,
        releaseNotes: (policy.releaseNotes as string[]) || null,
        storeUrl: nativeStoreUrl,
        fallbackStoreUrl,
      },
    }
  }
}
