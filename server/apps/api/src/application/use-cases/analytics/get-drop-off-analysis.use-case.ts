import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetDropOffAnalysisUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute() {
    return this.prisma.$queryRaw`
      SELECT 
          id,
          email,
          "firstName" || ' ' || "lastName" AS full_name,
          role,
          benefits,
          "acceptTerms",
          CASE 
              WHEN "acceptTerms" = true THEN 'Completed'
              WHEN "selectedSession" IS NOT NULL OR "wantsAmbassador" = true THEN 'Stage 4: Confirmation'
              WHEN cardinality(benefits) > 0 THEN 'Stage 3: Benefits'
              WHEN role IS NOT NULL THEN 'Stage 2: Role'
              WHEN "firstName" IS NOT NULL OR "phone" IS NOT NULL OR "city" IS NOT NULL THEN 'Stage 1: Contact Info'
              ELSE 'Stage 0: Email Capture'
          END AS drop_off_stage,
          "createdAt" AS started_at,
          "updatedAt" AS last_activity,
          "selectedSession"
      FROM upward_waitlist
      ORDER BY "updatedAt" DESC;
    `
  }
}
