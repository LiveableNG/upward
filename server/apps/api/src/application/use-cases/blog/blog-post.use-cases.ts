import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { CreateBlogPostDto, UpdateBlogPostDto } from '../../../interfaces/http/dto/blog-post.dto'

const PUBLISHED_STATUS = 'PUBLISHED'
const DRAFT_STATUS = 'DRAFT'

function normalizeSlug(slug: string): string {
  return slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

@Injectable()
export class GetAdminBlogPostsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.upward_blog_post.findMany({
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    })
  }
}

@Injectable()
export class GetPublicBlogPostsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.upward_blog_post.findMany({
      where: { status: PUBLISHED_STATUS },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    })
  }
}

@Injectable()
export class GetPublicBlogPostBySlugUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(slug: string) {
    const normalizedSlug = normalizeSlug(slug)
    const post = await this.prisma.upward_blog_post.findFirst({
      where: {
        slug: normalizedSlug,
        status: PUBLISHED_STATUS,
      },
    })

    if (!post) {
      throw new NotFoundException('Blog post not found')
    }

    return post
  }
}

@Injectable()
export class CreateBlogPostUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(dto: CreateBlogPostDto) {
    const slug = normalizeSlug(dto.slug)
    if (!slug) {
      throw new BadRequestException('Slug is required')
    }

    const existing = await this.prisma.upward_blog_post.findUnique({ where: { slug } })
    if (existing) {
      throw new BadRequestException('Slug is already in use')
    }

    return this.prisma.upward_blog_post.create({
      data: {
        title: dto.title.trim(),
        slug,
        excerpt: dto.excerpt.trim(),
        contentHtml: dto.contentHtml,
        coverImageUrl: dto.coverImageUrl?.trim() || null,
        authorName: dto.authorName.trim(),
        status: DRAFT_STATUS,
      },
    })
  }
}

@Injectable()
export class UpdateBlogPostUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(uuid: string, dto: UpdateBlogPostDto) {
    const existing = await this.prisma.upward_blog_post.findUnique({ where: { uuid } })
    if (!existing) {
      throw new NotFoundException('Blog post not found')
    }

    const nextSlug = dto.slug ? normalizeSlug(dto.slug) : undefined
    if (dto.slug && !nextSlug) {
      throw new BadRequestException('Slug is required')
    }

    if (nextSlug && nextSlug !== existing.slug) {
      const slugOwner = await this.prisma.upward_blog_post.findUnique({ where: { slug: nextSlug } })
      if (slugOwner && slugOwner.uuid !== uuid) {
        throw new BadRequestException('Slug is already in use')
      }
    }

    return this.prisma.upward_blog_post.update({
      where: { uuid },
      data: {
        title: dto.title?.trim(),
        slug: nextSlug,
        excerpt: dto.excerpt?.trim(),
        contentHtml: dto.contentHtml,
        coverImageUrl: dto.coverImageUrl === undefined ? undefined : dto.coverImageUrl.trim() || null,
        authorName: dto.authorName?.trim(),
      },
    })
  }
}

@Injectable()
export class PublishBlogPostUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(uuid: string) {
    const existing = await this.prisma.upward_blog_post.findUnique({ where: { uuid } })
    if (!existing) {
      throw new NotFoundException('Blog post not found')
    }

    return this.prisma.upward_blog_post.update({
      where: { uuid },
      data: {
        status: PUBLISHED_STATUS,
        publishedAt: existing.publishedAt || new Date(),
      },
    })
  }
}

@Injectable()
export class UnpublishBlogPostUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(uuid: string) {
    const existing = await this.prisma.upward_blog_post.findUnique({ where: { uuid } })
    if (!existing) {
      throw new NotFoundException('Blog post not found')
    }

    return this.prisma.upward_blog_post.update({
      where: { uuid },
      data: {
        status: DRAFT_STATUS,
      },
    })
  }
}

@Injectable()
export class DeleteBlogPostUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(uuid: string) {
    const existing = await this.prisma.upward_blog_post.findUnique({ where: { uuid } })
    if (!existing) {
      throw new NotFoundException('Blog post not found')
    }

    await this.prisma.upward_blog_post.delete({ where: { uuid } })
    return { deleted: true }
  }
}
