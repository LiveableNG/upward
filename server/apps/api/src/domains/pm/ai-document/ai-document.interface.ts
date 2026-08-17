export interface AiParseDocumentInput {
  fileBuffer: Buffer;
  mimeType: string;
  fileName: string;
  mode: 'full' | 'units';
  targetPropertyUuid?: string;
  contextHint?: string;
}

export interface AiParsedRow {
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
  confidenceScore?: number;
}

export interface IDocumentAiProvider {
  readonly providerId: string;
  parseDocument(input: AiParseDocumentInput): Promise<AiParsedRow[]>;
}

export const DOCUMENT_AI_PROVIDER = Symbol('DOCUMENT_AI_PROVIDER');
