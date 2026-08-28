import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  IDocumentAiProvider,
  AiParseDocumentInput,
  AiParsedRow,
} from '../../../domains/pm/ai-document/ai-document.interface'

@Injectable()
export class LocalModelAiProvider implements IDocumentAiProvider {
  readonly providerId = 'local_ollama'
  private readonly logger = new Logger(LocalModelAiProvider.name)

  constructor(private readonly configService: ConfigService) {}

  async parseDocument(input: AiParseDocumentInput): Promise<AiParsedRow[]> {
    const localUrl = this.configService.get<string>(
      'LOCAL_AI_URL',
      'http://localhost:11434/api/generate',
    )
    const localModel = this.configService.get<string>('LOCAL_AI_MODEL', 'qwen2.5-vl')

    const promptText = `
      You are a data parsing assistant. Extract property, unit, tenant, landlord, and rent/payment history information from the document.
      You must respond ONLY with a raw JSON array matching this typescript interface:
      interface AiParsedRow {
        propertyName?: string;
        propertyAddress?: string;
        propertyCity?: string;
        propertyState?: string;
        propertyCountry?: string;
        propertyType?: string;
        unitName?: string;
        unitType?: string;
        bedrooms?: number;
        bathrooms?: number;
        tenantFirstName?: string;
        tenantLastName?: string;
        tenantCommercialName?: string;
        tenantEmail?: string;
        tenantPhone?: string;
        landlordName?: string;
        landlordPhone?: string;
        unitRentAmount?: number;
        unitRentType?: 'Monthly' | 'Annually' | 'Quarterly' | 'Bi-Annually';
        unitRentStartDate?: string; // YYYY-MM-DD
        unitRentDueDate?: string;   // YYYY-MM-DD
        unitRentAmountPaid?: number;
        leaseYears?: number;
      }
      
      Do not include markdown tags, preambles or chat explanations. Just output the raw JSON array.
    `

    try {
      const response = await fetch(localUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: localModel,
          prompt: `${promptText}\n\nDocument details: ${input.fileBuffer.toString('utf-8')}`,
          stream: false,
          format: 'json',
        }),
      })

      if (!response.ok) {
        throw new Error(`Local AI provider returned status ${response.status}`)
      }

      const resJson = await response.json()
      const rawText = resJson.response || resJson.text || ''

      return JSON.parse(rawText.trim())
    } catch (err: any) {
      this.logger.error(`Failed to parse document via local AI model: ${err.message}`)
      throw err
    }
  }
}
