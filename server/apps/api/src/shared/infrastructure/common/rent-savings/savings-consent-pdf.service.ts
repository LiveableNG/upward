import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'

/**
 * Approved legal versions & Letter of Consent text for Upward by Goodtenants Limited
 * Rent Savings (ARM Money Market Fund — ARMMMF).
 */
export const SAVINGS_LEGAL_DEFAULTS = {
  TERMS_VERSION: '2026-11-v1',
  CONSENT_DOC_VERSION: 'ARM-B2B2C-2026-v1',
  EFFECTIVE_DATE: 'November, 2026',
  LEGAL_ENTITY: 'Upward by Goodtenants Limited',
  REGISTERED_ADDRESS: '2/4, Funsho Street Link, Sabo, Yaba, Lagos State, Nigeria',
  FUND_CODE: 'ARMMMF',
  FUND_NAME: 'ARM Money Market Fund',
  FUND_MANAGER: 'Asset & Resource Management Holding Company (ARM)',
  LETTER_INTRO:
    'By activating the housing savings and investment feature on the Goodtenants platform (“Platform”), I (“Participating Investor”) give my express, informed, and binding consent to Goodtenants Limited (“Goodtenants”) for savings and investments directed toward housing and housing-related products.',
  LETTER_SECTIONS: [
    {
      heading: 'Fund Management',
      body: 'I understand that Goodtenants is a technology platform and not a licensed fund manager, and that funds invested toward housing savings goals are placed with Asset & Resource Management Holding Company (ARM) (“Fund Manager”) for investment management.',
    },
    {
      heading: 'Redemptions & Returns',
      body: 'I authorize and instruct Goodtenants to request, collect, and receive on my behalf all principal redemptions, liquidated savings balances, and accrued investment returns payable by the Fund Manager (ARM) in connection with my savings and investments on the Platform.',
    },
    {
      heading: 'Remittance',
      body: 'I consent to and authorize the Fund Manager (ARM) to remit all such redemption proceeds and accrued investment returns directly into Goodtenants Limited’s designated corporate bank account. Payment by ARM into Goodtenants’ designated corporate account constitutes a valid discharge of ARM’s payment obligation to me for the sum remitted.',
    },
    {
      heading: 'Application & Disbursement of Funds',
      body: 'I authorize Goodtenants to hold and apply the funds received on my behalf strictly for my designated housing obligations (including rent, housing deposits, or housing-related products on the Platform), or to remit them to my verified personal bank account upon a valid withdrawal request in accordance with the Upward Rent Savings Terms of Service.',
    },
    {
      heading: 'Digital Execution',
      body: 'By checking the consent box or clicking “I Agree”, I adopt this Consent as my valid electronic signature and legally binding authorization.',
    },
  ],
  MANDATE_CLAUSES: [
    'Fund Management: I understand that Goodtenants is a technology platform and not a licensed fund manager, and that funds invested toward housing savings goals are placed with Asset & Resource Management Holding Company (ARM) (“Fund Manager”) for investment management.',
    'Redemptions & Returns: I authorize and instruct Goodtenants to request, collect, and receive on my behalf all principal redemptions, liquidated savings balances, and accrued investment returns payable by the Fund Manager (ARM) in connection with my savings and investments on the Platform.',
    'Remittance: I consent to and authorize the Fund Manager (ARM) to remit all such redemption proceeds and accrued investment returns directly into Goodtenants Limited’s designated corporate bank account. Payment by ARM into Goodtenants’ designated corporate account constitutes a valid discharge of ARM’s payment obligation to me for the sum remitted.',
    'Application & Disbursement of Funds: I authorize Goodtenants to hold and apply the funds received on my behalf strictly for my designated housing obligations (including rent, housing deposits, or housing-related products on the Platform), or to remit them to my verified personal bank account upon a valid withdrawal request in accordance with the Upward Rent Savings Terms of Service.',
    'Digital Execution: By checking the consent box or clicking “I Agree”, I adopt this Consent as my valid electronic signature and legally binding authorization.',
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
          Title: `Letter of Consent - ${data.customerFullName}`,
          Author: 'Upward by Goodtenants Limited',
        },
      })

      const buffers: Buffer[] = []
      doc.on('data', (chunk) => buffers.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const W = 595.28
      const contentW = W - 88
      const clay = '#d97757'
      const dark = '#0a0a0f'
      const textSecondary = '#3f3b37'
      const textMuted = '#78716c'
      const surface = '#faf9f5'
      const border = '#e2ddd7'

      // Header Banner
      doc.rect(0, 0, W, 112).fill(surface)
      doc.rect(0, 0, W, 5).fill(clay)

      doc.font('Helvetica-Bold').fontSize(13).fillColor(clay).text('UPWARD BY GOODTENANTS LIMITED', 44, 24)
      doc.font('Helvetica-Bold').fontSize(17).fillColor(dark).text('LETTER OF CONSENT', 44, 44)
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(textSecondary)
        .text(
          `${data.fundName} (${data.fundCode})  •  Effective ${SAVINGS_LEGAL_DEFAULTS.EFFECTIVE_DATE}`,
          44,
          67,
        )
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(textMuted)
        .text(
          `Ref: ${data.consentUuid}   |   Terms: ${data.termsVersion}   |   Consent: ${data.consentDocVersion}`,
          44,
          86,
        )

      let y = 128

      // To / From & Investor Identity Card
      doc.roundedRect(44, y, contentW, 128, 8).fillAndStroke('#ffffff', border)

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor(clay)
        .text('1. PARTIES & PARTICIPATING INVESTOR DETAILS', 58, y + 12)

      const leftX = 58
      const rightX = 315
      const drawField = (x: number, fy: number, label: string, value: string, width = 225) => {
        doc.font('Helvetica').fontSize(7).fillColor(textMuted).text(label.toUpperCase(), x, fy)
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(dark)
          .text(value || '—', x, fy + 9, { width })
      }

      drawField(
        leftX,
        y + 28,
        'To',
        `Upward by Goodtenants Limited, ${SAVINGS_LEGAL_DEFAULTS.REGISTERED_ADDRESS}`,
        245,
      )
      drawField(rightX, y + 28, 'From (Participating Investor)', data.customerFullName)
      drawField(leftX, y + 64, 'Email Address', data.customerEmail)
      drawField(rightX, y + 64, 'Phone Number', data.customerPhone || '—')
      drawField(
        leftX,
        y + 94,
        'KYC Identity (BVN / NIN)',
        `${data.maskedBvn || 'Verified'}  /  ${data.maskedNin || 'Verified'}`,
      )
      drawField(rightX, y + 94, 'Residential Address', data.residentialAddress || 'On file')

      y += 144

      // Official Letter of Consent Body
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(clay)
        .text('2. EXPRESS CONSENT & AUTHORIZATION', 44, y)
      y += 16

      doc
        .font('Helvetica')
        .fontSize(8.8)
        .fillColor(textSecondary)
        .text(SAVINGS_LEGAL_DEFAULTS.LETTER_INTRO, 44, y, { width: contentW, lineGap: 2.5 })
      y = doc.y + 10

      SAVINGS_LEGAL_DEFAULTS.LETTER_SECTIONS.forEach((section) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(8.8)
          .fillColor(dark)
          .text(`${section.heading}: `, 44, y, { continued: true })
          .font('Helvetica')
          .fillColor(textSecondary)
          .text(section.body, { width: contentW, lineGap: 2.5 })
        y = doc.y + 8
      })

      y += 6

      // If nearing bottom margin, flow audit box cleanly to next page
      if (y > 650) {
        doc.addPage()
        y = 48
      }

      // Electronic Signature & Compliance Audit Box
      doc.roundedRect(44, y, contentW, 112, 8).fillAndStroke(surface, border)

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(clay)
        .text('3. ELECTRONIC EXECUTION & AUDIT TRAIL', 58, y + 12)

      const signedIso = data.acceptedAt.toISOString()
      const signedWat = data.acceptedAt.toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'medium',
        timeStyle: 'long',
      })

      drawField(leftX, y + 30, 'Digitally Executed By', data.customerFullName)
      drawField(rightX, y + 30, 'Consent Status', 'CONFIRMED & LEGALLY BINDING')
      drawField(leftX, y + 60, 'Timestamp (WAT / UTC)', `${signedWat} (${signedIso})`, 245)
      drawField(rightX, y + 60, 'IP Address', data.ipAddress || 'Recorded via session')

      doc
        .font('Helvetica')
        .fontSize(7.2)
        .fillColor(textMuted)
        .text(
          `User-Agent: ${(data.userAgent || 'Upward Pay Client').slice(0, 120)}`,
          leftX,
          y + 92,
          { width: contentW - 28 },
        )

      // Footer
      doc
        .font('Helvetica')
        .fontSize(7.8)
        .fillColor(textMuted)
        .text(
          `Upward by Goodtenants Limited  •  ${SAVINGS_LEGAL_DEFAULTS.REGISTERED_ADDRESS}  •  hello@goodtenants.africa`,
          44,
          790,
          { width: contentW, align: 'center' },
        )

      doc.end()
    })
  }
}
