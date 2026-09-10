import { Inject, Injectable } from '@nestjs/common'
import * as crypto from 'crypto'
import {
  IUniversityTrafficRepository,
  UNIVERSITY_TRAFFIC_REPOSITORY,
} from '../../../domains/university-traffic/university-traffic.repository'
import { UniversityTrafficVisit } from '../../../domains/university-traffic/university-traffic.entity'

export interface TrackVisitInput {
  identifier: string
  visitorId: string
  sessionId: string
  abVariant?: string
  ipAddress?: string
  userAgent?: string
  referer?: string
  path: string
}

export interface TrackVisitResult {
  visit: UniversityTrafficVisit
  isDeduplicated: boolean
  isNewUnique: boolean
}

@Injectable()
export class TrackUniversityVisitUseCase {
  constructor(
    @Inject(UNIVERSITY_TRAFFIC_REPOSITORY)
    private readonly trafficRepo: IUniversityTrafficRepository,
  ) {}

  async execute(input: TrackVisitInput): Promise<TrackVisitResult> {
    if (!input.identifier || !input.visitorId || !input.sessionId) {
      throw new Error('Identifier, visitorId, and sessionId are required for tracking.')
    }

    // Generate privacy-preserving salt-hashed IP for anti-bot & reload deduplication
    let ipHash: string | undefined
    if (input.ipAddress) {
      const salt = 'upward_university_analytics_salt'
      ipHash = crypto.createHash('sha256').update(`${input.ipAddress}_${salt}`).digest('hex')
    }

    return this.trafficRepo.recordVisit({
      identifier: input.identifier,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      abVariant: input.abVariant,
      ipHash,
      userAgent: input.userAgent,
      referer: input.referer,
      path: input.path || '/university',
    })
  }
}
