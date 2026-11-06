import { Injectable, Logger } from '@nestjs/common'
import PDFDocument from 'pdfkit'
import * as fs from 'fs'
import * as path from 'path'

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
  deliveryAddress: string
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

function formatKoboToNgn(kobo: bigint, currency = 'NGN'): string {
  const amount = Number(kobo) / 100
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(date: Date): string {
  try {
    const d = new Date(date)
    return d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `Receipt ${data.receiptNumber}`,
            Author: 'Upward Platform',
            Subject: `Commerce Order Receipt ${data.orderNumber}`,
          },
        })

        const chunks: Buffer[] = []
        doc.on('data', (chunk) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', (err) => reject(err))

        // Colors
        const clay = '#B65B37'
        const dark = '#1E1B18'
        const muted = '#666666'
        const border = '#E5E2DC'
        const bgStripe = '#F9F8F6'

        // 1. Header Banner
        doc.rect(0, 0, 595.28, 8).fill(clay)

        // Brand Title
        doc.font('Helvetica-Bold').fontSize(22).fillColor(clay).text('UPWARD', 40, 36)
        doc.font('Helvetica').fontSize(10).fillColor(muted).text('COMMERCE & LIFESTYLE', 40, 62)

        // Receipt Pill on Right
        doc
          .roundedRect(415, 34, 140, 26, 4)
          .fillAndStroke('#EBF8F2', '#A7F3D0')
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#065F46')
          .text('PAID & VERIFIED', 415, 41, { width: 140, align: 'center' })

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(muted)
          .text(`Receipt: ${data.receiptNumber}`, 355, 68, { width: 200, align: 'right' })

        // Horizontal Rule
        doc.moveTo(40, 88).lineTo(555, 88).strokeColor(border).lineWidth(1).stroke()

        // 2. Metadata Columns (Customer & Order Info)
        const topY = 104
        doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text('BILLED TO', 40, topY)
        doc.font('Helvetica-Bold').fontSize(11).fillColor(dark).text(data.customerName, 40, topY + 16)
        if (data.customerEmail) {
          doc.font('Helvetica').fontSize(9).fillColor(muted).text(data.customerEmail, 40, topY + 32)
        }

        doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text('DELIVERY / SERVICE ADDRESS', 200, topY)
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(muted)
          .text(data.deliveryAddress, 200, topY + 16, { width: 160 })

        doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text('ORDER DETAILS', 390, topY)
        doc.font('Helvetica').fontSize(9).fillColor(muted).text(`Order Number: ${data.orderNumber}`, 390, topY + 16)
        doc.font('Helvetica').fontSize(9).fillColor(muted).text(`Date: ${formatDate(data.paidAt)}`, 390, topY + 30)
        doc.font('Helvetica').fontSize(9).fillColor(muted).text(`Ref: ${data.paymentReference}`, 390, topY + 44)
        if (data.paymentChannel) {
          doc.font('Helvetica').fontSize(9).fillColor(muted).text(`Payment Via: ${data.paymentChannel}`, 390, topY + 58)
        }

        // 3. Line Items Table
        const tableY = topY + 86
        doc.rect(40, tableY, 515, 24).fill('#F3E4DC')
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#8C4327')
        doc.text('ITEM & SPECIFICATION', 48, tableY + 7, { width: 250 })
        doc.text('TYPE', 300, tableY + 7, { width: 70 })
        doc.text('QTY', 375, tableY + 7, { width: 40, align: 'center' })
        doc.text('UNIT PRICE', 420, tableY + 7, { width: 60, align: 'right' })
        doc.text('TOTAL', 485, tableY + 7, { width: 65, align: 'right' })

        let currentY = tableY + 24
        data.lineItems.forEach((item, index) => {
          const isEven = index % 2 === 0
          if (isEven) {
            doc.rect(40, currentY, 515, 26).fill(bgStripe)
          }

          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(dark)
          doc.text(item.title, 48, currentY + 7, { width: 245, lineBreak: false })

          doc.font('Helvetica').fontSize(8.5).fillColor(muted)
          doc.text(item.offeringType, 300, currentY + 8, { width: 70 })

          doc.font('Helvetica').fontSize(9).fillColor(dark)
          doc.text(String(item.quantity), 375, currentY + 7, { width: 40, align: 'center' })

          doc.text(formatKoboToNgn(item.unitPriceKobo, data.currency), 420, currentY + 7, { width: 60, align: 'right' })
          doc.text(formatKoboToNgn(item.totalPriceKobo, data.currency), 485, currentY + 7, { width: 65, align: 'right' })

          currentY += 26
        })

        // Separator line
        doc.moveTo(40, currentY).lineTo(555, currentY).strokeColor(border).lineWidth(1).stroke()

        // 4. Totals Breakdown Card (on right)
        currentY += 16
        const totalsX = 340
        const totalsWidth = 215

        doc.font('Helvetica').fontSize(9.5).fillColor(muted)
        doc.text('Items Subtotal:', totalsX, currentY)
        doc.text(formatKoboToNgn(data.itemsSubtotalKobo, data.currency), totalsX, currentY, { width: totalsWidth, align: 'right' })

        currentY += 18
        doc.text('Delivery Fee:', totalsX, currentY)
        doc.text(formatKoboToNgn(data.deliveryFeeKobo, data.currency), totalsX, currentY, { width: totalsWidth, align: 'right' })

        if (data.discountKobo > 0n) {
          currentY += 18
          doc.fillColor('#059669').text('Platform Discount:', totalsX, currentY)
          doc.text(`-${formatKoboToNgn(data.discountKobo, data.currency)}`, totalsX, currentY, { width: totalsWidth, align: 'right' })
        }

        currentY += 22
        // Total Box
        doc.roundedRect(totalsX - 10, currentY - 6, totalsWidth + 20, 32, 4).fill(clay)
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#FFFFFF').text('Total Paid:', totalsX, currentY + 3)
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF').text(formatKoboToNgn(data.totalAmountKobo, data.currency), totalsX, currentY + 3, {
          width: totalsWidth,
          align: 'right',
        })

        // 5. Upward Guarantee & Protection Box (on left)
        const guaranteeY = currentY - 48
        doc.roundedRect(40, guaranteeY, 270, 72, 6).fillAndStroke('#FAF8F6', border)
        doc.font('Helvetica-Bold').fontSize(10).fillColor(clay).text('UPWARD BUYER PROTECTION', 52, guaranteeY + 12)
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(muted)
          .text(
            'This order is backed by Upward Platform. All funds are centrally held until delivery and service sign-off are verified.',
            52,
            guaranteeY + 28,
            { width: 246, lineGap: 2 },
          )

        // 6. Footer Notice
        const footerY = 740
        doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(border).lineWidth(1).stroke()
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#888888')
          .text(
            'This is an official commercial receipt issued by Upward Platform. For customer support, inquiries, or dispute arbitrations, please email support@upward.ng or contact our 24/7 support team.',
            40,
            footerY + 10,
            { width: 515, align: 'center', lineGap: 3 },
          )

        doc.end()
      } catch (err) {
        this.logger.error('Failed to generate commerce PDF receipt', err)
        reject(err)
      }
    })
  }
}
