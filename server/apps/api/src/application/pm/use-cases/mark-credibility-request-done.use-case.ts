import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class MarkCredibilityRequestDoneUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(requestUuid: string) {
    const request = await this.prisma.upward_credibility_request.findUnique({
      where: { uuid: requestUuid }
    });

    if (!request) throw new NotFoundException('Request not found');

    return this.prisma.upward_credibility_request.update({
      where: { uuid: requestUuid },
      data: { status: 'DONE' }
    });
  }
}
