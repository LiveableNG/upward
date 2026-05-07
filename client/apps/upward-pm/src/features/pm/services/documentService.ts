
import api from '@/lib/api';

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
    const response = await api.get('/pm/documents');
    return response.data;
  },

  saveTemplate: async (data: Partial<DocumentTemplate>) => {
    const response = await api.post('/pm/documents/templates', data);
    return response.data;
  },

  sendDocument: async (data: any) => {
    const response = await api.post('/pm/documents/send', data);
    return response.data;
  }
};
