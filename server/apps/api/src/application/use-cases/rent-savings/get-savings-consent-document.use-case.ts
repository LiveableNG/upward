import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  StreamableFile,
} from '@nestjs/common'
import * as fs from 'fs/promises'
import * as path from 'path'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import {
  SAVINGS_LEGAL_DEFAULTS,
  SavingsConsentPdfService,
} from '../../../shared/infrastructure/common/rent-savings/savings-consent-pdf.service'

@Injectable()
export class GetSavingsConsentDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly consentPdfService: SavingsConsentPdfService,
    @Optional() private readonly s3Service?: S3Service,
  ) {}

  async execute(userId: number, res: any): Promise<StreamableFile> {
    const consent = await this.prisma.upward_savings_consent.findFirst({
      where: { userId },
      orderBy: { acceptedAt: 'desc' },
    })
    if (!consent) {
      throw new NotFoundException('No signed rent savings consent mandate found for this account.')
    }

    const fileName = `ARM_MMF_Consent_Mandate_${consent.uuid.slice(0, 8)}.pdf`

    // Try streaming stored PDF first (S3 or local fallback)
    if (consent.consentDocKey) {
      try {
        if (consent.consentDocKey.startsWith('local:')) {
          const relPath = consent.consentDocKey.slice('local:'.length).replace(/^\/+/, '')
          const absPath = path.resolve(process.cwd(), '.uploads', relPath)
          const buf = await fs.readFile(absPath)
          return S3Service.streamBuffer(buf, fileName, res, {
            contentType: 'application/pdf',
            isAttachment: false,
          })
        }
        if (this.s3Service) {
          return await this.s3Service.streamFile(consent.consentDocKey, res, {
            filename: fileName,
            contentType: 'application/pdf',
            isAttachment: false,
          })
        }
      } catch {
        // Fall through to deterministic regeneration from audit snapshot
      }
    }

    const user = await this.userRepo.findById(userId)
    const snap = (consent.consentSnapshot as Record<string, any>) || {}
    const pdfBuffer = await this.consentPdfService.generateConsentPdf({
      consentUuid: consent.uuid,
      customerFullName:
        snap.customerFullName ||
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        'Tenant',
      customerEmail: snap.customerEmail || user?.email || '—',
      customerPhone: snap.customerPhone || user?.phone || null,
      maskedBvn: snap.maskedBvn || null,
      maskedNin: snap.maskedNin || null,
      residentialAddress: snap.residentialAddress || null,
      termsVersion: consent.termsVersion,
      consentDocVersion: consent.consentDocVersion,
      fundCode: consent.fundCode || SAVINGS_LEGAL_DEFAULTS.FUND_CODE,
      fundName: consent.fundName || SAVINGS_LEGAL_DEFAULTS.FUND_NAME,
      acceptedAt: consent.acceptedAt,
      ipAddress: consent.ipAddress,
      userAgent: consent.userAgent,
    })

    return S3Service.streamBuffer(pdfBuffer, fileName, res, {
      contentType: 'application/pdf',
      isAttachment: false,
    })
  }
}

@Injectable()
export class GetSavingsKycDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly s3Service?: S3Service,
  ) {}

  async execute(userId: number, kind: string, res: any): Promise<StreamableFile> {
    if (kind !== 'id_card' && kind !== 'utility_bill') {
      throw new BadRequestException('Document kind must be "id_card" or "utility_bill".')
    }

    const latestKyc = await this.prisma.upward_kyc_verification.findFirst({
      where: {
        userId,
        ...(kind === 'id_card'
          ? { meansOfIdDocKey: { not: null } }
          : { utilityBillDocKey: { not: null } }),
      },
      orderBy: { createdAt: 'desc' },
    })

    const docKey = kind === 'id_card' ? latestKyc?.meansOfIdDocKey : latestKyc?.utilityBillDocKey
    const mimeType =
      kind === 'id_card' ? latestKyc?.meansOfIdMimeType : latestKyc?.utilityBillMimeType
    const fileName =
      (kind === 'id_card' ? latestKyc?.meansOfIdFileName : latestKyc?.utilityBillFileName) ||
      `${kind}.jpg`

    if (!docKey) {
      throw new NotFoundException(`No uploaded ${kind.replace('_', ' ')} document found.`)
    }

    if (docKey.startsWith('local:')) {
      const relPath = docKey.slice('local:'.length).replace(/^\/+/, '')
      const absPath = path.resolve(process.cwd(), '.uploads', relPath)
      const buf = await fs.readFile(absPath)
      return S3Service.streamBuffer(buf, fileName, res, {
        contentType: mimeType || undefined,
        isAttachment: false,
      })
    }

    if (!this.s3Service) {
      throw new NotFoundException('Document storage service is unavailable.')
    }

    return this.s3Service.streamFile(docKey, res, {
      filename: fileName,
      contentType: mimeType || undefined,
      isAttachment: false,
    })
  }
}
