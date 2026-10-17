import { AppVersionPolicy } from './app-version.entity'

export const APP_VERSION_REPOSITORY = Symbol('APP_VERSION_REPOSITORY')

export interface UpsertAppVersionPolicyData {
  app: string
  platform: string
  minSupportedVersion?: string
  latestVersion?: string
  minBuildNumber?: number
  latestBuildNumber?: number
  forceUpdate?: boolean
  maintenanceMode?: boolean
  gatedFeatures?: string[]
  title?: string | null
  message?: string | null
  releaseNotes?: string[] | null
  storeUrl?: string | null
  isActive?: boolean
}

export interface IAppVersionRepository {
  findByAppAndPlatform(app: string, platform: string): Promise<AppVersionPolicy | null>
  findAll(): Promise<AppVersionPolicy[]>
  upsertPolicy(data: UpsertAppVersionPolicyData): Promise<AppVersionPolicy>
}
