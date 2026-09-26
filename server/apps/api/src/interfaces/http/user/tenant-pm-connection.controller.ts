import { Controller, Post, Body, UseGuards, Req, Get, Query, Param, Res, BadRequestException, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../../application/auth/interfaces/authenticated-request.interface';
import { VerifyPmEmailUseCase } from '../../../application/use-cases/tenant-pm-connection/verify-pm.use-case';
import { ConfirmPmConnectionUseCase } from '../../../application/use-cases/tenant-pm-connection/confirm-pm-connection.use-case';
import { InvitePmUseCase } from '../../../application/use-cases/tenant-pm-connection/invite-pm.use-case';
import { SubmitUnitRequestUseCase } from '../../../application/use-cases/tenant-pm-connection/submit-unit-request.use-case';
import { DiscoverLinkedPropertiesUseCase } from '../../../application/use-cases/tenant-pm-connection/discover-linked-properties.use-case';
import { SearchPmUseCase } from '../../../application/use-cases/tenant-pm-connection/search-pm.use-case';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import * as crypto from 'crypto';

@Controller('user/pm-connection')
export class TenantPmConnectionController {
  constructor(
    private readonly verifyPmEmailUseCase: VerifyPmEmailUseCase,
    private readonly confirmPmConnectionUseCase: ConfirmPmConnectionUseCase,
    private readonly invitePmUseCase: InvitePmUseCase,
    private readonly submitUnitRequestUseCase: SubmitUnitRequestUseCase,
    private readonly discoverLinkedPropertiesUseCase: DiscoverLinkedPropertiesUseCase,
    private readonly searchPmUseCase: SearchPmUseCase,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
  ) {}

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchPm(@Query('q') query: string) {
    const result = await this.searchPmUseCase.execute(query);
    return { success: true, data: result };
  }

  @Get('discover')
  @UseGuards(JwtAuthGuard)
  async discoverProperties(@Req() req: AuthenticatedRequest) {
    const user = req.user;
    const result = await this.discoverLinkedPropertiesUseCase.execute(user);
    return { success: true, data: result };
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPm(@Body('identifier') identifier: string) {
    const result = await this.verifyPmEmailUseCase.execute(identifier);
    return { success: true, data: result };
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  async confirmConnection(
    @Req() req: AuthenticatedRequest,
    @Body('pmId') pmId: number,
  ) {
    const user = req.user;
    const result = await this.confirmPmConnectionUseCase.execute(pmId, user);
    return { success: true, data: result };
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  async invitePm(
    @Req() req: AuthenticatedRequest,
    @Body('pmEmail') pmEmail: string,
    @Body('pmName') pmName: string,
    @Body('pmType') pmType: string | undefined,
    @Body('companyName') companyName: string | undefined,
  ) {
    const user = req.user;
    const result = await this.invitePmUseCase.execute(user, pmEmail, pmName, true, undefined, pmType, companyName);
    return { success: true, data: result };
  }

  @Post('onboarding-proof/upload')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async uploadOnboardingProof(@Req() req: any) {
    if (!req.isMultipart || !req.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data');
    }

    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file uploaded');
    }

    const buffer = await data.toBuffer();
    if (buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds limit of 10MB.');
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(data.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, and PNG files are allowed');
    }

    const fileExtension = data.filename.split('.').pop() || 'pdf';
    const uuid = crypto.randomUUID();
    const userUuid = String(req.user.id || req.user.uuid || 'anonymous');
    const s3Key = `users/${userUuid}/onboarding-proofs/${uuid}.${fileExtension}`;

    await this.s3Service.uploadBuffer(buffer, s3Key, data.mimetype);

    return {
      success: true,
      data: {
        url: s3Key,
        fileName: data.filename,
        fileType: data.mimetype,
        fileSize: buffer.length,
      },
    };
  }

  @Get('onboarding-proof/:uuid/file')
  async getOnboardingProofFile(
    @Param('uuid') uuid: string,
    @Res({ passthrough: true }) res: any,
  ) {
    const joinRequest = await (this.prisma as any).upward_tenant_join_request?.findFirst({
      where: { uuid },
    }) || await this.prisma.upward_pm_activity_log.findFirst({
      where: { uuid },
    });

    const fileKey = (joinRequest as any)?.onboardingProofUrl || (joinRequest as any)?.metadata?.onboardingProof?.url;
    const fileName = (joinRequest as any)?.onboardingProofFileName || (joinRequest as any)?.metadata?.onboardingProof?.fileName || 'onboarding_proof';

    if (!fileKey) {
      throw new NotFoundException('Proof file not found for this join request');
    }

    return this.s3Service.streamObject(fileKey, res, {
      filename: fileName,
      cacheControl: 'public, max-age=86400',
    });
  }

  @Post('add-unit-request')
  @UseGuards(JwtAuthGuard)
  async addUnitRequest(
    @Req() req: AuthenticatedRequest,
    @Body('pmEmail') pmEmail: string | undefined,
    @Body('pmName') pmName: string | undefined,
    @Body('pmType') pmType: string | undefined,
    @Body('companyName') companyName: string | undefined,
    @Body('companyUuid') companyUuid: string | undefined,
    @Body('managerUuid') managerUuid: string | undefined,
    @Body('unitDetails') unitDetails: any,
    @Body('paymentDetails') paymentDetails?: {
      accountNumber: string;
      bankCode: string;
      accountName?: string;
      bankName?: string;
    },
    @Body('onboardingProof') onboardingProof?: {
      url: string;
      fileName: string;
      fileType?: string;
      fileSize?: number;
    },
  ) {
    const user = req.user;
    const result = await this.submitUnitRequestUseCase.execute(
      user,
      pmEmail,
      pmName,
      pmType,
      companyName,
      unitDetails,
      paymentDetails,
      companyUuid,
      managerUuid,
      onboardingProof,
    );
    return { success: true, data: result };
  }
}
