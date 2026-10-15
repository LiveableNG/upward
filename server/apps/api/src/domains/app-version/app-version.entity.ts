export class AppVersionPolicy {
  id!: number
  uuid!: string
  app!: string
  platform!: string
  minSupportedVersion!: string
  latestVersion!: string
  minBuildNumber!: number
  latestBuildNumber!: number
  forceUpdate!: boolean
  maintenanceMode!: boolean
  gatedFeatures!: string[]
  title!: string | null
  message!: string | null
  releaseNotes!: string[] | null
  storeUrl!: string | null
  isActive!: boolean
  createdAt!: Date
  updatedAt!: Date

  constructor(partial: Partial<AppVersionPolicy>) {
    Object.assign(this, partial)
  }
}

export type VersionStatus = 'HARD_UPDATE' | 'SOFT_UPDATE' | 'FEATURE_GATED' | 'UP_TO_DATE'

export interface VersionCheckResult {
  status: VersionStatus
  maintenance: boolean
  currentVersion: string
  currentBuild: number
  latestVersion: string
  latestBuild: number
  minSupportedVersion: string
  minBuildNumber: number
  forceUpdate: boolean
  gatedFeatures: string[]
  policy: {
    title: string | null
    message: string | null
    releaseNotes: string[] | null
    storeUrl: string
    fallbackStoreUrl: string
  }
}
