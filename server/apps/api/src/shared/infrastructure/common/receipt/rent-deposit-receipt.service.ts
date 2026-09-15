import { Injectable, Logger } from '@nestjs/common'
import PDFDocument from 'pdfkit'

export interface RentDepositReceiptData {
  receiptNumber: string
  transactionType: 'CREDIT' | 'DEBIT' | string
  source: string
  sourceLabel?: string
  amount: number
  currency: string
  reference: string
  date: Date
  tenantName: string
  tenantEmail?: string
  propertyAddress?: string
  dvaAccountNumber?: string
  dvaBankName?: string
  balanceBefore: number
  balanceAfter: number
  narration?: string
  paymentRequestReference?: string
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

function cleanDisplayName(name?: string | null, fallback = 'Tenant'): string {
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
export class RentDepositReceiptService {
  private readonly logger = new Logger(RentDepositReceiptService.name)

  async generatePdf(data: RentDepositReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const W = 460
      const HERO_H = 196
      const SCALLOP_R = 10

      const paper = '#FBF9F6'
      const ink = '#211C18'
      const inkMuted = '#8F857A'
      const inkFaint = '#C7BEB2'
      const line = '#E7E1D8'
      const clay = '#B65B37'
      const clayDeep = '#8C4327'
      const clayTint = '#F3E4DC'
      const stripe = '#F5F2ED'

      const isCredit = data.transactionType === 'CREDIT'
      const currency = data.currency || 'NGN'

      // Heights & Dynamic Layout Positioning
      const STATS_Y = HERO_H - 16
      const STATS_H = 116
      const BREAKDOWN_START_Y = STATS_Y + STATS_H + 22
      const BREAKDOWN_ROW_H = 28
      const breakdownTableH = 20 + 1 * BREAKDOWN_ROW_H + 34
      const DETAILS_START_Y = BREAKDOWN_START_Y + breakdownTableH + 20

      const propText = cleanDisplayName(data.propertyAddress, 'Address not specified')
      const propHeight = propText.length > 50 ? 28 : 16
      const detailsGridH = 24 + propHeight + 14 + 3 * 36

      const FOOTER_Y = DETAILS_START_Y + detailsGridH + 22
      const dynamicH = FOOTER_Y + 54

      const doc = new PDFDocument({
        size: [W, dynamicH],
        margin: 0,
        info: { Title: `Rent Deposit Receipt ${data.receiptNumber}` },
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

      // 3. Upward Brand Logo (Vector Icon + PWARD typography)
      const BRAND_X = 32
      const BRAND_Y = 32
      const ICON_SIZE = 22

      doc.save()
      doc.translate(BRAND_X, BRAND_Y - 3)
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
        .text('PWARD', BRAND_X + ICON_SIZE - 2, BRAND_Y)

      // Hero Subtitle
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('rgba(251,243,238,0.72)')
        .text(isCredit ? 'Deposit received' : 'Deposit applied', BRAND_X, 74)

      // Hero Amount (Formatted without broken unicode currency symbol)
      const amountPrefix = isCredit ? '+ ' : '- '
      const amountStr = `${amountPrefix}${currency} ${Number(data.amount || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`

      doc
        .font('Times-Bold')
        .fontSize(36)
        .fillColor('#FBF3EE')
        .text(amountStr, BRAND_X, 94)

      // Hero Foot: Status Pill & Date
      const statusText = isCredit ? 'Credited to balance' : 'Applied to rent'
      const PILL_W = isCredit ? 120 : 96
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

      const dateStr = formatHeroDate(data.date)
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('rgba(251,243,238,0.72)')
        .text(dateStr, BRAND_X, PILL_Y + 5.5, { width: W - 64, align: 'right' })

      // 4. Scallop Divider at bottom of Hero
      const numScallops = Math.floor(W / (SCALLOP_R * 2))
      const scallopsW = numScallops * SCALLOP_R * 2
      const scallopsStartX = (W - scallopsW) / 2
      for (let i = 0; i < numScallops; i++) {
        const cx = scallopsStartX + i * SCALLOP_R * 2 + SCALLOP_R
        doc.circle(cx, HERO_H, SCALLOP_R).fill(clayDeep)
      }

      // 5. Floating 2x2 Stats Card
      const CARD_X = 32
      const CARD_W = W - 64
      const halfW = (CARD_W - 1) / 2
      const halfH = (STATS_H - 1) / 2

      doc.save()
      doc.roundedRect(CARD_X, STATS_Y, CARD_W, STATS_H, 12).clip()

      // Fill grid separator line
      doc.rect(CARD_X, STATS_Y, CARD_W, STATS_H).fill(line)

      // Cell 1: Balance Before (Top-Left)
      doc.rect(CARD_X, STATS_Y, halfW, halfH).fill(paper)
      // Cell 2: Balance After (Top-Right)
      doc.rect(CARD_X + halfW + 1, STATS_Y, halfW, halfH).fill(paper)
      // Cell 3: This Movement (Bottom-Left - Highlighted)
      doc.rect(CARD_X, STATS_Y + halfH + 1, halfW, halfH).fill(clayTint)
      // Cell 4: Transaction Type (Bottom-Right)
      doc.rect(CARD_X + halfW + 1, STATS_Y + halfH + 1, halfW, halfH).fill(paper)

      doc.restore()

      // Content for Cell 1 (Balance before)
      doc.font('Helvetica').fontSize(9).fillColor(inkMuted).text('Balance before', CARD_X + 16, STATS_Y + 12)
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(ink)
        .text(
          `${currency} ${Number(data.balanceBefore || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          CARD_X + 16,
          STATS_Y + 28,
        )

      // Content for Cell 2 (Updated balance)
      doc.font('Helvetica').fontSize(9).fillColor(inkMuted).text('Updated balance', CARD_X + halfW + 17, STATS_Y + 12)
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(ink)
        .text(
          `${currency} ${Number(data.balanceAfter || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          CARD_X + halfW + 17,
          STATS_Y + 28,
        )

      // Content for Cell 3 (Movement - Highlighted)
      doc.font('Helvetica').fontSize(9).fillColor(inkMuted).text('This movement', CARD_X + 16, STATS_Y + halfH + 13)
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(clayDeep)
        .text(
          `${amountPrefix}${currency} ${Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          CARD_X + 16,
          STATS_Y + halfH + 29,
        )

      // Content for Cell 4 (Transaction type)
      doc.font('Helvetica').fontSize(9).fillColor(inkMuted).text('Transaction type', CARD_X + halfW + 17, STATS_Y + halfH + 13)
      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor(ink)
        .text(isCredit ? 'Deposit Credit' : 'Invoice Drawdown', CARD_X + halfW + 17, STATS_Y + halfH + 29)

      // 6. Payment Breakdown Section
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(ink)
        .text('Deposit breakdown', CARD_X, BREAKDOWN_START_Y)

      const sourceDisplay =
        data.sourceLabel ||
        (data.source === 'DVA_INFLOW'
          ? 'Virtual Account Top-Up'
          : data.source === 'OVERPAYMENT_EXCESS'
          ? 'Invoice Settlement Excess'
          : data.source === 'PR_APPLICATION'
          ? 'Applied to Rent Invoice'
          : 'Deposit Movement')

      const rowY = BREAKDOWN_START_Y + 18
      doc.roundedRect(CARD_X, rowY, CARD_W, BREAKDOWN_ROW_H - 4, 6).fill(stripe)

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(ink)
        .text(sourceDisplay, CARD_X + 12, rowY + 5, { width: 230 })

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(ink)
        .text(
          `${currency} ${Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          CARD_X + 12,
          rowY + 5,
          { width: CARD_W - 24, align: 'right' },
        )

      // Table Footer: Net movement
      const tfootY = BREAKDOWN_START_Y + 18 + 1 * BREAKDOWN_ROW_H + 4
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
        .text(isCredit ? 'Net credited to deposit' : 'Net applied to invoice', CARD_X + 12, tfootY + 8)

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(clayDeep)
        .text(
          `${amountPrefix}${currency} ${Number(data.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          CARD_X + 12,
          tfootY + 8,
          { width: CARD_W - 24, align: 'right' },
        )

      // 7. Details Section
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

      // Row 1: Tenant & Receipt No.
      doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Tenant', CARD_X, gridY)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(cleanDisplayName(data.tenantName, 'Tenant'), CARD_X, gridY + 12, { width: colW })

      doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Receipt no.', col2X, gridY)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(data.receiptNumber, col2X, gridY + 12, { width: colW })

      gridY += 34

      // Row 2: Deposit Channel & Destination/DVA
      const channelLabel = data.source === 'DVA_INFLOW' ? 'Direct Nuban (DVA)' : 'Invoice Settlement'
      doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Deposit channel', CARD_X, gridY)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(channelLabel, CARD_X, gridY + 12, { width: colW })

      const accountLabel = data.dvaAccountNumber
        ? `${data.dvaBankName || 'Wema Bank'} (${data.dvaAccountNumber})`
        : 'Rent Deposit Balance'
      doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Account destination', col2X, gridY)
      doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(accountLabel, col2X, gridY + 12, { width: colW })

      gridY += 34

      // Row 3: Reference (Full Width Courier)
      doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Payment reference', CARD_X, gridY)
      doc.font('Courier').fontSize(8.5).fillColor(ink).text(data.reference, CARD_X, gridY + 12, { width: CARD_W })

      // 8. Footer
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
        .text('This receipt confirms funds held securely in your\nUpward Rent Deposit Balance.', CARD_X, FOOTER_Y + 14, {
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
