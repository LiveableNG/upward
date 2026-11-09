import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import {
  APP_VERSION_REPOSITORY,
  IAppVersionRepository,
} from '../../../domains/app-version/app-version.repository'
import { AppVersionPolicy } from '../../../domains/app-version/app-version.entity'
import { isVersionOlder } from '../../utils/semver'

const HTTP_STATUS_UPGRADE_REQUIRED = 426

interface CachedPolicies {
  timestamp: number
  policies: Record<string, AppVersionPolicy>
}

@Injectable()
export class VersionEnforcementInterceptor implements NestInterceptor {
  private cache: CachedPolicies | null = null
  private readonly CACHE_TTL_MS = 60 * 1000 // 60 seconds memory cache

  constructor(
    @Inject(APP_VERSION_REPOSITORY)
    private readonly versionRepo: IAppVersionRepository,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest()
    const url = req.url || ''

    // Ignore public endpoints, admin endpoints, and telemetry
    if (
      url.startsWith('/admin') ||
      url.includes('/admin/') ||
      url.startsWith('/public/app/version-policy') ||
      url.includes('/activity-tracking')
    ) {
      return next.handle()
    }

    const platformHeader = (req.headers['x-client-platform'] || '').toLowerCase()
    const versionHeader = (req.headers['x-app-version'] || '').trim()
    const buildHeader = req.headers['x-app-build'] ? parseInt(req.headers['x-app-build'], 10) : 1

    // If client is not native mobile or did not send version header, pass through
    if (!['ios', 'android'].includes(platformHeader) || !versionHeader) {
      return next.handle()
    }

    const policies = await this.getCachedPolicies()
    const policy = policies[`upward-pay:${platformHeader}`]

    if (!policy || !policy.isActive) {
      return next.handle()
    }

    // 1. Emergency Maintenance Check
    if (policy.maintenanceMode) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          message: 'Upward systems are currently undergoing scheduled maintenance. Please check back shortly.',
          data: {
            type: 'MAINTENANCE',
            title: policy.title || 'System Maintenance',
            message: policy.message || 'We are performing scheduled updates to improve our service.',
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }

    // 2. Hard Deprecation / Force Update Check
    const isHardBlocked =
      policy.forceUpdate ||
      isVersionOlder(
        versionHeader,
        buildHeader,
        policy.minSupportedVersion,
        policy.minBuildNumber,
      )

    if (isHardBlocked) {
      const storeUrl =
        policy.storeUrl ||
        (platformHeader === 'ios'
          ? 'itms-apps://itunes.apple.com/app/id6807898152'
          : 'market://details?id=com.goodtenants.upward')

      throw new HttpException(
        {
          statusCode: HTTP_STATUS_UPGRADE_REQUIRED,
          error: 'Upgrade Required',
          message: 'Your app version is no longer supported. Please update to continue using Upward Pay.',
          data: {
            type: 'FORCE_UPDATE',
            currentVersion: versionHeader,
            minSupportedVersion: policy.minSupportedVersion,
            latestVersion: policy.latestVersion,
            title: policy.title || 'Update Required',
            message: policy.message || 'A required update is available to keep your account safe and up to date.',
            releaseNotes: policy.releaseNotes,
            storeUrl,
          },
        },
        HTTP_STATUS_UPGRADE_REQUIRED,
      )
    }

    // 3. Feature-Level Gate Check
    if (policy.gatedFeatures && policy.gatedFeatures.length > 0) {
      const isPaymentMutation =
        (url.includes('/payments') || url.includes('/checkout') || url.includes('/wallet')) &&
        ['POST', 'PUT', 'PATCH'].includes(req.method)

      const isFeatureGated =
        (policy.gatedFeatures.includes('PAYMENTS') && isPaymentMutation) ||
        (policy.gatedFeatures.includes('WALLET_DEPOSIT') && url.includes('/deposit'))

      if (isFeatureGated) {
        const isOlderThanLatest = isVersionOlder(
          versionHeader,
          buildHeader,
          policy.latestVersion,
          policy.latestBuildNumber,
        )

        if (isOlderThanLatest) {
          const storeUrl =
            policy.storeUrl ||
            (platformHeader === 'ios'
              ? 'itms-apps://itunes.apple.com/app/id6807898152'
              : 'market://details?id=com.goodtenants.upward')

          throw new HttpException(
            {
              statusCode: HTTP_STATUS_UPGRADE_REQUIRED,
              error: 'Upgrade Required',
              message: 'This feature requires the latest version of Upward Pay.',
              data: {
                type: 'FEATURE_GATED',
                feature: isPaymentMutation ? 'PAYMENTS' : 'WALLET_DEPOSIT',
                currentVersion: versionHeader,
                latestVersion: policy.latestVersion,
                title: 'Feature Update Required',
                message: 'To complete payments securely, please update your Upward Pay app.',
                storeUrl,
              },
            },
            HTTP_STATUS_UPGRADE_REQUIRED,
          )
        }
      }
    }

    return next.handle()
  }

  private async getCachedPolicies(): Promise<Record<string, AppVersionPolicy>> {
    const now = Date.now()
    if (this.cache && now - this.cache.timestamp < this.CACHE_TTL_MS) {
      return this.cache.policies
    }

    try {
      const all = await this.versionRepo.findAll()
      const map: Record<string, AppVersionPolicy> = {}
      for (const p of all) {
        map[`${p.app}:${p.platform}`] = p
      }
      this.cache = { timestamp: now, policies: map }
      return map
    } catch {
      return this.cache ? this.cache.policies : {}
    }
  }
}
