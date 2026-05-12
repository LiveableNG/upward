
import { api } from '@/lib/api';

export interface DocumentTemplate {
  uuid: string;
  name: string;
  content: string;
  type: string;
  updatedAt: string;
}

export interface SentDocument {
  uuid: string;
  subject: string;
  content: string;
  documentType: string;
  recipientName: string;
  recipientEmail: string;
  status: string;
  includeLetterhead: boolean;
  createdAt: string;
  tenant?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  unit?: {
    unitName: string;
    property?: { name: string };
  };
}

export const documentService = {
  getDocuments: async () => {
    return api.get('/pm/documents');
  },

  saveTemplate: async (data: Partial<DocumentTemplate>) => {
    return api.post('/pm/documents/templates', data);
  },

  sendDocument: async (data: any) => {
    return api.post('/pm/documents/send', data);
  },
  
  generatePdf: async (content: string, tenantUuid?: string, unitUuid?: string, recipientName?: string, includeLetterhead?: boolean) => {
    return api.post<Blob>('/pm/documents/generate-pdf', { content, tenantUuid, unitUuid, recipientName, includeLetterhead });
  }
};
