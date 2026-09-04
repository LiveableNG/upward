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
  lineItems?: Array<{ label: string; amount: number; totalAmount?: number; amountPaid?: number; status?: string }>
  logoUrl?: string
  brandName?: string
  themeColor?: string
  tenancyPeriod?: string
  rentStartDate?: Date
  rentEndDate?: Date
  isPartial?: boolean
  rentAmount?: number
  totalInvoiceAmount?: number
  totalPaidToDate?: number
  remainingBalance?: number
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }
  if (clean.length !== 6) {
    return { r: 182, g: 91, b: 55 }
  }
  const num = parseInt(clean, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function getPdfThemeColors(themeColor?: string) {
  if (!themeColor || themeColor.toLowerCase() === '#b65b37') {
    return {
      clay: '#B65B37',
      clayDeep: '#8C4327',
      clayTint: '#F3E4DC',
      stripe: '#F5F2ED',
    }
  }
  const { r, g, b } = parseHexColor(themeColor)
  const deepR = Math.max(0, Math.round(r * 0.76))
  const deepG = Math.max(0, Math.round(g * 0.76))
  const deepB = Math.max(0, Math.round(b * 0.76))

  const tintR = Math.min(255, Math.round(r + (255 - r) * 0.85))
  const tintG = Math.min(255, Math.round(g + (255 - g) * 0.85))
  const tintB = Math.min(255, Math.round(b + (255 - b) * 0.85))

  const stripeR = Math.min(255, Math.round(r + (255 - r) * 0.95))
  const stripeG = Math.min(255, Math.round(g + (255 - g) * 0.95))
  const stripeB = Math.min(255, Math.round(b + (255 - b) * 0.95))

  const toHex = (n: number) => n.toString(16).padStart(2, '0')

  return {
    clay: themeColor,
    clayDeep: `#${toHex(deepR)}${toHex(deepG)}${toHex(deepB)}`,
    clayTint: `#${toHex(tintR)}${toHex(tintG)}${toHex(tintB)}`,
    stripe: `#${toHex(stripeR)}${toHex(stripeG)}${toHex(stripeB)}`,
  }
}

function formatHeroDate(date: Date): string {
  try {
    const d = new Date(date)
    const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' })
    const day = d.getDate()
    const month = d.toLocaleDateString('en-GB', { month: 'short' })
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${dayName}, ${day} ${month} ${year} · ${hours}:${minutes}`
  } catch {
    return String(date)
  }
}

function cleanDisplayName(name?: string | null, fallback = 'Upward'): string {
  if (!name) return fallback
  const trimmed = name.trim()
  if (trimmed === 'account_name' || trimmed === 'accountName') return fallback
  if (trimmed.includes(':') && /^[0-9a-fA-F]{16,}:/.test(trimmed)) {
    return fallback
  }
  if (/^[0-9a-fA-F]{32,}$/.test(trimmed)) {
    return fallback
  }
  return trimmed
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

        if (s3Key) {
          logoBuffer = await this.s3Service.getFileBuffer(s3Key)
        } else {
          let fetchUrl = data.logoUrl
          if (fetchUrl.includes('localhost')) {
            fetchUrl = fetchUrl.replace('localhost', '127.0.0.1')
          }
          const response = await fetch(fetchUrl)
          if (response.ok) {
            logoBuffer = Buffer.from(await response.arrayBuffer())
          }
        }
      } catch (err) {
        console.error('Error fetching logo for receipt:', err)
      }
    }

    return this.renderReceiptPdf(data, logoBuffer)
  }

  private renderReceiptPdf(data: ReceiptPdfData, logoBuffer?: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const W = 460
      const HERO_H = 196
      const SCALLOP_R = 10

      const colors = getPdfThemeColors(data.themeColor)
      const paper = '#FBF9F6'
      const ink = '#211C18'
      const inkMuted = '#8F857A'
      const inkFaint = '#C7BEB2'
      const line = '#E7E1D8'
      const clay = colors.clay
      const clayDeep = colors.clayDeep
      const clayTint = colors.clayTint
      const stripe = colors.stripe

      const isPartial =
        data.status === 'PARTIAL' ||
        data.isPartial ||
        (data.remainingBalance !== undefined && data.remainingBalance > 0)

      const totalRent = data.rentAmount || data.totalInvoiceAmount || data.amount
      const totalPaid = data.totalPaidToDate || data.amount
      const balanceRemaining =
        data.remainingBalance !== undefined
          ? Math.max(0, data.remainingBalance)
          : Math.max(0, (data.totalInvoiceAmount || totalRent) - totalPaid)

      const breakdownItems =
        data.lineItems && data.lineItems.length > 0
          ? [...data.lineItems].sort((a, b) => {
              const aIsRent = (a.label || '').toLowerCase().includes('rent')
              const bIsRent = (b.label || '').toLowerCase().includes('rent')
              if (aIsRent && !bIsRent) return -1
              if (!aIsRent && bIsRent) return 1
              return 0
            })
          : [
              {
                label: data.paymentType || 'Rent',
                amount: data.amount,
              },
            ]

      // Compute dynamic height
      const STATS_Y = HERO_H - 16
      const STATS_H = 116
      const BREAKDOWN_START_Y = STATS_Y + STATS_H + 22
      const BREAKDOWN_ROW_H = 28
      const breakdownTableH = 20 + breakdownItems.length * BREAKDOWN_ROW_H + 34
      const DETAILS_START_Y = BREAKDOWN_START_Y + breakdownTableH + 20

      // Details estimation
      const propText = data.propertyAddress || data.propertyName || 'Address not specified'
      const propHeight = propText.length > 50 ? 28 : 16
      const detailsRowsCount = data.tenancyPeriod ? 3 : 3
      const detailsGridH = 24 + propHeight + 14 + detailsRowsCount * 36

      const FOOTER_Y = DETAILS_START_Y + detailsGridH + 22
      const dynamicH = FOOTER_Y + 54

      const doc = new PDFDocument({
        size: [W, dynamicH],
        margin: 0,
        info: { Title: `Receipt ${data.receiptNumber}` },
      })

      const buffers: Buffer[] = []
      doc.on('data', (c) => buffers.push(c))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)

      // 1. Base Paper Background
      doc.rect(0, 0, W, dynamicH).fill(paper)

      // 2. Hero Header Background (Linear Gradient)
      const grad = doc.linearGradient(0, 0, W, HERO_H)
      grad.stop(0, clay)
      grad.stop(1, clayDeep)
      doc.rect(0, 0, W, HERO_H).fill(grad)

      // Brand Logo / Icon in Hero
      const BRAND_X = 32
      const BRAND_Y = 32

      if (logoBuffer) {
        let tempFilePath: string | null = null
        try {
          const tempDir = os.tmpdir()
          tempFilePath = path.join(
            tempDir,
            `upward_logo_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`,
          )
          fs.writeFileSync(tempFilePath, logoBuffer)
          doc.image(tempFilePath, BRAND_X, BRAND_Y - 4, {
            fit: [120, 26],
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
        // Draw Upward Logo Icon & Brand Name
        const brandName = cleanDisplayName(data.brandName, 'Upward')
        const isUpwardBranding = brandName.toUpperCase() === 'UPWARD'

        if (isUpwardBranding) {
          const ICON_SIZE = 24
          const iconOffsetY = BRAND_Y - (ICON_SIZE * 22) / 40 + 2

          doc.save()
          doc.translate(BRAND_X, iconOffsetY)
          doc.scale(ICON_SIZE / 40)

          doc.roundedRect(7, 15, 10, 17, 5).fill('#FBF3EE')
          doc.roundedRect(23, 15, 10, 17, 5).fill('#FBF3EE')

          doc
            .moveTo(12, 30)
            .quadraticCurveTo(12, 37, 20, 37)
            .quadraticCurveTo(28, 37, 28, 30)
            .lineWidth(5.5)
            .stroke('#FBF3EE')

          doc.moveTo(7, 19).lineTo(20, 8).lineTo(33, 19).lineWidth(5).stroke('#FBF3EE')
          doc.circle(20, 5, 3).fill('#22c55e')
          doc.restore()

          doc
            .font('Helvetica-Bold')
            .fontSize(14)
            .fillColor('#FBF3EE')
            .text('PWARD', BRAND_X + ICON_SIZE - 2, BRAND_Y + 1)
        } else {
          // Custom Landlord Brand Name without uploaded logo image
          doc
            .font('Helvetica-Bold')
            .fontSize(14)
            .fillColor('#FBF3EE')
            .text(brandName, BRAND_X, BRAND_Y + 1)
        }
      }

      // Hero: "Amount received"
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('rgba(251,243,238,0.72)')
        .text('Amount received', BRAND_X, 74)

      // Hero Amount (Serif)
      const amountStr = `${data.currency} ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      doc
        .font('Times-Bold')
        .fontSize(36)
        .fillColor('#FBF3EE')
        .text(amountStr, BRAND_X, 94)

      // Hero Foot: Status Pill & Time
      const statusText = isPartial ? 'Partial payment' : 'Paid in full'
      const PILL_W = isPartial ? 98 : 82
      const PILL_H = 22
      const PILL_Y = 150

      doc.save()
      doc.roundedRect(BRAND_X, PILL_Y, PILL_W, PILL_H, 11)
      doc.fillOpacity(0.18).fill('#FBF3EE')
      doc.restore()

      doc.save()
      doc.roundedRect(BRAND_X, PILL_Y, PILL_W, PILL_H, 11)
      doc.lineWidth(0.75).strokeOpacity(0.35).stroke('#FBF3EE')
      doc.restore()

      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor('#FBF3EE')
        .text(statusText, BRAND_X, PILL_Y + 5.5, { width: PILL_W, align: 'center' })

      const dateStr = formatHeroDate(data.paidAt)
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('rgba(251,243,238,0.72)')
        .text(dateStr, BRAND_X, PILL_Y + 5.5, { width: W - 64, align: 'right' })

      // 3. Scallop Divider at bottom of Hero
      const numScallops = Math.floor(W / (SCALLOP_R * 2))
      const scallopsW = numScallops * SCALLOP_R * 2
      const scallopsStartX = (W - scallopsW) / 2
      for (let i = 0; i < numScallops; i++) {
        const cx = scallopsStartX + i * SCALLOP_R * 2 + SCALLOP_R
        doc.circle(cx, HERO_H, SCALLOP_R).fill(clayDeep)
      }

      // 4. Floating 2x2 Stats Card
      const CARD_X = 32
      const CARD_W = W - 64
      const halfW = (CARD_W - 1) / 2
      const halfH = (STATS_H - 1) / 2

      doc.save()
      doc.roundedRect(CARD_X, STATS_Y, CARD_W, STATS_H, 12).clip()

      // Fill grid separator line
      doc.rect(CARD_X, STATS_Y, CARD_W, STATS_H).fill(line)

      // Cell 1: Total Rent (Top-Left)
      doc.rect(CARD_X, STATS_Y, halfW, halfH).fill(paper)
      // Cell 2: Paid So Far (Top-Right)
      doc.rect(CARD_X + halfW + 1, STATS_Y, halfW, halfH).fill(paper)
      // Cell 3: This Payment (Bottom-Left - Highlighted)
      doc.rect(CARD_X, STATS_Y + halfH + 1, halfW, halfH).fill(clayTint)
      // Cell 4: Balance Remaining (Bottom-Right)
      doc.rect(CARD_X + halfW + 1, STATS_Y + halfH + 1, halfW, halfH).fill(paper)

      doc.restore()

      // Content for Cell 1 (Total Rent)
      doc.font('Helvetica').fontSize(9).fillColor(inkMuted).text('Total rent', CARD_X + 16, STATS_Y + 12)
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(ink)
        .text(
          `${data.currency} ${totalRent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          CARD_X + 16,
          STATS_Y + 28,
        )

      // Content for Cell 2 (Paid so far)
      doc.font('Helvetica').fontSize(9).fillColor(inkMuted).text('Paid so far', CARD_X + halfW + 17, STATS_Y + 12)
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(ink)
        .text(
          `${data.currency} ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          CARD_X + halfW + 17,
          STATS_Y + 28,
        )

      // Content for Cell 3 (This payment - Highlighted)
      doc.font('Helvetica').fontSize(9).fillColor(inkMuted).text('This payment', CARD_X + 16, STATS_Y + halfH + 13)
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(clayDeep)
        .text(
          `${data.currency} ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          CARD_X + 16,
          STATS_Y + halfH + 29,
        )

      // Content for Cell 4 (Balance remaining)
      doc.font('Helvetica').fontSize(9).fillColor(inkMuted).text('Balance remaining', CARD_X + halfW + 17, STATS_Y + halfH + 13)
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(ink)
        .text(
          `${data.currency} ${balanceRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          CARD_X + halfW + 17,
          STATS_Y + halfH + 29,
        )

      // 5. Payment Breakdown Section
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(ink)
        .text('Payment breakdown', CARD_X, BREAKDOWN_START_Y)

      breakdownItems.forEach((item, i) => {
        const rowY = BREAKDOWN_START_Y + 18 + i * BREAKDOWN_ROW_H

        if (i % 2 === 0) {
          doc.roundedRect(CARD_X, rowY, CARD_W, BREAKDOWN_ROW_H - 4, 6).fill(stripe)
        }

        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(ink)
          .text(item.label, CARD_X + 12, rowY + 5, { width: 230 })

        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(ink)
          .text(
            `${data.currency} ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            CARD_X + 12,
            rowY + 5,
            { width: CARD_W - 24, align: 'right' },
          )
      })

      // Breakdown Table Footer: "This payment"
      const tfootY = BREAKDOWN_START_Y + 18 + breakdownItems.length * BREAKDOWN_ROW_H + 4
      doc
        .moveTo(CARD_X, tfootY)
        .lineTo(CARD_X + CARD_W, tfootY)
        .lineWidth(1)
        .strokeColor(line)
        .stroke()

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(ink)
        .text('This payment', CARD_X + 12, tfootY + 8)

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(clayDeep)
        .text(
          `${data.currency} ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          CARD_X + 12,
          tfootY + 8,
          { width: CARD_W - 24, align: 'right' },
        )

      // 6. Details Section
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(ink)
        .text('Details', CARD_X, DETAILS_START_Y)

      // Property (Full Width)
      const propY = DETAILS_START_Y + 18
      doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Property', CARD_X, propY)
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(ink)
        .text(propText, CARD_X, propY + 12, { width: CARD_W })

      let gridY = propY + 12 + propHeight + 12

      // 2-Column Details Grid
      const colW = (CARD_W - 16) / 2
      const col2X = CARD_X + colW + 16

      // Row 1: Rental Period & Receipt No.
      if (data.tenancyPeriod) {
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Rental period', CARD_X, gridY)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(data.tenancyPeriod, CARD_X, gridY + 12, { width: colW })

        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Receipt no.', col2X, gridY)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(data.receiptNumber, col2X, gridY + 12, { width: colW })
      } else {
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Receipt no.', CARD_X, gridY)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(data.receiptNumber, CARD_X, gridY + 12, { width: colW })

        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Payment channel', col2X, gridY)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(data.channel || 'Paystack', col2X, gridY + 12, { width: colW })
      }

      gridY += 34

      // Row 2: Tenant & Landlord
      doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Tenant', CARD_X, gridY)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(data.tenantName, CARD_X, gridY + 12, { width: colW })

      doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Recipient / Landlord', col2X, gridY)
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(ink)
        .text(data.landlordName || 'Landlord', col2X, gridY + 12, { width: colW })

      gridY += 34

      // Row 3: Payment channel & Reference
      if (data.tenancyPeriod) {
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Payment channel', CARD_X, gridY)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(data.channel || 'Paystack', CARD_X, gridY + 12, { width: colW })

        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Reference', col2X, gridY)
        doc.font('Courier').fontSize(8.5).fillColor(ink).text(data.reference, col2X, gridY + 12, { width: colW })
      } else {
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Reference', CARD_X, gridY)
        doc.font('Courier').fontSize(8.5).fillColor(ink).text(data.reference, CARD_X, gridY + 12, { width: CARD_W })
      }

      // 7. Footer
      doc
        .moveTo(CARD_X, FOOTER_Y)
        .lineTo(CARD_X + CARD_W, FOOTER_Y)
        .lineWidth(1)
        .strokeColor(line)
        .stroke()

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(inkFaint)
        .text('This receipt confirms a payment made through\nthe Upward platform.', CARD_X, FOOTER_Y + 14, {
          lineGap: 2,
        })

      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(inkFaint)
        .text('UPWARD', CARD_X, FOOTER_Y + 18, { width: CARD_W, align: 'right' })

      doc.end()
    })
  }
}
