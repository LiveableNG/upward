import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class RejectCredibilityRequestUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(requestUuid: string) {
    const credibilityReq = await this.prisma.upward_credibility_request.findUnique({
      where: { uuid: requestUuid }
    });

    if (!credibilityReq) {
      throw new NotFoundException('Credibility request not found or invalid link.');
    }

    if (credibilityReq.status !== 'PENDING') {
      throw new BadRequestException('This request is already resolved.');
    }

    const updatedRequest = await this.prisma.upward_credibility_request.update({
      where: { uuid: requestUuid },
      data: { status: 'CANCELLED' }
    });

    // Optionally send notification to tenant that their request was declined
    // But for now, just mark it as CANCELLED

    return {
      success: true,
      message: 'Request declined successfully.',
      request: updatedRequest,
    };
  }
}
