import { Injectable, Inject } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import {
  SESSION_TRACKING_REPOSITORY,
  ISessionTrackingRepository,
} from '../../../domains/session-tracking/session-tracking.repository';

export class SessionExplorerQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  dropOffStage?: string;

  @IsOptional()
  @IsString()
  hasError?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

@Injectable()
export class GetSessionExplorerUseCase {
  constructor(
    @Inject(SESSION_TRACKING_REPOSITORY)
    private readonly sessionRepo: ISessionTrackingRepository,
  ) {}

  async execute(query: SessionExplorerQueryDto) {
    // If querying a single session's detail with complete breadcrumbs
    if (query.sessionId) {
      const result = await this.sessionRepo.findSessionWithEvents(query.sessionId);
      return { session: result ? { ...result.session.toJSON(), events: result.events.map((e) => e.toJSON()) } : null };
    }

    const pageNum = query.page ? parseInt(query.page, 10) : 1;
    const limitNum = query.limit ? parseInt(query.limit, 10) : 30;

    const { data, total } = await this.sessionRepo.findSessions({
      page: pageNum,
      limit: limitNum,
      search: query.search,
      platform: query.platform,
      dropOffStage: query.dropOffStage,
      hasError: query.hasError === 'true',
    });

    return {
      data: data.map((s) => s.toJSON()),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}
