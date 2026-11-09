import { Inject, Injectable } from '@nestjs/common'
import {
  APP_VERSION_REPOSITORY,
  IAppVersionRepository,
} from '../../../domains/app-version/app-version.repository'
import { AppVersionPolicy } from '../../../domains/app-version/app-version.entity'

@Injectable()
export class GetAppVersionPoliciesUseCase {
  constructor(
    @Inject(APP_VERSION_REPOSITORY)
    private readonly versionRepo: IAppVersionRepository,
  ) {}

  async execute(): Promise<AppVersionPolicy[]> {
    let policies = await this.versionRepo.findAll()

    // Ensure default rows exist for both ios and android for upward-pay
    const platforms = ['ios', 'android']
    for (const platform of platforms) {
      const exists = policies.find(
        (p) => p.app === 'upward-pay' && p.platform === platform,
      )
      if (!exists) {
        const seeded = await this.versionRepo.upsertPolicy({
          app: 'upward-pay',
          platform,
          minSupportedVersion: '1.0.0',
          latestVersion: platform === 'android' ? '1.1.2' : '1.1.2',
          minBuildNumber: 1,
          latestBuildNumber: platform === 'android' ? 11 : 1,
          forceUpdate: false,
          maintenanceMode: false,
          gatedFeatures: [],
          title: platform === 'ios' ? 'New iOS Version Available' : 'New Android Version Available',
          message: 'Update your Upward Pay app to access the latest features and performance enhancements.',
          releaseNotes: [
            'Faster one-tap card checkout',
            'Instant rent receipt generation and sharing',
            'Enhanced security and reliability updates',
          ],
          storeUrl:
            platform === 'ios'
              ? 'itms-apps://itunes.apple.com/app/id6807898152'
              : 'market://details?id=com.goodtenants.upward',
          isActive: true,
        })
        policies.push(seeded)
      }
    }

    return policies
  }
}
