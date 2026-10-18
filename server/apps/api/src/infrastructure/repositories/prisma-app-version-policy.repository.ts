import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import {
  IAppVersionRepository,
  UpsertAppVersionPolicyData,
} from '../../domains/app-version/app-version.repository'
import { AppVersionPolicy } from '../../domains/app-version/app-version.entity'

@Injectable()
export class PrismaAppVersionPolicyRepository implements IAppVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAppAndPlatform(app: string, platform: string): Promise<AppVersionPolicy | null> {
    const record = await (this.prisma as any).upward_app_version_policy.findUnique({
      where: {
        app_platform: {
          app,
          platform,
        },
      },
    })

    if (!record) return null
    return this.mapToEntity(record)
  }

  async findAll(): Promise<AppVersionPolicy[]> {
    const records = await (this.prisma as any).upward_app_version_policy.findMany({
      orderBy: [{ app: 'asc' }, { platform: 'asc' }],
    })
    return records.map((r: any) => this.mapToEntity(r))
  }

  async upsertPolicy(data: UpsertAppVersionPolicyData): Promise<AppVersionPolicy> {
    const updateData: any = { ...data }
    delete updateData.app
    delete updateData.platform

    const record = await (this.prisma as any).upward_app_version_policy.upsert({
      where: {
        app_platform: {
          app: data.app,
          platform: data.platform,
        },
      },
      create: {
        app: data.app,
        platform: data.platform,
        minSupportedVersion: data.minSupportedVersion ?? '1.0.0',
        latestVersion: data.latestVersion ?? '1.0.0',
        minBuildNumber: data.minBuildNumber ?? 1,
        latestBuildNumber: data.latestBuildNumber ?? 1,
        forceUpdate: data.forceUpdate ?? false,
        maintenanceMode: data.maintenanceMode ?? false,
        gatedFeatures: data.gatedFeatures ?? [],
        title: data.title ?? null,
        message: data.message ?? null,
        releaseNotes: data.releaseNotes ?? null,
        storeUrl: data.storeUrl ?? null,
        isActive: data.isActive ?? true,
      },
      update: updateData,
    })

    return this.mapToEntity(record)
  }

  private mapToEntity(record: any): AppVersionPolicy {
    return new AppVersionPolicy({
      id: record.id,
      uuid: record.uuid,
      app: record.app,
      platform: record.platform,
      minSupportedVersion: record.minSupportedVersion,
      latestVersion: record.latestVersion,
      minBuildNumber: record.minBuildNumber,
      latestBuildNumber: record.latestBuildNumber,
      forceUpdate: record.forceUpdate,
      maintenanceMode: record.maintenanceMode,
      gatedFeatures: record.gatedFeatures || [],
      title: record.title,
      message: record.message,
      releaseNotes: record.releaseNotes,
      storeUrl: record.storeUrl,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  }
}
