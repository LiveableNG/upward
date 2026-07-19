import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { randomUUID } from 'crypto'

@Injectable()
export class GetAvatarUploadUrlUseCase {
  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, contentType: string, filename: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed for avatars')
    }

    const ext = filename.split('.').pop()
    const fileId = randomUUID()
    const key = `users/${user.uuid}/avatar/${fileId}.${ext}`

    const uploadUrl = await this.s3Service.getUploadUrl(key, contentType)

    const baseUrl = this.configService.get<string>('API_URL') || 
                    this.configService.get<string>('BACKEND_URL') || 
                    'http://localhost:4000';

    return {
      key,
      uploadUrl,
      // The public URL that will be stored in the DB after upload
      publicUrl: `${baseUrl}/api/v1/public/documents/users/avatar/${user.uuid}/${fileId}.${ext}`
    }
  }
}
