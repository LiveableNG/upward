import { Controller, Get, Param, Res } from '@nestjs/common'
import { GetPublicBlogPostBySlugUseCase, GetPublicBlogPostsUseCase } from '../../../application/use-cases/blog/blog-post.use-cases'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { Response } from 'express' // Using fastify/express generic

@Controller('public/blog')
export class PublicBlogController {
  constructor(
    private readonly getPublicBlogPostsUseCase: GetPublicBlogPostsUseCase,
    private readonly getPublicBlogPostBySlugUseCase: GetPublicBlogPostBySlugUseCase,
    private readonly s3Service: S3Service,
  ) {}

  @Get('posts')
  async getPosts() {
    return { data: await this.getPublicBlogPostsUseCase.execute() }
  }

  @Get('posts/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return { data: await this.getPublicBlogPostBySlugUseCase.execute(slug) }
  }

  @Get('images/:filename')
  async getBlogImage(@Param('filename') filename: string, @Res() res: any) {
    const buffer = await this.s3Service.getFileBuffer(`blog/images/${filename}`);
    
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif'
    };
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

    // Support both Express and Fastify response objects
    if (typeof res.set === 'function') {
      res.set('Content-Type', contentType);
      res.send(buffer);
    } else {
      res.header('Content-Type', contentType);
      res.send(buffer);
    }
  }
}
