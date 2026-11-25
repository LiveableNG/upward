import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'

/**
 * Editable draft legal versions & disclosures for Upward Rent Savings (ARM Money Market Fund).
 * Legal team can replace the clauses below without changing storage or audit flow.
 */
export const SAVINGS_LEGAL_DEFAULTS = {
  TERMS_VERSION: '2026-11-v1-draft',
  CONSENT_DOC_VERSION: 'ARM-B2B2C-2026-v1-draft',
  FUND_CODE: 'ARMMMF',
  FUND_NAME: 'ARM Money Market Fund',
  FUND_MANAGER: 'ARM Investment Managers (Asset & Resource Management Holding Company)',
  ANNUAL_YIELD_INDICATIVE: '16.0% p.a. (indicative, daily compounding)',
  MANDATE_CLAUSES: [
    'I authorize Liveable Smartcity Technologies Limited (Upward / GoodTenants) to collect and transmit my verified KYC details (BVN, NIN, Valid Means of Identification, Residential Address, and Proof of Address) to Asset & Resource Management Holding Company (ARM) for SEC-compliant B2B2C investor onboarding into the ARM Money Market Fund (ARMMMF).',
    'I expressly authorize Upward / GoodTenants to invest my Rent Savings deposits into units of the ARM Money Market Fund (ARMMMF) and to execute redemptions on my behalf at lease maturity (T-30 days prior to rent due date) or upon an authorized early withdrawal request.',
    'I acknowledge that returns on the ARM Money Market Fund (ARMMMF) are variable market yields (indicatively 16.0% p.a. for Save & Earn) subject to money market performance and applicable SEC regulations, and that savings remain locked until 30 days before my rent due date unless I initiate a Fair Exit breakout.',
    'I confirm that all identification documents and proof of address uploaded by me are genuine, accurate, and belong to me, and I consent to NDPR-compliant data processing for KYC verification and investment administration.',
  ],
} as const

export interface SavingsConsentPdfData {
  consentUuid: string
  customerFullName: string
  customerEmail: string
  customerPhone?: string | null
  maskedBvn?: string | null
  maskedNin?: string | null
  residentialAddress?: string | null
  termsVersion: string
  consentDocVersion: string
  fundCode: string
  fundName: string
  acceptedAt: Date
  ipAddress?: string | null
  userAgent?: string | null
}

@Injectable()
export class SavingsConsentPdfService {
  async generateConsentPdf(data: SavingsConsentPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 44,
        info: {
          Title: `ARM Money Market Fund Consent Mandate - ${data.customerFullName}`,
          Author: 'Upward by GoodTenants',
        },
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const W = 595.28
      const clay = '#d97757'
      const dark = '#0a0a0f'
      const textSecondary = '#4a4642'
      const textMuted = '#78716c'
      const surface = '#faf9f5'
      const border = '#e2ddd7'

      // Header Banner
      doc.rect(0, 0, W, 118).fill(surface)
      doc.rect(0, 0, W, 5).fill(clay)

      doc.font('Helvetica-Bold').fontSize(15).fillColor(clay).text('UPWARD BY GOODTENANTS', 44, 28)
      doc
        .font('Helvetica-Bold')
        .fontSize(17)
        .fillColor(dark)
        .text('Customer Investment & Transact Consent Mandate', 44, 50)
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(textSecondary)
        .text(`${data.fundName} (${data.fundCode})  •  SEC-Regulated B2B2C Savings Program`, 44, 74)
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textMuted)
        .text(
          `Mandate Ref: ${data.consentUuid}   |   Terms: ${data.termsVersion}   |   Consent Doc: ${data.consentDocVersion}`,
          44,
          94,
        )

      let y = 138

      // Customer Identity Card
      doc
        .roundedRect(44, y, W - 88, 126, 8)
        .fillAndStroke('#ffffff', border)

      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(clay).text('1. INVESTOR & ACCOUNT HOLDER DETAILS', 58, y + 14)

      const leftX = 58
      const rightX = 315
      const drawField = (x: number, fy: number, label: string, value: string) => {
        doc.font('Helvetica').fontSize(7.5).fillColor(textMuted).text(label.toUpperCase(), x, fy)
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(dark)
          .text(value || '—', x, fy + 10, { width: 220 })
      }

      drawField(leftX, y + 32, 'Full Legal Name', data.customerFullName)
      drawField(rightX, y + 32, 'Email Address', data.customerEmail)
      drawField(leftX, y + 64, 'BVN (Masked)', data.maskedBvn || 'Verified on file')
      drawField(rightX, y + 64, 'NIN (Masked)', data.maskedNin || 'Verified on file')
      drawField(leftX, y + 95, 'Phone Number', data.customerPhone || '—')
      drawField(rightX, y + 95, 'Residential Address', data.residentialAddress || 'On file')

      y += 146

      // Mandate Clauses
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(clay)
        .text('2. EXPRESS B2B2C AUTHORIZATION & TERMS ACCEPTANCE', 44, y)
      y += 18

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(textSecondary)
        .text(
          `Fund Name: ${data.fundName} (${data.fundCode})   |   Fund Manager: ${SAVINGS_LEGAL_DEFAULTS.FUND_MANAGER}`,
          44,
          y,
          { width: W - 88 },
        )
      y += 22

      SAVINGS_LEGAL_DEFAULTS.MANDATE_CLAUSES.forEach((clause, idx) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(dark)
          .text(`${idx + 1}. `, 44, y, { continued: true })
          .font('Helvetica')
          .fillColor(textSecondary)
          .text(clause, { width: W - 88, lineGap: 3 })
        y = doc.y + 10
      })

      y += 8

      // Electronic Signature & Compliance Audit Box
      doc
        .roundedRect(44, y, W - 88, 118, 8)
        .fillAndStroke(surface, border)

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(clay)
        .text('3. ELECTRONIC CONSENT & AUDIT TRAIL', 58, y + 14)

      const signedIso = data.acceptedAt.toISOString()
      const signedWat = data.acceptedAt.toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'medium',
        timeStyle: 'long',
      })

      drawField(leftX, y + 34, 'Digitally Accepted By', data.customerFullName)
      drawField(rightX, y + 34, 'Consent Status', 'CONFIRMED & EXECUTED')
      drawField(leftX, y + 66, 'Timestamp (WAT / UTC)', `${signedWat} (${signedIso})`)
      drawField(rightX, y + 66, 'IP Address', data.ipAddress || 'Recorded via session')

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(textMuted)
        .text(
          `User-Agent: ${(data.userAgent || 'Upward Pay Client').slice(0, 120)}`,
          leftX,
          y + 98,
          { width: W - 116 },
        )

      // Footer
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textMuted)
        .text(
          'Draft Mandate Template — Subject to final Legal wording. Generated electronically by Upward by GoodTenants for ARM Connect B2B2C compliance.',
          44,
          785,
          { width: W - 88, align: 'center' },
        )

      doc.end()
    })
  }
}
