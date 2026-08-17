import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import {
  PROPERTY_REPOSITORY,
  PropertyRepository,
} from '../../../domains/companies/property.repository'
import { GoodTenantTenantAppClient } from '../../../shared/infrastructure/goodtenant/goodtenant-tenant-app.client'

@Injectable()
export class ProxyTenantAppReadUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    private readonly gtClient: GoodTenantTenantAppClient,
  ) {}

  private async resolveExternalUnitId(
    userUuid: string,
    propertyUuid: string,
  ): Promise<string> {
    if (!propertyUuid) {
      throw new BadRequestException('propertyUuid is required')
    }

    const user = await this.userRepository.findByUuid(userUuid)
    if (!user?.id) {
      throw new NotFoundException('User not found')
    }

    const property = await this.propertyRepository.findByUuid(propertyUuid)
    if (!property || property.userId !== user.id) {
      throw new NotFoundException('Property not found')
    }

    if (property.isPastTenancy) {
      throw new NotFoundException('This home is not an active tenancy')
    }

    if (!property.externalUnitId) {
      throw new NotFoundException('This home is not linked to your building yet')
    }

    return property.externalUnitId
  }

  /**
   * Resolve propertyUuid → externalUnitId, then forward the read to GT.
   */
  async execute(
    userUuid: string,
    propertyUuid: string,
    path: string,
    query: Record<string, string | undefined | null> = {},
  ): Promise<unknown> {
    const externalUnitId = await this.resolveExternalUnitId(userUuid, propertyUuid)
    const { propertyUuid: _ignored, ...forwardQuery } = query

    return this.gtClient.get(path, {
      ...forwardQuery,
      externalUnitId,
    })
  }

  /**
   * Resolve propertyUuid → externalUnitId, then forward the write to GT.
   */
  async executeWrite(
    userUuid: string,
    propertyUuid: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const externalUnitId = await this.resolveExternalUnitId(userUuid, propertyUuid)

    return this.gtClient.post(path, body, { externalUnitId })
  }

  async executeUpload(
    userUuid: string,
    propertyUuid: string,
    file: {
      buffer: Buffer
      filename: string
      mimeType: string
      fileType: string
      caption: string
    },
  ): Promise<unknown> {
    const externalUnitId = await this.resolveExternalUnitId(userUuid, propertyUuid)
    const form = new FormData()
    form.append('file_type', file.fileType)
    form.append('caption', file.caption)
    form.append(
      'file',
      new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }),
      file.filename,
    )

    return this.gtClient.postMultipart('files', form, { externalUnitId })
  }

  async executeDelete(
    userUuid: string,
    propertyUuid: string,
    path: string,
  ): Promise<unknown> {
    const externalUnitId = await this.resolveExternalUnitId(userUuid, propertyUuid)

    return this.gtClient.delete(path, { externalUnitId })
  }

  async executePatch(
    userUuid: string,
    propertyUuid: string,
    path: string,
  ): Promise<unknown> {
    const externalUnitId = await this.resolveExternalUnitId(userUuid, propertyUuid)

    return this.gtClient.patch(path, { externalUnitId })
  }
}
