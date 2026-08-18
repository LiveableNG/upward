import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'
import { S3Service } from '../s3/s3.service'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export interface ReceiptPdfData {
  title: string
  receiptNumber: string
  paidAt: Date
  tenantName: string
  landlordName?: string
  propertyName?: string
  propertyAddress?: string
  paymentType?: string
  amount: number
  currency: string
  reference: string
  channel: string
  type: string
  status?: string
  lineItems?: Array<{ label: string; amount: number }>
  logoUrl?: string
  brandName?: string
  themeColor?: string
  tenancyPeriod?: string
}

@Injectable()
export class ReceiptService {
  constructor(private readonly s3Service: S3Service) {}

  async generateReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
    let logoBuffer: Buffer | undefined
    if (data.logoUrl) {
      try {
        let s3Key: string | null = null
        if (data.logoUrl.includes('amazonaws.com/')) {
          s3Key = data.logoUrl.split('amazonaws.com/')[1] || null
        } else {
          const receiptSettingsMatch = data.logoUrl.match(/\/receipt-settings\/logo\/([^\/]+)\/([^\/?#]+)/)
          const emailSettingsMatch = data.logoUrl.match(/\/email-settings\/logo\/([^\/]+)\/([^\/?#]+)/)
          
          if (receiptSettingsMatch) {
            const uuid = receiptSettingsMatch[1]
            const filename = receiptSettingsMatch[2]
            s3Key = `pm/${uuid}/receipt-settings/${filename}`
          } else if (emailSettingsMatch) {
            const uuid = emailSettingsMatch[1]
            const filename = emailSettingsMatch[2]
            s3Key = `pm/${uuid}/email-settings/${filename}`
          }
        }

        console.log(`[ReceiptService] logoUrl: ${data.logoUrl}, resolved s3Key: ${s3Key}`);

        if (s3Key) {
          logoBuffer = await this.s3Service.getFileBuffer(s3Key)
          console.log(`[ReceiptService] Fetched logo from S3, buffer length: ${logoBuffer?.length}`);
        } else {
          let fetchUrl = data.logoUrl
          if (fetchUrl.includes('localhost')) {
            fetchUrl = fetchUrl.replace('localhost', '127.0.0.1')
          }
          const response = await fetch(fetchUrl)
          if (response.ok) {
            logoBuffer = Buffer.from(await response.arrayBuffer())
            console.log(`[ReceiptService] Fetched logo from fallback HTTP, buffer length: ${logoBuffer?.length}`);
          } else {
            console.error(`Failed to fetch logo: ${response.status} ${response.statusText}`)
          }
        }
      } catch (err) {
        console.error('Error fetching logo for receipt:', err)
        // Fall back to default Upward branding
      }
    }

    return this.renderReceiptPdf(data, logoBuffer)
  }

  private renderReceiptPdf(data: ReceiptPdfData, logoBuffer?: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: { Title: `Receipt ${data.receiptNumber}` },
      })

      const buffers: Buffer[] = []
      doc.on('data', (c) => buffers.push(c))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      const W = 595.28
      const H = 841.89

      const clay = data.themeColor || '#d97757'
      const dark = '#0a0a0f'
      const textSecondary = '#4a4642'
      const textMuted = '#928e89'
      const oat = '#faf9f5'
      const borderSolid = '#e2ddd7'
      const white = '#ffffff'


      doc.rect(0, 0, W, H).fill(oat)

      const HERO_H = 295
      doc.rect(0, 0, W, HERO_H).fill(clay)

      doc.save()
      doc
        .fillOpacity(0.07)
        .circle(W - 55, 55, 110)
        .fill(white)
      doc
        .fillOpacity(0.05)
        .circle(60, HERO_H - 30, 80)
        .fill(white)
      doc.restore()
      doc.fillOpacity(1)

      const BRAND_X = 36
      const BRAND_Y = 42

      const FONT_SIZE = 18
      const ICON_SIZE = 28

      const brandLabel = (data.brandName || 'Upward').toUpperCase()

      if (logoBuffer) {
        const LOGO_BOX_W = 120
        const LOGO_BOX_H = 36

        // Write the buffer to a temporary file and pass the path to PDFKit to avoid memory buffer decoding issues
        let tempFilePath: string | null = null
        try {
          const tempDir = os.tmpdir()
          tempFilePath = path.join(tempDir, `upward_logo_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`)
          fs.writeFileSync(tempFilePath, logoBuffer)

          doc.image(tempFilePath, BRAND_X, BRAND_Y - 4, { 
            fit: [LOGO_BOX_W, LOGO_BOX_H]
          })
        } catch (imageErr) {
          console.error('[ReceiptService] Error rendering logo image in PDFKit:', imageErr)
        } finally {
          if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
              fs.unlinkSync(tempFilePath)
            } catch (unlinkErr) {
              console.error('[ReceiptService] Failed to clean up temp logo file:', unlinkErr)
            }
          }
        }
      } else {
        doc.save()

        const iconOffsetY = BRAND_Y - (ICON_SIZE * 22) / 40 + 4

        doc.translate(BRAND_X, iconOffsetY)
        doc.scale(ICON_SIZE / 40)

        doc.roundedRect(7, 15, 10, 17, 5).fill(white)
        doc.roundedRect(23, 15, 10, 17, 5).fill(white)

        doc
          .moveTo(12, 30)
          .quadraticCurveTo(12, 37, 20, 37)
          .quadraticCurveTo(28, 37, 28, 30)
          .lineWidth(5.5)
          .stroke(white)

        doc.moveTo(7, 19).lineTo(20, 8).lineTo(33, 19).lineWidth(5).stroke(white)

        doc.circle(20, 5, 3).fill('#22c55e')

        doc.restore()

        doc
          .font('Helvetica-Bold')
          .fontSize(FONT_SIZE)
          .fillColor(white)
          .text(brandLabel === 'UPWARD' ? 'PWARD' : brandLabel, BRAND_X + ICON_SIZE - 1, BRAND_Y)
      }
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('rgba(255,255,255,0.6)')
        .text('Transaction Receipt', 0, BRAND_Y + 9, { width: W - 34, align: 'right' })

      const amountStr = `${data.currency} ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      doc
        .font('Helvetica-Bold')
        .fontSize(40)
        .fillColor(white)
        .text(amountStr, 0, 110, { width: W, align: 'center' })

      const isPartial = data.status === 'PARTIAL'
      const statusText = isPartial ? 'Partial Payment' : 'Successful'
      const PILL_W = isPartial ? 110 : 96
      const PILL_H = 24
      const PILL_X = (W - PILL_W) / 2
      const PILL_Y = 162
      doc.roundedRect(PILL_X, PILL_Y, PILL_W, PILL_H, 99).fill(white)
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(clay)
        .text(statusText, PILL_X, PILL_Y + 7.5, { width: PILL_W, align: 'center' })

      const dateStr =
        data.paidAt.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }) +
        '  ·  ' +
        data.paidAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('white')
        .text(dateStr, 0, 202, { width: W, align: 'center' })

      const SCALLOP_R = 13
      const numScallops = Math.floor(W / (SCALLOP_R * 2))
      const scallopsW = numScallops * SCALLOP_R * 2
      const scallopsStartX = (W - scallopsW) / 2
      const TOP_TEAR_Y = HERO_H - SCALLOP_R

      doc.rect(0, TOP_TEAR_Y, W, SCALLOP_R * 2 + 16).fill(oat)

      for (let i = 0; i < numScallops; i++) {
        const cx = scallopsStartX + i * SCALLOP_R * 2 + SCALLOP_R
        doc.circle(cx, TOP_TEAR_Y, SCALLOP_R).fill(clay)
      }

      const CARD_X = 36
      const CARD_Y = HERO_H + SCALLOP_R + 4
      const CARD_W = W - 72

      const rows: { label: string; value: string; bold?: boolean }[] = [
        { label: 'Tenant', value: data.tenantName },
        { label: 'Receipt No.', value: data.receiptNumber },
        { label: 'Channel', value: data.channel },
      ]

      const hasBreakdown = data.lineItems && data.lineItems.length > 0
      const breakdownDesc = hasBreakdown
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `${data.lineItems!.map((item: any) => `${item.label} (N${item.amount.toLocaleString()})`).join(', ')}`
        : data.propertyName || data.propertyAddress || ''

      if (data.type === 'RENT') {
        rows.push({ label: 'Property', value: data.propertyAddress || breakdownDesc })
        if (data.tenancyPeriod) {
          rows.push({ label: 'Tenancy Period', value: data.tenancyPeriod })
        }
      }
      if (data.type === 'RENT' && data.landlordName) {
        rows.push({ label: 'Recipient', value: data.landlordName })
      }
      if (data.propertyAddress && !hasBreakdown && data.type !== 'RENT') {
        rows.push({ label: 'Address', value: data.propertyAddress })
      }

      rows.push({
        label: 'Paystack Reference',
        value: data.reference,
        bold: true,
      })

      const ROW_H = 58
      const BREAKDOWN_ROW_H = 32
      const CARD_H =
        rows.length * ROW_H + (hasBreakdown ? data.lineItems!.length * BREAKDOWN_ROW_H + 50 : 16)

      doc.roundedRect(CARD_X, CARD_Y, CARD_W, CARD_H, 14).fill(white)

      rows.forEach((row, i) => {
        const rowY = CARD_Y + 8 + i * ROW_H
        const isLast = i === rows.length - 1

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(textMuted)
          .text(row.label, CARD_X + 22, rowY + 8)
        doc
          .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(12)
          .fillColor(row.bold ? dark : textSecondary)
          .text(row.value, CARD_X + 22, rowY + 23, { width: CARD_W - 44 })

        if (!isLast || hasBreakdown) {
          doc
            .moveTo(CARD_X + 22, rowY + ROW_H)
            .lineTo(CARD_X + CARD_W - 22, rowY + ROW_H)
            .strokeColor(borderSolid)
            .lineWidth(0.5)
            .stroke()
        }
      })

      if (hasBreakdown) {
        const breakdownY = CARD_Y + 8 + rows.length * ROW_H + 12
        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(dark)
          .text('PAYMENT BREAKDOWN', CARD_X + 22, breakdownY)

        data.lineItems!.forEach((item, i) => {
          const itemY = breakdownY + 20 + i * BREAKDOWN_ROW_H
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(textSecondary)
            .text(item.label, CARD_X + 22, itemY)
          doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor(dark)
            .text(
              `${data.currency} ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              CARD_X + 22,
              itemY,
              { width: CARD_W - 44, align: 'right' },
            )
        })
      }

      const BOT_TEAR_Y = CARD_Y + CARD_H - SCALLOP_R

      doc.rect(0, BOT_TEAR_Y, W, SCALLOP_R * 2 + 4).fill(oat)

      for (let i = 0; i < numScallops; i++) {
        const cx = scallopsStartX + i * SCALLOP_R * 2 + SCALLOP_R
        doc.circle(cx, BOT_TEAR_Y + SCALLOP_R * 2, SCALLOP_R).fill(white)
      }

      doc.end()
    })
  }
}
