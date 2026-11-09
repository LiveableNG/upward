import { Injectable, Logger } from '@nestjs/common'
import PDFDocument from 'pdfkit'

export interface CommerceReceiptLineItem {
  title: string
  offeringType: string
  quantity: number
  unitPriceKobo: bigint
  totalPriceKobo: bigint
}

export interface CommerceReceiptData {
  orderNumber: string
  receiptNumber: string
  customerName: string
  customerEmail?: string
  recipientName?: string
  recipientPhone?: string
  deliveryAddress: string
  deliveryNotes?: string
  paymentReference: string
  paymentChannel?: string
  paidAt: Date
  currency: string
  itemsSubtotalKobo: bigint
  deliveryFeeKobo: bigint
  discountKobo: bigint
  totalAmountKobo: bigint
  lineItems: CommerceReceiptLineItem[]
}

function formatNgnAmount(kobo: bigint | number, currency = 'NGN'): string {
  const amount = typeof kobo === 'bigint' ? Number(kobo) / 100 : Number(kobo)
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
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

@Injectable()
export class CommerceReceiptService {
  private readonly logger = new Logger(CommerceReceiptService.name)

  async generateReceiptPdf(data: CommerceReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const W = 460
        const HERO_H = 196
        const SCALLOP_R = 10

        const clay = '#B65B37'
        const clayDeep = '#8C4327'
        const clayTint = '#F3E4DC'
        const paper = '#FBF9F6'
        const stripe = '#F5F2ED'
        const ink = '#211C18'
        const inkMuted = '#8F857A'
        const inkFaint = '#C7BEB2'
        const line = '#E7E1D8'
        const emerald = '#059669'

        const CARD_X = 32
        const CARD_W = W - 64

        // Layout Calculations
        const STATS_Y = HERO_H - 16
        const STATS_H = 116
        const BREAKDOWN_START_Y = STATS_Y + STATS_H + 24
        const ROW_H = 38
        const hasDiscount = data.discountKobo > 0n
        const breakdownRowsCount = data.lineItems.length + (hasDiscount ? 1 : 0)
        const breakdownTableH = 22 + breakdownRowsCount * ROW_H + 34

        const DETAILS_START_Y = BREAKDOWN_START_Y + breakdownTableH + 22

        // Delivery Box height calculation
        const deliveryText = data.deliveryAddress || 'Address not specified'
        const estimatedAddressLines = Math.max(1, Math.ceil(deliveryText.length / 54))
        const addressTextH = estimatedAddressLines * 13
        const deliveryBoxH = 36 + addressTextH + 12

        // Details 2-Column Grid height (Row 1: order/receipt, Row 2: billedTo/channel, Row 3: reference)
        const detailsGridH = 2 * 38 + 30

        // Footer
        const FOOTER_Y = DETAILS_START_Y + 18 + deliveryBoxH + 16 + detailsGridH + 16
        const dynamicH = FOOTER_Y + 54

        const doc = new PDFDocument({
          size: [W, dynamicH],
          margin: 0,
          info: {
            Title: `Receipt ${data.receiptNumber}`,
            Author: 'Upward Platform',
            Subject: `Commerce Order Receipt ${data.orderNumber}`,
          },
        })

        const buffers: Buffer[] = []
        doc.on('data', (c) => buffers.push(c))
        doc.on('end', () => resolve(Buffer.concat(buffers)))
        doc.on('error', (err) => reject(err))

        // 1. Base Paper Background
        doc.rect(0, 0, W, dynamicH).fill(paper)

        // 2. Hero Header Background (Linear Gradient)
        const grad = doc.linearGradient(0, 0, W, HERO_H)
        grad.stop(0, clay)
        grad.stop(1, clayDeep)
        doc.rect(0, 0, W, HERO_H).fill(grad)

        // 3. Upward Brand Logo (Vector Icon + UPWARD COMMERCE & LIFESTYLE typography)
        const BRAND_X = 32
        const BRAND_Y = 28
        const ICON_SIZE = 22

        doc.save()
        doc.translate(BRAND_X, BRAND_Y - 3)
        doc.scale(ICON_SIZE / 40)

        // Left & Right Pillars
        doc.roundedRect(7, 15, 10, 17, 5).fill('#FBF3EE')
        doc.roundedRect(23, 15, 10, 17, 5).fill('#FBF3EE')

        // Bottom Arc
        doc
          .moveTo(12, 30)
          .quadraticCurveTo(12, 37, 20, 37)
          .quadraticCurveTo(28, 37, 28, 30)
          .lineWidth(5.5)
          .stroke('#FBF3EE')

        // Roof Gable
        doc.moveTo(7, 19).lineTo(20, 8).lineTo(33, 19).lineWidth(5).stroke('#FBF3EE')
        // Apex Green Accent Dot
        doc.circle(20, 5, 3.2).fill('#22C55E')
        doc.restore()

        // Brand Name & Sub-Brand
        doc
          .font('Helvetica-Bold')
          .fontSize(15)
          .fillColor('#FBF3EE')
          .text('UPWARD', BRAND_X + ICON_SIZE + 8, BRAND_Y - 2)

        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('rgba(251,243,238,0.78)')
          .text('COMMERCE & LIFESTYLE', BRAND_X + ICON_SIZE + 9, BRAND_Y + 14)

        // Hero: "Total amount paid"
        doc
          .font('Helvetica')
          .fontSize(10.5)
          .fillColor('rgba(251,243,238,0.72)')
          .text('Total amount paid', BRAND_X, 74)

        // Hero Amount (Times-Bold)
        const totalFormatted = formatNgnAmount(data.totalAmountKobo, data.currency)
        doc
          .font('Times-Bold')
          .fontSize(32)
          .fillColor('#FBF3EE')
          .text(totalFormatted, BRAND_X, 94)

        // Hero Foot: Status Pill & Time
        const PILL_W = 104
        const PILL_H = 22
        const PILL_Y = 148

        doc.save()
        doc.roundedRect(BRAND_X, PILL_Y, PILL_W, PILL_H, 11)
        doc.fillOpacity(0.18).fill('#FBF3EE')
        doc.restore()

        doc.save()
        doc.roundedRect(BRAND_X, PILL_Y, PILL_W, PILL_H, 11)
        doc.lineWidth(0.75).strokeOpacity(0.35).stroke('#FBF3EE')
        doc.restore()

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor('#FBF3EE')
          .text('PAID & VERIFIED', BRAND_X, PILL_Y + 6, { width: PILL_W, align: 'center' })

        const dateStr = formatHeroDate(data.paidAt)
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('rgba(251,243,238,0.75)')
          .text(dateStr, BRAND_X, PILL_Y + 6, { width: W - 64, align: 'right' })

        // 4. Scallop Divider
        const numScallops = Math.floor(W / (SCALLOP_R * 2))
        const scallopsW = numScallops * SCALLOP_R * 2
        const scallopsStartX = (W - scallopsW) / 2
        for (let i = 0; i < numScallops; i++) {
          const cx = scallopsStartX + i * SCALLOP_R * 2 + SCALLOP_R
          doc.circle(cx, HERO_H, SCALLOP_R).fill(clayDeep)
        }

        // 5. Floating 2x2 Stats Card
        const halfW = (CARD_W - 1) / 2
        const halfH = (STATS_H - 1) / 2

        doc.save()
        doc.roundedRect(CARD_X, STATS_Y, CARD_W, STATS_H, 12).clip()

        // Border line grid
        doc.rect(CARD_X, STATS_Y, CARD_W, STATS_H).fill(line)

        // Quadrants
        doc.rect(CARD_X, STATS_Y, halfW, halfH).fill(paper)
        doc.rect(CARD_X + halfW + 1, STATS_Y, halfW, halfH).fill(paper)
        doc.rect(CARD_X, STATS_Y + halfH + 1, halfW, halfH).fill(clayTint)
        doc.rect(CARD_X + halfW + 1, STATS_Y + halfH + 1, halfW, halfH).fill(paper)

        doc.restore()

        // Cell 1: Items Subtotal
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Items subtotal', CARD_X + 16, STATS_Y + 12)
        doc
          .font('Helvetica-Bold')
          .fontSize(12.5)
          .fillColor(ink)
          .text(formatNgnAmount(data.itemsSubtotalKobo, data.currency), CARD_X + 16, STATS_Y + 28)

        // Cell 2: Delivery & Logistics
        const deliveryDisplay =
          data.deliveryFeeKobo > 0n
            ? formatNgnAmount(data.deliveryFeeKobo, data.currency)
            : 'Free'
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(inkMuted)
          .text('Delivery & logistics', CARD_X + halfW + 17, STATS_Y + 12)
        doc
          .font('Helvetica-Bold')
          .fontSize(12.5)
          .fillColor(data.deliveryFeeKobo > 0n ? ink : emerald)
          .text(deliveryDisplay, CARD_X + halfW + 17, STATS_Y + 28)

        // Cell 3: Total Paid (Highlighted in clayTint)
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Total paid', CARD_X + 16, STATS_Y + halfH + 13)
        doc
          .font('Helvetica-Bold')
          .fontSize(12.5)
          .fillColor(clayDeep)
          .text(totalFormatted, CARD_X + 16, STATS_Y + halfH + 29)

        // Cell 4: Balance Remaining
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(inkMuted)
          .text('Balance remaining', CARD_X + halfW + 17, STATS_Y + halfH + 13)
        doc
          .font('Helvetica-Bold')
          .fontSize(12.5)
          .fillColor(ink)
          .text(`${data.currency} 0.00`, CARD_X + halfW + 17, STATS_Y + halfH + 29)

        // 6. Order Items Breakdown Section
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(ink)
          .text('Order items & specifications', CARD_X, BREAKDOWN_START_Y)

        let itemY = BREAKDOWN_START_Y + 18
        data.lineItems.forEach((item, index) => {
          const rowY = itemY + index * ROW_H

          if (index % 2 === 0) {
            doc.roundedRect(CARD_X, rowY, CARD_W, ROW_H - 4, 6).fill(stripe)
          }

          // Title
          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(ink)
            .text(item.title, CARD_X + 12, rowY + 5, { width: CARD_W - 120, lineBreak: false })

          // Subtitle / Specifications
          const unitFormatted = formatNgnAmount(item.unitPriceKobo, data.currency)
          const typeLabel = (item.offeringType || 'PRODUCT').toUpperCase()
          doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor(inkMuted)
            .text(`${typeLabel} · Qty: ${item.quantity} × ${unitFormatted}`, CARD_X + 12, rowY + 19)

          // Line Total
          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(ink)
            .text(formatNgnAmount(item.totalPriceKobo, data.currency), CARD_X + 12, rowY + 11, {
              width: CARD_W - 24,
              align: 'right',
            })
        })

        itemY += data.lineItems.length * ROW_H

        if (hasDiscount) {
          const discY = itemY
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor(emerald)
            .text('Platform Discount', CARD_X + 12, discY + 6)
          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(emerald)
            .text(`-${formatNgnAmount(data.discountKobo, data.currency)}`, CARD_X + 12, discY + 6, {
              width: CARD_W - 24,
              align: 'right',
            })
          itemY += ROW_H
        }

        // Breakdown Table Footer: Total Paid
        const tfootY = itemY + 4
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
          .text('Total paid', CARD_X + 12, tfootY + 9)

        doc
          .font('Helvetica-Bold')
          .fontSize(11.5)
          .fillColor(clayDeep)
          .text(totalFormatted, CARD_X + 12, tfootY + 9, {
            width: CARD_W - 24,
            align: 'right',
          })

        // 7. Order Details Section
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor(ink)
          .text('Order details', CARD_X, DETAILS_START_Y)

        // Delivery Destination Card
        const deliveryCardY = DETAILS_START_Y + 18
        doc
          .roundedRect(CARD_X, deliveryCardY, CARD_W, deliveryBoxH, 8)
          .fillAndStroke('#FFFFFF', line)

        const recipient = data.recipientName || data.customerName
        const phone = data.recipientPhone ? ` · ${data.recipientPhone}` : ''

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(inkMuted)
          .text('DELIVERY DESTINATION', CARD_X + 12, deliveryCardY + 9)

        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(ink)
          .text(`${recipient}${phone}`, CARD_X + 12, deliveryCardY + 21, { width: CARD_W - 24 })

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(inkMuted)
          .text(deliveryText, CARD_X + 12, deliveryCardY + 36, {
            width: CARD_W - 24,
            lineGap: 2,
          })

        // 2-Column Details Grid
        let gridY = deliveryCardY + deliveryBoxH + 16
        const colW = (CARD_W - 16) / 2
        const col2X = CARD_X + colW + 16

        // Row 1: Order Number & Receipt Number
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Order number', CARD_X, gridY)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ink).text(data.orderNumber, CARD_X, gridY + 12, { width: colW })

        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Receipt no.', col2X, gridY)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ink).text(data.receiptNumber, col2X, gridY + 12, { width: colW })

        gridY += 38

        // Row 2: Billed To & Payment Channel
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Billed to', CARD_X, gridY)
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(ink).text(data.customerName, CARD_X, gridY + 12, { width: colW })
        if (data.customerEmail) {
          doc.font('Helvetica').fontSize(8).fillColor(inkMuted).text(data.customerEmail, CARD_X, gridY + 24, { width: colW })
        }

        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Payment channel', col2X, gridY)
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(ink)
          .text(data.paymentChannel || 'Paystack Central Checkout', col2X, gridY + 12, { width: colW })

        gridY += 38

        // Row 3: Payment Reference (Full Width)
        doc.font('Helvetica').fontSize(8.5).fillColor(inkMuted).text('Payment reference', CARD_X, gridY)
        doc.font('Courier').fontSize(8.5).fillColor(ink).text(data.paymentReference, CARD_X, gridY + 12, { width: CARD_W })

        // 8. Footer
        doc
          .moveTo(CARD_X, FOOTER_Y)
          .lineTo(CARD_X + CARD_W, FOOTER_Y)
          .lineWidth(1)
          .strokeColor(line)
          .stroke()

        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(inkFaint)
          .text(
            'This receipt confirms a verified purchase through the Upward platform.\nFor inquiries or dispute arbitration, email hello@goodtenants.africa',
            CARD_X,
            FOOTER_Y + 14,
            { lineGap: 2 },
          )

        doc
          .font('Helvetica-Bold')
          .fontSize(9)
          .fillColor(inkFaint)
          .text('UPWARD', CARD_X, FOOTER_Y + 16, { width: CARD_W, align: 'right' })

        doc.end()
      } catch (err) {
        this.logger.error('Failed to generate commerce PDF receipt', err)
        reject(err)
      }
    })
  }
}
