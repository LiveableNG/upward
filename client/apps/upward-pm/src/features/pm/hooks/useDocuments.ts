
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/documentService';

export const useDocuments = () => {
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['pm-documents'],
    queryFn: documentService.getDocuments,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: documentService.saveTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-documents'] });
    },
  });

  const sendDocumentMutation = useMutation({
    mutationFn: documentService.sendDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-documents'] });
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['pm-units'] });
      queryClient.invalidateQueries({ queryKey: ['pm-unit'] });
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: ({ content, tenantUuid, unitUuid, recipientName, includeLetterhead }: { content: string, tenantUuid?: string, unitUuid?: string, recipientName?: string, includeLetterhead?: boolean }) => 
      documentService.generatePdf(content, tenantUuid, unitUuid, recipientName, includeLetterhead),
  });

  const sendBulkDocumentMutation = useMutation({
    mutationFn: documentService.sendBulkDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-documents'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['pm-units'] });
      queryClient.invalidateQueries({ queryKey: ['pm-unit'] });
    },
  });

  return {
    documents: documentsQuery.data?.history || [],
    templates: documentsQuery.data?.templates || [],
    isLoading: documentsQuery.isLoading,
    saveTemplate: saveTemplateMutation,
    sendDocument: sendDocumentMutation,
    sendBulkDocument: sendBulkDocumentMutation,
    generatePdf: generatePdfMutation,
  };
};

export const useUnitDocuments = (unitUuid: string) => {
  return useQuery({
    queryKey: ['pm-unit-vault-documents', unitUuid],
    queryFn: () => documentService.getTenantUploadedDocuments(unitUuid),
    enabled: !!unitUuid,
  });
};

export const useVaultActions = () => {
  const queryClient = useQueryClient();

  const sendFileToVault = useMutation({
    mutationFn: documentService.sendFileToVault,
    onSuccess: (_, vars) => {
      if (vars.unitUuid) {
        queryClient.invalidateQueries({ queryKey: ['pm-unit-vault-documents', vars.unitUuid] });
      }
    },
  });

  const sendTemplateToVault = useMutation({
    mutationFn: documentService.sendTemplateToVault,
    onSuccess: (_, vars) => {
      if (vars.unitUuid) {
        queryClient.invalidateQueries({ queryKey: ['pm-unit-vault-documents', vars.unitUuid] });
      }
    },
  });

  return { sendFileToVault, sendTemplateToVault };
};
