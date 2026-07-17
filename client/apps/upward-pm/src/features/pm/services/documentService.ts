
import { api } from '@/lib/api';
import { request } from '@/lib/api-client';

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
    phone?: string;
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

  getTenantUploadedDocuments: async (unitUuid: string) => {
    return api.get(`/pm/documents/tenant-uploaded/${unitUuid}`);
  },

  saveTemplate: async (data: Partial<DocumentTemplate>) => {
    return api.post('/pm/documents/templates', data);
  },

  sendDocument: async (data: any) => {
    return api.post('/pm/documents/send', data);
  },

  sendBulkDocument: async (data: {
    subject: string;
    content: string;
    documentType: string;
    fromEmail?: string;
    includeLetterhead?: boolean;
    deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
    recipients: Array<{
      uuid: string;
      type: 'TENANT' | 'LANDLORD';
      email: string;
      phone?: string;
      name: string;
    }>;
  }) => {
    return api.post('/pm/documents/send-bulk', data);
  },

  generatePdf: async (content: string, tenantUuid?: string, unitUuid?: string, recipientName?: string, includeLetterhead?: boolean) => {
    return api.post<Blob>('/pm/documents/generate-pdf', { content, tenantUuid, unitUuid, recipientName, includeLetterhead });
  },

  /** Push a raw file (PDF/image) directly into the tenant's document vault. */
  sendFileToVault: async (data: {
    file: File;
    subject?: string;
    tenantUuid?: string;
    unitUuid?: string;
  }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.subject) formData.append('subject', data.subject);
    if (data.tenantUuid) formData.append('tenantUuid', data.tenantUuid);
    if (data.unitUuid) formData.append('unitUuid', data.unitUuid);
    return request('/pm/documents/send-to-vault', { method: 'POST', body: formData });
  },

  /** Render a template to PDF and push into the tenant's document vault. */
  sendTemplateToVault: async (data: {
    content: string;
    subject: string;
    includeLetterhead?: boolean;
    tenantUuid?: string;
    unitUuid?: string;
  }) => {
    return api.post('/pm/documents/template-to-vault', data);
  },
};
