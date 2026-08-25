import { Injectable, InternalServerErrorException, NotFoundException, StreamableFile } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    csv: 'text/csv',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

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
      requestChecksumCalculation: 'WHEN_REQUIRED',
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

  async getFileBuffer(keyOrUrl: string): Promise<Buffer> {
    if (!keyOrUrl) throw new Error('Key or URL is required');
    const key = keyOrUrl.includes('amazonaws.com/') ? keyOrUrl.split('amazonaws.com/')[1] : keyOrUrl;
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      if (!response.Body) throw new Error('Response body is empty');
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (error: any) {
      console.error('Error reading buffer from S3:', error);
      if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey') {
        throw new NotFoundException('The requested document file could not be found in storage. It may have failed to generate or was deleted.');
      }
      throw new InternalServerErrorException('Could not read file from storage');
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
    }
  }

  async getFileContent(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const response = await this.s3Client.send(command)
      const content = await response.Body?.transformToString()
      return content || ''
    } catch (error) {
      console.error('Error reading file from S3:', error)
      throw new InternalServerErrorException('Could not read document from storage')
    }
  }

  async streamFile(
    keyOrUrl: string,
    res: any,
    options?: { filename?: string; isAttachment?: boolean; contentType?: string; cacheControl?: string }
  ): Promise<StreamableFile> {
    const buffer = await this.getFileBuffer(keyOrUrl)
    return S3Service.streamBuffer(buffer, options?.filename || keyOrUrl, res, options)
  }

  static streamBuffer(
    buffer: Buffer,
    filename: string,
    res: any,
    options?: { isAttachment?: boolean; contentType?: string; cacheControl?: string }
  ): StreamableFile {
    const contentType = options?.contentType || getMimeType(filename)
    const headers: Record<string, string | number> = {
      'Content-Type': contentType,
    }

    if (options?.cacheControl) {
      headers['Cache-Control'] = options.cacheControl
    }

    const disposition = options?.isAttachment ? 'attachment' : 'inline'
    const sanitized = encodeURIComponent(filename.split('/').pop() || 'file')
    headers['Content-Disposition'] = `${disposition}; filename="${sanitized}"`

    if (typeof res.set === 'function') {
      res.set(headers)
    } else if (typeof res.header === 'function') {
      for (const [key, value] of Object.entries(headers)) {
        res.header(key, value)
      }
    }

    return new StreamableFile(buffer)
  }

  async deleteObjectsWithPrefix(prefix: string): Promise<void> {
    try {
      const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3')

      let continuationToken: string | undefined
      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
        const listResponse = await this.s3Client.send(listCommand)

        if (listResponse.Contents && listResponse.Contents.length > 0) {
          const deleteKeys = listResponse.Contents
            .map((item) => item.Key)
            .filter((key): key is string => !!key)

          const deleteCommand = new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: {
              Objects: deleteKeys.map((key) => ({ Key: key })),
              Quiet: true,
            },
          })
          await this.s3Client.send(deleteCommand)
        }

        continuationToken = listResponse.NextContinuationToken
      } while (continuationToken)
    } catch (error) {
      console.error(`Error deleting objects with prefix ${prefix}:`, error)
    }
  }
}
