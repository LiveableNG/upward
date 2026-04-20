import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'

export interface KYCReportPdfData {
  profile: {
    name: string
    email: string
    phone: string
    bio?: string
    profilePicUrl?: string
    rank: string
    band: string
  }
  score: number
  metrics: {
    ptPercentage: number
    longestStreak: number
    historyYears: number
    discipline: number
  }
  properties: any[]
  cycles: any[]
}

@Injectable()
export class KYCReportPdfService {
  async generateReportPdf(data: KYCReportPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: { Title: `Credibility Report - ${data.profile.name}` },
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
      const bg = '#ffffff'
      const surface = '#faf9f5'
      const border = '#e2ddd7'

      // Background
      doc.rect(0, 0, W, H).fill(bg)

      // Header Banner
      const BANNER_H = 180
      doc.rect(0, 0, W, BANNER_H).fill(surface)
      
      // Branding (Logo)
      this.drawLogo(doc, 40, 40, 24, clay)

      doc.font('Helvetica-Bold').fontSize(14).fillColor(clay).text('UPWARD', 70, 48)
      doc.font('Helvetica').fontSize(9).fillColor(textMuted).text('Official Tenant Credential', 70, 62)

      // Profile Header Section
      doc.font('Helvetica-Bold').fontSize(22).fillColor(dark).text(data.profile.name, 40, 100)
      doc.font('Helvetica').fontSize(10).fillColor(textSecondary).text('Verified Tenant  ·  CredibilityRating', 40, 128)
      
      if (data.profile.bio) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor(textMuted).text(data.profile.bio, 40, 145, { width: 350 })
      }

      // Score Box
      const SCORE_BOX_W = 160
      const SCORE_BOX_H = 100
      const SCORE_BOX_X = W - SCORE_BOX_W - 40
      const SCORE_BOX_Y = 40

      doc.roundedRect(SCORE_BOX_X, SCORE_BOX_Y, SCORE_BOX_W, SCORE_BOX_H, 12).fill(dark)
      doc.font('Helvetica').fontSize(8).fillColor('white').text('RENT CREDIBILITY SCORE', SCORE_BOX_X + 15, SCORE_BOX_Y + 15)
      doc.font('Helvetica-Bold').fontSize(28).fillColor('white').text(data.score.toString(), SCORE_BOX_X + 15, SCORE_BOX_Y + 30)
      doc.font('Helvetica').fontSize(12).fillColor('rgba(255,255,255,0.4)').text('/ 900', SCORE_BOX_X + 15 + doc.widthOfString(data.score.toString()) + 5, SCORE_BOX_Y + 42)
      
      doc.font('Helvetica-Bold').fontSize(9).fillColor(clay).text(`Tier: ${data.profile.rank} (${data.profile.band})`, SCORE_BOX_X + 15, SCORE_BOX_Y + 75)

      // Metrics Row
      let startY = BANNER_H + 30
      doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text('RENT BEHAVIOUR METRICS', 40, startY)
      startY += 15

      const colW = (W - 80) / 4
      const metrics = [
        { label: 'ON-TIME RATE', value: `${Math.round(data.metrics.ptPercentage)}%` },
        { label: 'STRK', value: `${data.metrics.longestStreak} mo` },
        { label: 'TENURE', value: `${data.metrics.historyYears} yrs` },
        { label: 'DISCIPL.', value: `${Math.round(data.metrics.discipline)}%` },
      ]

      metrics.forEach((m, i) => {
        const x = 40 + i * colW
        doc.font('Helvetica').fontSize(7).fillColor(textMuted).text(m.label, x, startY + 10)
        doc.font('Helvetica-Bold').fontSize(12).fillColor(dark).text(m.value, x, startY + 20)
      })

      // Tenancy History
      startY += 60
      doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text('TENANCY HISTORY', 40, startY)
      startY += 15

      if (data.properties.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor(textMuted).text('No verified properties linked yet.', 40, startY)
      } else {
        data.properties.forEach((p, i) => {
          doc.rect(40, startY, W - 80, 45).fill(surface)
          doc.font('Helvetica-Bold').fontSize(9).fillColor(dark).text(`${p.location?.address}, ${p.location?.area}`, 50, startY + 12)
          doc.font('Helvetica').fontSize(8).fillColor(textSecondary).text(`${p.location?.state}, ${p.location?.country}`, 50, startY + 25)
          
          const years = p.rentStartDate ? new Date(p.rentStartDate).getFullYear() : 'N/A'
          const endYears = p.isPastTenancy ? (p.rentEndDate ? new Date(p.rentEndDate).getFullYear() : 'N/A') : 'Present'
          doc.font('Helvetica-Bold').fontSize(8).fillColor(textMuted).text(`${years} - ${endYears}`, 0, startY + 18, { width: W - 50, align: 'right' })

          if (p.isManaged) {
            doc.roundedRect(W - 95, startY + 30, 45, 10, 2).fill(clay)
            doc.font('Helvetica-Bold').fontSize(6).fillColor('white').text('VERIFIED', W - 95, startY + 32, { width: 45, align: 'center' })
          }

          startY += 50
        })
      }

      // Recent Observations
      startY += 20
      doc.font('Helvetica-Bold').fontSize(10).fillColor(dark).text('RECENT OBSERVATIONS', 40, startY)
      startY += 15

      data.cycles.slice(0, 5).forEach((c, i) => {
        const rowY = startY + (i * 35)
        doc.moveTo(40, rowY).lineTo(W - 40, rowY).strokeColor(border).lineWidth(0.5).stroke()
        
        doc.font('Helvetica-Bold').fontSize(9).fillColor(textSecondary).text(c.status, 40, rowY + 12)
        doc.font('Helvetica').fontSize(8).fillColor(textMuted).text(`Cycle Ended: ${new Date(c.dueDate).toLocaleDateString()}`, 40, rowY + 23)
        
        const ptTag = c.ptValue >= 1 ? 'PERFECT' : c.ptValue >= 0.7 ? 'GRACE' : 'LATE'
        doc.font('Helvetica-Bold').fontSize(8).fillColor(c.ptValue >= 0.8 ? '#16a34a' : clay).text(ptTag, 0, rowY + 15, { width: W - 45, align: 'right' })
      })

      // Footer
      doc.rect(0, H - 60, W, 60).fill(surface)
      doc.font('Helvetica').fontSize(7).fillColor(textMuted).text(`Report Ref: UPW-${data.profile.name.split(' ')[0]?.toUpperCase()}-${Date.now().toString().slice(-6)}`, 40, H - 35)
      doc.font('Helvetica-Bold').fontSize(8).fillColor(clay).text('VERIFIED PORTFOLIO BY UPWARD', 0, H - 35, { width: W - 40, align: 'right' })

      doc.end()
    })
  }

  private drawLogo(doc: any, x: number, y: number, size: number, color: string) {
    const scale = size / 40
    doc.save()
    doc.translate(x, y)
    doc.scale(scale)

    doc.roundedRect(7, 15, 10, 17, 5).fill(color)
    doc.roundedRect(23, 15, 10, 17, 5).fill(color)

    doc
      .moveTo(12, 30)
      .quadraticCurveTo(12, 37, 20, 37)
      .quadraticCurveTo(28, 37, 28, 30)
      .lineWidth(5.5)
      .stroke(color)

    doc.moveTo(7, 19).lineTo(20, 8).lineTo(33, 19).lineWidth(5).stroke(color)
    doc.circle(20, 5, 3).fill('#22c55e')

    doc.restore()
  }
}
