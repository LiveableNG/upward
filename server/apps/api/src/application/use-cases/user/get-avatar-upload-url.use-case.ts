import { Injectable, BadRequestException, Inject } from '@nestjs/common'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { randomUUID } from 'crypto'

@Injectable()
export class GetAvatarUploadUrlUseCase {
  constructor(
    private readonly s3Service: S3Service,
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
    const key = `users/${user.uuid}/avatar/${randomUUID()}.${ext}`

    const uploadUrl = await this.s3Service.getUploadUrl(key, contentType)

    return {
      key,
      uploadUrl,
      // The public URL that will be stored in the DB after upload
      publicUrl: `https://${process.env['AWS_S3_BUCKET']}.s3.${process.env['AWS_REGION']}.amazonaws.com/${key}`
    }
  }
}
