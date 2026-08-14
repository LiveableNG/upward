import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiParseDocumentInput, AiParsedRow, IDocumentAiProvider, DOCUMENT_AI_PROVIDER } from '../../../../domains/pm/ai-document/ai-document.interface';
import { DocumentPreProcessorEngine } from '../../../../shared/infrastructure/ai/document-pre-processor.engine';
import { UnstructuredPipelineService } from '../../../../shared/infrastructure/ai/unstructured-pipeline.service';

@Injectable()
export class AiParseDocumentUseCase {
  private readonly logger = new Logger(AiParseDocumentUseCase.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly preProcessorEngine: DocumentPreProcessorEngine,
    private readonly unstructuredService: UnstructuredPipelineService,
    @Inject(DOCUMENT_AI_PROVIDER)
    private readonly aiProvider: IDocumentAiProvider,
  ) {}

  async execute(input: AiParseDocumentInput): Promise<AiParsedRow[]> {
    this.logger.log(`Starting AI document parsing for ${input.fileName} (${input.mimeType})`);

    const pathway = this.configService.get<string>('AI_PARSE_PATHWAY', 'hybrid').toLowerCase();
    this.logger.log(`Using AI Parse Pathway: ${pathway}`);

    let processedBuffer = input.fileBuffer;
    let mimeType = input.mimeType;

    if (pathway === 'hybrid') {
      const isUnstructuredEnabled = this.configService.get<boolean>('USE_LOCAL_UNSTRUCTURED', false);
      
      if (isUnstructuredEnabled) {
        this.logger.log('Hybrid Pathway: Using local Unstructured.io pre-processor');
        const extractedText = await this.unstructuredService.processDocument(
          input.fileBuffer,
          input.mimeType,
          input.fileName
        );
        if (extractedText) {
          processedBuffer = Buffer.from(extractedText, 'utf-8');
          mimeType = 'text/plain';
        } else {
          this.logger.warn('Unstructured processing failed. Self-healing: Falling back to direct layout/vision parsing.');
        }
      } else {
        this.logger.log('Hybrid Pathway: Using native DocumentPreProcessorEngine');
        const preProcessResult = await this.preProcessorEngine.preProcess(
          input.fileBuffer,
          input.mimeType,
          input.fileName
        );
        if (preProcessResult.textRepresentation) {
          processedBuffer = Buffer.from(preProcessResult.textRepresentation, 'utf-8');
          mimeType = 'text/plain';
        }
      }
    } else {
      this.logger.log(`Pathway is '${pathway}': Skipping hybrid pre-processing step.`);
    }

    // Parse the document using configured active AI provider
    const rawRows = await this.aiProvider.parseDocument({
      ...input,
      fileBuffer: processedBuffer,
      mimeType: mimeType,
    });

    this.logger.log(`Extracted ${rawRows.length} raw rows from AI. Applying sanitization...`);

    // Normalize and sanitize parsed data to match Upward DB formatting requirements
    return rawRows.map((row, idx) => {
      const sanitized: AiParsedRow = { ...row };

      // Ensure dates are parsed correctly
      if (sanitized.unitRentStartDate) {
        sanitized.unitRentStartDate = this.cleanDate(sanitized.unitRentStartDate);
      }
      if (sanitized.unitRentDueDate) {
        sanitized.unitRentDueDate = this.cleanDate(sanitized.unitRentDueDate);
      }

      // Format phone numbers
      if (sanitized.tenantPhone) {
        sanitized.tenantPhone = this.cleanPhone(sanitized.tenantPhone);
      }
      if (sanitized.landlordPhone) {
        sanitized.landlordPhone = this.cleanPhone(sanitized.landlordPhone);
      }

      // Ensure fallback guest emails are generated if missing
      const hasTenantName = !!(sanitized.tenantFirstName?.trim() || sanitized.tenantLastName?.trim());
      const hasCommercialName = !!(sanitized.tenantCommercialName?.trim());
      if ((hasTenantName || hasCommercialName) && (!sanitized.tenantEmail || sanitized.tenantEmail.trim() === '')) {
        const cleanName = hasCommercialName
          ? (sanitized.tenantCommercialName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          : `${(sanitized.tenantFirstName || '').toLowerCase().replace(/[^a-z0-9]/g, '')}-${(sanitized.tenantLastName || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        sanitized.tenantEmail = `guest-${cleanName}-${Math.random().toString(36).substring(2, 8)}@upward.com`;
      }

      // Guarantee numeric types
      sanitized.unitRentAmount = sanitized.unitRentAmount ? Number(sanitized.unitRentAmount) : 0;
      sanitized.unitRentAmountPaid = sanitized.unitRentAmountPaid ? Number(sanitized.unitRentAmountPaid) : 0;
      sanitized.bedrooms = sanitized.bedrooms ? Number(sanitized.bedrooms) : 0;
      sanitized.bathrooms = sanitized.bathrooms ? Number(sanitized.bathrooms) : 0;
      sanitized.leaseYears = sanitized.leaseYears ? Number(sanitized.leaseYears) : 1;

      return sanitized;
    });
  }

  private cleanDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) return dateStr;
      return parsedDate.toISOString().split('T')[0] || '';
    } catch {
      return dateStr;
    }
  }

  private cleanPhone(phoneStr: string): string {
    if (!phoneStr) return '';
    let digits = phoneStr.replace(/[^0-9]/g, '');
    if (digits.startsWith('0') && digits.length === 11) {
      // Standard Nigerian localized prefix conversion: 0803... -> +234803...
      digits = '234' + digits.substring(1);
    }
    return '+' + digits;
  }
}
