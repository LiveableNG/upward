import { Injectable, Logger } from '@nestjs/common'
import * as ExcelJS from 'exceljs'

@Injectable()
export class DocumentPreProcessorEngine {
  private readonly logger = new Logger(DocumentPreProcessorEngine.name)

  async preProcess(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
  ): Promise<{
    textRepresentation?: string
    hasVisuals: boolean
    pageBuffers?: Buffer[]
  }> {
    const lowerMime = mimeType.toLowerCase()

    if (
      lowerMime.includes('spreadsheetml') ||
      lowerMime.includes('excel') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      try {
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(fileBuffer as any)
        let fullMarkdown = ''

        workbook.eachSheet((worksheet) => {
          fullMarkdown += `### Sheet: ${worksheet.name}\n\n`

          worksheet.eachRow((row) => {
            const values = Array.isArray(row.values)
              ? row.values.slice(1).map((val) => {
                  if (val === null || val === undefined) return ''
                  if (typeof val === 'object') {
                    return (val as any).result !== undefined
                      ? String((val as any).result)
                      : JSON.stringify(val)
                  }
                  return String(val).replace(/\|/g, '\\|').trim()
                })
              : []

            fullMarkdown += `| ${values.join(' | ')} |\n`
          })
          fullMarkdown += '\n'
        })

        return {
          textRepresentation: fullMarkdown,
          hasVisuals: false,
        }
      } catch (err: any) {
        this.logger.error(`Failed to parse Excel document ${fileName} with exceljs: ${err.message}`)
      }
    }

    // CSV files
    if (lowerMime.includes('csv') || fileName.endsWith('.csv')) {
      try {
        const csvText = fileBuffer.toString('utf-8')
        const lines = csvText.split('\n')
        let fullMarkdown = '### CSV Data\n\n'

        lines.forEach((line) => {
          if (!line.trim()) return
          const columns = line.split(',').map((col) => col.replace(/\|/g, '\\|').trim())
          fullMarkdown += `| ${columns.join(' | ')} |\n`
        })

        return {
          textRepresentation: fullMarkdown,
          hasVisuals: false,
        }
      } catch (err: any) {
        this.logger.error(`Failed to parse CSV document ${fileName}: ${err.message}`)
      }
    }

    // Scanned Images
    if (
      lowerMime.includes('image/') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg')
    ) {
      return {
        hasVisuals: true,
        pageBuffers: [fileBuffer],
      }
    }

    // Default or PDF files
    return {
      hasVisuals: true,
      textRepresentation: 'Please parse the attached document visually or textually.',
      pageBuffers: [fileBuffer],
    }
  }
}
