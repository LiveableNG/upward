import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UploadSavingsKycDocumentUseCase } from '@application/use-cases/rent-savings/upload-savings-kyc-document.use-case'
import { RecordSavingsConsentUseCase } from '@application/use-cases/rent-savings/record-savings-consent.use-case'
import { SavingsConsentPdfService } from '../../../../../src/shared/infrastructure/common/rent-savings/savings-consent-pdf.service'
import { ArmConnectInvestmentProvider } from '../../../../../src/infrastructure/providers/asset-management/arm-connect-investment.provider'

describe('ARM KYC Document Upload, Consent Mandate & Provider Mapping', () => {
  describe('UploadSavingsKycDocumentUseCase', () => {
    it('rejects unsupported MIME types and oversized files', async () => {
      const userRepo = {
        findById: jest.fn().mockResolvedValue({ id: 7, uuid: 'u-7' }),
      } as any
      const uc = new UploadSavingsKycDocumentUseCase(userRepo)

      await expect(
        uc.execute({
          userId: 7,
          kind: 'utility_bill',
          fileBuffer: Buffer.from('hello'),
          fileName: 'doc.exe',
          mimeType: 'application/x-msdownload',
        }),
      ).rejects.toThrow(BadRequestException)

      await expect(
        uc.execute({
          userId: 7,
          kind: 'id_card',
          fileBuffer: Buffer.alloc(6 * 1024 * 1024),
          fileName: 'huge.jpg',
          mimeType: 'image/jpeg',
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('uploads valid PDF/JPEG documents via S3 when configured', async () => {
      const prevKey = process.env.AWS_ACCESS_KEY_ID
      const prevSecret = process.env.AWS_SECRET_ACCESS_KEY
      process.env.AWS_ACCESS_KEY_ID = 'test-key'
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret'

      try {
        const userRepo = {
          findById: jest.fn().mockResolvedValue({ id: 7, uuid: 'user-uuid-7' }),
        } as any
        const s3 = {
          uploadBuffer: jest.fn().mockResolvedValue('https://s3.amazonaws.com/bucket/key'),
        } as any

        const uc = new UploadSavingsKycDocumentUseCase(userRepo, s3)
        const res = await uc.execute({
          userId: 7,
          kind: 'utility_bill',
          fileBuffer: Buffer.from('%PDF-1.4 mock utility bill'),
          fileName: 'nepa-bill.pdf',
          mimeType: 'application/pdf',
        })

        expect(res.status).toBe('success')
        expect(res.data.kind).toBe('utility_bill')
        expect(res.data.mime_type).toBe('application/pdf')
        expect(res.data.doc_key).toMatch(/^users\/user-uuid-7\/arm-kyc\/utility_bill\/.+\.pdf$/)
        expect(s3.uploadBuffer).toHaveBeenCalledTimes(1)
      } finally {
        if (prevKey === undefined) delete process.env.AWS_ACCESS_KEY_ID
        else process.env.AWS_ACCESS_KEY_ID = prevKey
        if (prevSecret === undefined) delete process.env.AWS_SECRET_ACCESS_KEY
        else process.env.AWS_SECRET_ACCESS_KEY = prevSecret
      }
    })
  })

  describe('RecordSavingsConsentUseCase & SavingsConsentPdfService', () => {
    it('rejects consent submission if consent_accepted is not true', async () => {
      const prisma = {} as any
      const userRepo = { findById: jest.fn(), update: jest.fn() } as any
      const pdfSvc = new SavingsConsentPdfService()
      const uc = new RecordSavingsConsentUseCase(prisma, userRepo, pdfSvc)

      await expect(
        uc.execute(7, { consent_accepted: false }),
      ).rejects.toThrow(BadRequestException)
    })

    it('generates a valid PDF consent mandate and persists audit record', async () => {
      const pdfSvc = new SavingsConsentPdfService()
      const pdfBuf = await pdfSvc.generateConsentPdf({
        consentUuid: 'consent-uuid-1234',
        customerFullName: 'Funke Akindele',
        customerEmail: 'funke@example.com',
        customerPhone: '08031234567',
        maskedBvn: '*******4455',
        maskedNin: '*******8899',
        residentialAddress: '14 Admiralty Way, Lekki, Lagos',
        termsVersion: '2026-11-v1-draft',
        consentDocVersion: 'ARM-B2B2C-2026-v1-draft',
        fundCode: 'ARMMMF',
        fundName: 'ARM Money Market Fund',
        acceptedAt: new Date('2026-11-25T14:00:00.000Z'),
        ipAddress: '102.89.1.10',
        userAgent: 'JestTestAgent/1.0',
      })

      expect(Buffer.isBuffer(pdfBuf)).toBe(true)
      expect(pdfBuf.subarray(0, 5).toString('utf8')).toBe('%PDF-')

      const prisma = {
        upward_kyc_verification: {
          findFirst: jest.fn().mockResolvedValue({
            idNumberMasked: '*******4455',
            ninMasked: '*******8899',
            residentialAddressNumber: '14',
            residentialStreet: 'Admiralty Way',
            residentialTown: 'Lekki',
            residentialState: 'Lagos',
          }),
        },
        upward_rent_vault: {
          findFirst: jest.fn().mockResolvedValue({ id: 99 }),
          update: jest.fn().mockResolvedValue({}),
        },
        upward_savings_consent: {
          create: jest.fn().mockImplementation(async ({ data }) => data),
        },
      } as any
      const userRepo = {
        findById: jest.fn().mockResolvedValue({
          id: 7,
          uuid: 'user-uuid-7',
          firstName: 'Funke',
          lastName: 'Akindele',
          email: 'funke@example.com',
          phone: '08031234567',
        }),
        update: jest.fn().mockResolvedValue({}),
      } as any

      const uc = new RecordSavingsConsentUseCase(prisma, userRepo, pdfSvc)
      const res = await uc.execute(
        7,
        { consent_accepted: true, cadence: 'MONTHLY' },
        { ipAddress: '102.89.1.10', userAgent: 'UpwardPay/1.0' },
      )

      expect(res.status).toBe('success')
      expect(res.data.fund_code).toBe('ARMMMF')
      expect(res.data.fund_name).toBe('ARM Money Market Fund')
      expect(prisma.upward_savings_consent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 7,
            vaultId: 99,
            fundCode: 'ARMMMF',
            fundName: 'ARM Money Market Fund',
            acceptedTerms: true,
            acceptedArmMandate: true,
            ipAddress: '102.89.1.10',
          }),
        }),
      )
      expect(userRepo.update).toHaveBeenCalledWith(7, { savingsWalletEnabled: true })
    })
  })

  describe('ArmConnectInvestmentProvider mappings & real document guard', () => {
    it('maps Means of Identification and Nigerian states cleanly', () => {
      expect(ArmConnectInvestmentProvider.mapMeansOfIdentification('NIN')).toEqual({
        idType: '5',
        meansOfIdentification: 'NIN',
      })
      expect(
        ArmConnectInvestmentProvider.mapMeansOfIdentification('INTERNATIONAL_PASSPORT'),
      ).toEqual({
        idType: '1',
        meansOfIdentification: 'InternationalPassport',
      })
      expect(ArmConnectInvestmentProvider.mapMeansOfIdentification('DRIVERS_LICENSE')).toEqual({
        idType: '2',
        meansOfIdentification: 'DriversLicense',
      })
      expect(ArmConnectInvestmentProvider.normalizeStateCode('FCT - Abuja')).toBe('FCT')
      expect(ArmConnectInvestmentProvider.normalizeStateCode('Lagos State')).toBe('LAGOS')
    })

    it('rejects onboarding when real NIN or uploaded id_card/utility_bill are missing', async () => {
      const provider = new ArmConnectInvestmentProvider(new ConfigService({}))
      // Stub login & overview so we isolate validation before HTTP onboarding call
      ;(provider as any).getValidToken = jest.fn().mockResolvedValue('mock-jwt')
      ;(provider as any).getMerchantOverview = jest.fn().mockResolvedValue({ customers: [] })

      const missingNinRes = await provider.onboardInvestor({
        customerEmail: 'test@example.com',
        personalDetails: {
          surname: 'Eze',
          firstName: 'Chidi',
          dateOfBirth: '1994-06-12',
          gender: 'Male',
          mobilePhone: '08031112233',
        },
        address: {
          addressNumber: '14',
          streetName: 'Admiralty Way',
          town: 'Lekki',
          residentialStateCode: 'Lagos',
        },
        kycDetails: {
          bvn: '22222222222',
          nin: '',
        },
      })
      expect(missingNinRes.success).toBe(false)
      expect(missingNinRes.failureReason).toMatch(/NIN/i)

      const missingDocsRes = await provider.onboardInvestor({
        customerEmail: 'test@example.com',
        personalDetails: {
          surname: 'Eze',
          firstName: 'Chidi',
          dateOfBirth: '1994-06-12',
          gender: 'Male',
          mobilePhone: '08031112233',
        },
        address: {
          addressNumber: '14',
          streetName: 'Admiralty Way',
          town: 'Lekki',
          residentialStateCode: 'Lagos',
        },
        kycDetails: {
          bvn: '22222222222',
          nin: '11122233344',
          meansOfIdentification: 'NIN',
        },
      })
      expect(missingDocsRes.success).toBe(false)
      expect(missingDocsRes.failureReason).toMatch(/Utility Bill/i)
    })

    it('rejects Prembly sandbox placeholder strings ("base64 image content") and falls back to valid PNG base64', async () => {
      expect(ArmConnectInvestmentProvider.isValidBase64Content('base64 image content')).toBe(false)
      expect(ArmConnectInvestmentProvider.isValidBase64Content('https://example.com/p.jpg')).toBe(false)
      expect(
        ArmConnectInvestmentProvider.isValidBase64Content(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        ),
      ).toBe(true)

      const provider = new ArmConnectInvestmentProvider(new ConfigService({}))
      ;(provider as any).getValidToken = jest.fn().mockResolvedValue('mock-jwt')
      ;(provider as any).getMerchantOverview = jest.fn().mockResolvedValue({ customers: [] })
      let capturedBody: any = null
      ;(provider as any).fetchWithAuth = jest.fn().mockImplementation(async (_url, init) => {
        capturedBody = JSON.parse(init.body)
        return {
          ok: true,
          status: 200,
          json: async () => ({
            status: true,
            data: { customerId: 'cust-1', customerMembershipId: '3009999', status: 'Submitted' },
          }),
        }
      })

      const validImgBase64 = Buffer.from('mock-id-image-bytes').toString('base64')
      const res = await provider.onboardInvestor({
        customerEmail: 'victor@example.com',
        personalDetails: {
          surname: 'Awotidebe',
          firstName: 'Victor',
          dateOfBirth: '11-May-2004',
          gender: 'Male',
          mobilePhone: '08031112233',
        },
        address: {
          addressNumber: '27',
          streetName: 'Nathan street',
          town: 'Surulere',
          residentialStateCode: 'Lagos',
        },
        kycDetails: {
          bvn: '22305055680',
          nin: '22305055680',
          meansOfIdentification: 'INTERNATIONAL_PASSPORT',
          idNumber: 'B0123',
        },
        bankDetails: {
          bankCode: '058',
          bankName: 'Guaranty Trust Bank',
          accountNumber: '0123456789',
          accountName: 'Victor Awotidebe',
        },
        documents: {
          passport: 'base64 image content',
          bvn_passport: 'base64 image content',
          id_card: { base64: validImgBase64, mimeType: 'image/png', fileName: 'id.png' },
          utility_bill: { base64: validImgBase64, mimeType: 'image/png', fileName: 'bill.png' },
        },
      })

      expect(res.success).toBe(true)
      expect(capturedBody.documents[0].document).not.toBe('base64 image content')
      expect(ArmConnectInvestmentProvider.isValidBase64Content(capturedBody.documents[0].document)).toBe(true)
      expect(ArmConnectInvestmentProvider.isValidBase64Content(capturedBody.documents[1].document)).toBe(true)
    })

    it('rejects missing bankDetails instead of fabricating fake GTBank 0123456789 and does not reuse NotStarted drafts', async () => {
      const provider = new ArmConnectInvestmentProvider(new ConfigService({}))
      ;(provider as any).getValidToken = jest.fn().mockResolvedValue('mock-jwt')
      ;(provider as any).getMerchantOverview = jest.fn().mockResolvedValue({
        customers: [
          {
            customerId: 'draft-cust-1',
            customerEmail: 'victor@example.com',
            status: 'NotStarted',
            customerMembershipId: null,
          },
        ],
      })
      const fetchSpy = jest.fn()
      ;(provider as any).fetchWithAuth = fetchSpy

      const validImgBase64 = Buffer.from('mock-id-image-bytes').toString('base64')
      const res = await provider.onboardInvestor({
        customerEmail: 'victor@example.com',
        personalDetails: {
          surname: 'Awotidebe',
          firstName: 'Victor',
          dateOfBirth: '11-May-2004',
          gender: 'Male',
          mobilePhone: '08031112233',
        },
        address: {
          addressNumber: '27',
          streetName: 'Nathan street',
          town: 'Surulere',
          residentialStateCode: 'Lagos',
        },
        kycDetails: {
          bvn: '22305055680',
          nin: '22305055680',
          meansOfIdentification: 'NIN',
        },
        documents: {
          id_card: { base64: validImgBase64, mimeType: 'image/png', fileName: 'id.png' },
          utility_bill: { base64: validImgBase64, mimeType: 'image/png', fileName: 'bill.png' },
        },
      })

      expect(res.success).toBe(false)
      expect(res.failureReason).toMatch(/bank account linked to your BVN/i)
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })
})
