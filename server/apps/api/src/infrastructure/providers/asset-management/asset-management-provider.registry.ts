import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IAssetManagementProvider } from '../../../domains/rent-savings/asset-management.provider'
import { ArmConnectInvestmentProvider } from './arm-connect-investment.provider'
import { MockInvestmentProvider } from './mock-investment.provider'

@Injectable()
export class AssetManagementProviderRegistry {
  private readonly logger = new Logger(AssetManagementProviderRegistry.name)
  private readonly providers = new Map<string, IAssetManagementProvider>()
  private readonly defaultProviderName: string

  constructor(
    private readonly configService: ConfigService,
    private readonly armProvider: ArmConnectInvestmentProvider,
    private readonly mockProvider: MockInvestmentProvider,
  ) {
    this.registerProvider(this.armProvider)
    this.registerProvider(this.mockProvider)

    this.defaultProviderName = (
      this.configService.get<string>('ACTIVE_INVESTMENT_PROVIDER') || 'ARM'
    ).toUpperCase()
    this.logger.log(
      `AssetManagementProviderRegistry initialized. Default provider: ${this.defaultProviderName}`,
    )
  }

  public registerProvider(provider: IAssetManagementProvider): void {
    this.providers.set(provider.providerName.toUpperCase(), provider)
  }

  public getProvider(providerName?: string): IAssetManagementProvider {
    const key = (providerName || this.defaultProviderName).toUpperCase()
    const provider = this.providers.get(key)
    if (!provider) {
      this.logger.warn(
        `Provider '${key}' not found, falling back to default '${this.defaultProviderName}'`,
      )
      return this.providers.get(this.defaultProviderName) || this.mockProvider
    }
    return provider
  }
}
