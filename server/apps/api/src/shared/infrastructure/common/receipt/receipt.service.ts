import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'

export interface ReceiptPdfData {
  title: string
  receiptNumber: string
  paidAt: Date
  tenantName: string
  landlordName?: string
  propertyName?: string
  propertyAddress?: string
  amount: number
  currency: string
  reference: string
  channel: string
  type: string
  lineItems?: Array<{ label: string; amount: number }>
}

@Injectable()
export class ReceiptService {
  async generateReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
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

      const clay = '#d97757'
      const dark = '#0a0a0f'
      const textSecondary = '#4a4642'
      const textMuted = '#928e89'
      const oat = '#faf9f5'
      const borderSolid = '#e2ddd7'
      const white = '#ffffff'

      const isSavings = data.type === 'SAVINGS'

      doc.rect(0, 0, W, H).fill(oat)

      // ── CLAY HERO ─────────────────────────────────────────────────────
      const HERO_H = 295
      doc.rect(0, 0, W, HERO_H).fill(clay)

      // Decorative soft circles in hero
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

      // Icon
      const ICON_X = 34
      const ICON_Y = 28
      doc.save()
      doc.translate(ICON_X, ICON_Y)
      doc.scale(0.46)
      doc
        .path(
          'M19.4566 38.1326C16.6976 38.1308 13.9711 37.5419 11.4619 36.4059C8.95275 35.2698 6.71938 33.6131 4.91312 31.5479C3.10685 29.4827 1.76985 27.0573 0.992659 24.436C0.21547 21.8146 0.0162403 19.0584 0.408462 16.3542C0.800684 13.6499 1.77521 11.0606 3.26602 8.76179C4.75683 6.46294 6.72912 4.50814 9.04933 3.02979C11.3695 1.55144 13.9835 0.584052 16.7142 0.193145C19.4448 -0.197762 22.2284 -0.00305824 24.8765 0.764063C25.2486 0.872343 25.5634 1.11995 25.7542 1.45434C25.9449 1.78872 25.9966 2.18355 25.8981 2.55501L24.1728 9.05257C24.1211 9.2452 24.0306 9.4255 23.9068 9.58263C23.7829 9.73977 23.6283 9.8705 23.4522 9.96699C23.276 10.0635 23.082 10.1237 22.8818 10.1441C22.6815 10.1645 22.4792 10.1446 22.2869 10.0856C21.2132 9.74951 20.0874 9.60666 18.9628 9.66382C17.1323 9.75951 15.369 10.3778 13.8857 11.4441C12.4024 12.5105 11.2625 13.9791 10.6037 15.6729C9.94491 17.3666 9.79535 19.213 10.1731 20.9891C10.5508 22.7652 11.4397 24.395 12.7325 25.6818C14.0252 26.9685 15.6665 27.8573 17.4581 28.2406C19.2497 28.624 21.1151 28.4856 22.8291 27.8421C24.543 27.1987 26.0322 26.0777 27.1168 24.6145C28.2015 23.1513 28.8352 21.4086 28.9414 19.5966C28.9719 19.0368 28.9543 18.4755 28.8889 17.9187L22.9691 22.5031C22.3861 22.9565 21.6495 23.171 20.9114 23.1022C20.1734 23.0333 19.4902 22.6865 19.0029 22.1332L15.8856 18.6186C15.6442 18.3219 15.528 17.9443 15.5613 17.5648C15.5945 17.1852 15.7747 16.8331 16.0641 16.5821C16.3535 16.3311 16.7297 16.2005 17.1141 16.2178C17.4984 16.2351 17.8611 16.3988 18.1264 16.6748L21.1943 20.1436L27.1636 15.5226C27.5671 15.2114 28.0462 15.0109 28.5528 14.9411C29.0593 14.8714 29.5755 14.9349 30.0494 15.1253C30.5206 15.3113 30.9332 15.6183 31.2446 16.0148C31.556 16.4113 31.755 16.8828 31.8211 17.3808C31.9287 18.1727 31.9608 18.9729 31.9168 19.7708C31.7081 23.0201 30.2127 26.0566 27.7557 28.2202C25.2986 30.3838 22.0784 31.4997 18.795 31.3254C15.5116 31.151 12.4304 29.7005 10.2211 27.2891C8.01182 24.8776 6.853 21.7002 6.99651 18.4474C7.08898 16.696 7.55644 14.9841 8.36791 13.4252C9.17938 11.8663 10.3163 10.496 11.7032 9.4053C13.0902 8.31458 14.6955 7.52833 16.4127 7.09868C18.1299 6.66903 19.9197 6.6058 21.6635 6.9132L22.6326 3.24572C21.5864 3.04256 20.5228 2.94021 19.4566 2.9401C16.3362 2.94154 13.2819 3.83107 10.6575 5.50275C8.03315 7.17442 5.94934 9.5578 4.65426 12.369C3.35917 15.1802 2.9074 18.3008 3.35273 21.359C3.79807 24.4173 5.12176 27.2844 7.16613 29.6188C9.21051 31.9532 11.8894 33.6565 14.8838 34.526C17.8782 35.3954 21.0618 35.3943 24.0556 34.5228C27.0494 33.6513 29.7271 31.946 31.7698 29.6102C33.8125 27.2744 35.1342 24.4064 35.5773 21.3478C35.6439 20.9704 35.8561 20.6333 36.169 20.408C36.482 20.1826 36.8712 20.0866 37.2543 20.1402C37.6375 20.1937 37.9846 20.3927 38.2222 20.6951C38.4599 20.9974 38.5696 21.3794 38.528 21.7604C37.8561 26.2986 35.5614 30.4473 32.0615 33.4519C28.5615 36.4565 24.0888 38.1175 19.4566 38.1326Z',
        )
        .fill(white)
      doc.restore()

      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(white)
        .text('UPWARD', ICON_X + 22, ICON_Y + 5)
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('rgba(255,255,255,0.6)')
        .text('Transaction Receipt', 0, ICON_Y + 9, { width: W - 34, align: 'right' })

      // Amount hero
      const amountStr = `${data.currency} ${data.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      doc
        .font('Helvetica-Bold')
        .fontSize(40)
        .fillColor(white)
        .text(amountStr, 0, 110, { width: W, align: 'center' })

      // Status pill
      const PILL_W = 96
      const PILL_H = 24
      const PILL_X = (W - PILL_W) / 2
      const PILL_Y = 162
      doc.roundedRect(PILL_X, PILL_Y, PILL_W, PILL_H, 99).fill('rgba(255,255,255,0.18)')
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(white)
        .text('Successful', PILL_X, PILL_Y + 7.5, { width: PILL_W, align: 'center' })

      // Date
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
        .fillColor('rgba(255,255,255,0.6)')
        .text(dateStr, 0, 202, { width: W, align: 'center' })

      // ── TOP SCALLOP TEAR ─────────────────────────────────────────────
      const SCALLOP_R = 13
      const numScallops = Math.floor(W / (SCALLOP_R * 2))
      const scallopsW = numScallops * SCALLOP_R * 2
      const scallopsStartX = (W - scallopsW) / 2
      const TOP_TEAR_Y = HERO_H - SCALLOP_R

      // oat strip behind scallops
      doc.rect(0, TOP_TEAR_Y, W, SCALLOP_R * 2 + 16).fill(oat)

      // Scallops cut upward into hero
      for (let i = 0; i < numScallops; i++) {
        const cx = scallopsStartX + i * SCALLOP_R * 2 + SCALLOP_R
        doc.circle(cx, TOP_TEAR_Y, SCALLOP_R).fill(clay)
      }

      // ── BODY CARD ─────────────────────────────────────────────────────
      const CARD_X = 36
      const CARD_Y = HERO_H + SCALLOP_R + 4
      const CARD_W = W - 72

      const rows: { label: string; value: string; bold?: boolean }[] = [
        { label: 'Tenant', value: data.tenantName },
        { label: 'Receipt No.', value: data.receiptNumber },
        {
          label: 'Payment Type',
          value: isSavings ? 'Savings Deposit' : data.title || 'Rent Payment',
        },
        { label: 'Channel', value: data.channel },
      ]

      const hasBreakdown = data.lineItems && data.lineItems.length > 0
      const breakdownDesc = hasBreakdown
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          `${data.lineItems!.map((item: any) => `${item.label} (N${item.amount.toLocaleString()})`).join(', ')}`
        : data.propertyName || data.propertyAddress || 'Rent Payment'

      if (data.type === 'RENT') {
        rows.push({ label: 'Property', value: breakdownDesc })
      }
      if (data.type === 'RENT' && data.landlordName) {
        rows.push({ label: 'Landlord', value: data.landlordName })
      }
      if (data.propertyAddress && !hasBreakdown) {
        rows.push({ label: 'Address', value: data.propertyAddress })
      }

      rows.push({
        label: isSavings ? 'Wallet Reference' : 'Paystack Reference',
        value: data.reference,
        bold: true,
      })

      // hasBreakdown already declared above
      const ROW_H = 58
      const BREAKDOWN_ROW_H = 32
      const CARD_H =
        rows.length * ROW_H + (hasBreakdown ? data.lineItems!.length * BREAKDOWN_ROW_H + 50 : 16)

      doc.roundedRect(CARD_X, CARD_Y, CARD_W, CARD_H, 14).fill(white)

      rows.forEach((row, i) => {
        const rowY = CARD_Y + 8 + i * ROW_H
        // ... (rest handled by next chunk)
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

      // ── BOTTOM SCALLOP TEAR ───────────────────────────────────────────
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
