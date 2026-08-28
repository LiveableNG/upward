import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  IDocumentAiProvider,
  AiParseDocumentInput,
  AiParsedRow,
} from '../../../domains/pm/ai-document/ai-document.interface'

@Injectable()
export class GeminiDocumentAiProvider implements IDocumentAiProvider {
  readonly providerId = 'gemini'
  private readonly logger = new Logger(GeminiDocumentAiProvider.name)

  constructor(private readonly configService: ConfigService) {}

  async parseDocument(input: AiParseDocumentInput): Promise<AiParsedRow[]> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY')
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not configured in .env file.')
      throw new Error('Gemini API key is missing.')
    }

    const modelName = this.configService.get<string>('GEMINI_MODEL', 'gemini-2.5-flash')
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

    const promptText = `
      You are an expert data parsing assistant for property onboarding.
      Your task is to extract property, unit, tenant, landlord, and rent/payment history information from the provided document content.
      
      Import Mode: ${input.mode}
      Target Property UUID: ${input.targetPropertyUuid || 'N/A'}
      Context Hint: ${input.contextHint || 'None'}

      Extract all entities and return them as a list of rows. If a row contains tenant details, map them correctly.
      Make sure to follow these formatting rules:
      - Standardize unitRentType to one of: "Monthly", "Annually", "Quarterly", "Bi-Annually".
      - Return dates in YYYY-MM-DD ISO format if available.
      - Return numbers for unitRentAmount, unitRentAmountPaid, leaseYears, bedrooms, and bathrooms. Do not include currency symbols in numeric fields.
      - If tenant commercial/business name is found, map it to tenantCommercialName.
    `

    const requestBody: any = {
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          description: 'List of extracted onboarding rows',
          items: {
            type: 'OBJECT',
            properties: {
              propertyName: { type: 'STRING' },
              propertyAddress: { type: 'STRING' },
              propertyCity: { type: 'STRING' },
              propertyState: { type: 'STRING' },
              propertyCountry: { type: 'STRING' },
              propertyType: { type: 'STRING' },
              unitName: { type: 'STRING' },
              unitType: { type: 'STRING' },
              bedrooms: { type: 'INTEGER' },
              bathrooms: { type: 'INTEGER' },
              tenantFirstName: { type: 'STRING' },
              tenantLastName: { type: 'STRING' },
              tenantCommercialName: { type: 'STRING' },
              tenantEmail: { type: 'STRING' },
              tenantPhone: { type: 'STRING' },
              landlordName: { type: 'STRING' },
              landlordPhone: { type: 'STRING' },
              unitRentAmount: { type: 'NUMBER' },
              unitRentType: {
                type: 'STRING',
                enum: ['Monthly', 'Annually', 'Quarterly', 'Bi-Annually'],
              },
              unitRentStartDate: { type: 'STRING', description: 'YYYY-MM-DD format' },
              unitRentDueDate: { type: 'STRING', description: 'YYYY-MM-DD format' },
              unitRentAmountPaid: { type: 'NUMBER' },
              leaseYears: { type: 'INTEGER' },
              confidenceScore: { type: 'NUMBER' },
            },
          },
        },
      },
    }

    // If there is document binary data/image, embed it as inlineData
    if (input.fileBuffer && input.mimeType) {
      const isTextOrSpreadsheet =
        input.mimeType.includes('csv') ||
        input.mimeType.includes('spreadsheet') ||
        input.mimeType.includes('text') ||
        input.fileName.endsWith('.csv') ||
        input.fileName.endsWith('.xlsx')

      if (!isTextOrSpreadsheet) {
        requestBody.contents[0].parts.push({
          inlineData: {
            mimeType: input.mimeType,
            data: input.fileBuffer.toString('base64'),
          },
        })
      } else {
        // Spreadsheets are converted to text representation by the pre-processor
        requestBody.contents[0].parts.push({
          text: `Here is the sheet representation extracted from the file:\n\n${input.fileBuffer.toString('utf-8')}`,
        })
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error(`Gemini API returned status ${response.status}: ${errorText}`)
        throw new Error(`Gemini request failed: ${response.statusText}`)
      }

      const responseJson = await response.json()
      const text = responseJson?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        throw new Error('Gemini returned an empty candidate list or missing text.')
      }

      const rows: AiParsedRow[] = JSON.parse(text.trim())
      return rows
    } catch (err: any) {
      this.logger.error(`Failed to parse document via Gemini: ${err.message}`)
      throw err
    }
  }
}
