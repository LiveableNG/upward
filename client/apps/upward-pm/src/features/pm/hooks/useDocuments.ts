
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
    },
  });

  return {
    documents: documentsQuery.data?.history || [],
    templates: documentsQuery.data?.templates || [],
    isLoading: documentsQuery.isLoading,
    saveTemplate: saveTemplateMutation,
    sendDocument: sendDocumentMutation,
  };
};
