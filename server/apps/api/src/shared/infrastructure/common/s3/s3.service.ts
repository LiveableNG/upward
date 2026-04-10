import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

@Injectable()
export class S3Service {
  private s3Client: S3Client
  private bucket: string

  constructor(private configService: ConfigService) {
    const region = this.configService.getOrThrow<string>('AWS_REGION')
    const accessKeyId = this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID')
    const secretAccessKey = this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY')
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET')

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async getUploadUrl(key: string, contentType: string) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      })

      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }) // 1 hour
      return url
    } catch (error) {
      console.error('Error generating upload URL:', error)
      throw new InternalServerErrorException('Could not generate upload URL')
    }
  }

  async getDownloadUrl(keyOrUrl: string) {
    if (!keyOrUrl) return keyOrUrl

    const key = keyOrUrl.includes('amazonaws.com/') ? keyOrUrl.split('amazonaws.com/')[1] : keyOrUrl

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }) // 1 hour
    } catch {
      return keyOrUrl // Fallback to original if failed
    }
  }

  async uploadBuffer(buffer: Buffer, key: string, contentType: string) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })

      await this.s3Client.send(command)
      return `https://${this.bucket}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`
    } catch (error) {
      console.error('Error uploading buffer to S3:', error)
      throw new InternalServerErrorException('Could not upload file to storage')
    }
  }

  async deleteObject(keyOrUrl: string) {
    if (!keyOrUrl) return

    const key = keyOrUrl.includes('amazonaws.com/') ? keyOrUrl.split('amazonaws.com/')[1] : keyOrUrl

    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      await this.s3Client.send(command)
    } catch (error) {
      console.error('Error deleting object from S3:', error)
      // We don't throw here to avoid failing the DB delete if S3 delete fails for some reason
      // but ideally we should have a cleanup job.
    }
  }
}
