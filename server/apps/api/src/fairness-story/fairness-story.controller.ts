/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Post, Get, Req, BadRequestException } from '@nestjs/common'
import { FairnessStoryService } from './fairness-story.service'
import type { FastifyRequest } from 'fastify'

@Controller('fairness-story')
export class FairnessStoryController {
  constructor(private readonly fairnessStoryService: FairnessStoryService) {}

  @Post()
  async create(@Req() req: FastifyRequest) {
    const fastifyReq = req as any
    if (!fastifyReq.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data')
    }

    const data: any = {
      categories: [],
      fileUrls: [],
    }

    const parts = fastifyReq.parts()
    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer()
        const base64 = `data:${part.mimetype};base64,${buffer.toString('base64')}`

        if (part.fieldname === 'audio') {
          data.audioUrl = base64
        } else if (part.fieldname === 'files') {
          data.fileUrls.push(base64)
        }
      } else {
        // part.type === 'field'
        const value = part.value as string
        if (part.fieldname === 'categories') {
          try {
            data.categories = JSON.parse(value)
          } catch {
            data.categories.push(value)
          }
        } else {
          data[part.fieldname] = value
        }
      }
    }

    return this.fairnessStoryService.create({
      name: data.name,
      categories: Array.isArray(data.categories) ? data.categories : [data.categories],
      story: data.story || '',
      audioUrl: data.audioUrl,
      fileUrls: data.fileUrls,
    })
  }

  @Get()
  async findAll() {
    return this.fairnessStoryService.findAll()
  }
}
