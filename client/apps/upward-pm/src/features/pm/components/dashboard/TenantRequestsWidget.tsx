import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { UserPlus, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { AddTenantModal } from '../tenants/modals/AddTenantModal';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

export function TenantRequestsWidget() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [resolveDuplicateModal, setResolveDuplicateModal] = useState<{
    isOpen: boolean;
    uuid: string;
    name: string;
    propertyName: string;
    unitName: string;
  }>({
    isOpen: false,
    uuid: '',
    name: '',
    propertyName: '',
    unitName: ''
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['tenant-join-requests'],
    queryFn: async () => {
      const res = await api.get('/pm/tenants/join-requests');
      return res || [];
    }
  });

  const dismissMutation = useMutation({
    mutationFn: async (uuid: string) => {
      await api.post(`/pm/tenants/join-requests/${uuid}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] });
    }
  });

  const resolveDuplicateMutation = useMutation({
    mutationFn: async (uuid: string) => {
      await api.post(`/pm/tenants/join-requests/${uuid}/resolve-duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] });
      setResolveDuplicateModal(prev => ({ ...prev, isOpen: false }));
    }
  });

  const handleApprove = (req: any) => {
    setSelectedRequest(req);
    setIsAddTenantModalOpen(true);
  };

  const handleDismiss = (uuid: string) => {
    dismissMutation.mutate(uuid);
  };

  const handleResolveDuplicate = (req: any) => {
    setResolveDuplicateModal({
      isOpen: true,
      uuid: req.uuid,
      name: `${req.tenantFirstName} ${req.tenantLastName}`,
      propertyName: req.existingConnection.propertyName,
      unitName: req.existingConnection.unitName
    });
  };

  const handleConfirmResolveDuplicate = () => {
    resolveDuplicateMutation.mutate(resolveDuplicateModal.uuid);
  };

  if (isLoading || requests.length === 0) return null;

  return (
    <>
      <div className="bg-[#FFFFF0] border border-[#E5E5D8] rounded-xl p-5 mb-6 shadow-sm">
        <h3 className="text-[15px] font-semibold text-[#1B4332] mb-4 flex items-center gap-2">
          <UserPlus size={18} className="text-[#4A6052]" />
          Tenant Join Requests ({requests.length})
        </h3>
        
        <div className="flex flex-col gap-3">
          {requests.map((req: any) => (
            <div key={req.uuid} className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#E5E5D8]">
              <div className="flex-1">
                <p className="font-medium text-[#1B4332] text-[14px]">
                  {req.tenantFirstName} {req.tenantLastName}
                </p>
                <p className="text-[#4A6052] text-[12px] mb-1">{req.tenantEmail}</p>
                {req.unitDetails && (
                  <div className="bg-[#F0F4F1] p-2 rounded text-[12px] text-[#1B4332] border border-[#E5E5D8] inline-block">
                    <span className="font-semibold">Requested Unit:</span> {req.unitDetails.address}{req.unitDetails.area ? `, ${req.unitDetails.area}` : ''} • ₦{(req.unitDetails.rentAmount || 0).toLocaleString()}
                  </div>
                )}
                {req.existingConnection && (
                  <div className="mt-1.5 bg-[#EFF6FF] p-2 rounded text-[11px] text-[#1E3A8A] border border-[#BFDBFE] flex items-center gap-1.5 w-fit">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#1E3A8A]" />
                    <span>Sync Duplicate: Linked to <strong>{req.existingConnection.propertyName} - Unit {req.existingConnection.unitName}</strong></span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {req.existingConnection ? (
                  <button 
                    className="flex items-center justify-center h-8 px-3 rounded-md bg-[#2563EB] text-white text-[12px] font-medium transition-colors hover:bg-[#1D4ED8]"
                    onClick={() => handleResolveDuplicate(req)}
                    disabled={resolveDuplicateMutation.isPending}
                  >
                    <CheckCircle2 size={14} className="mr-1.5" /> Resolve
                  </button>
                ) : (
                  <button 
                    className="flex items-center justify-center h-8 px-3 rounded-md bg-[#1B4332] text-white text-[12px] font-medium transition-colors hover:bg-[#112d22]"
                    onClick={() => handleApprove(req)}
                  >
                    <CheckCircle2 size={14} className="mr-1.5" /> Approve
                  </button>
                )}
                <button 
                  className="flex items-center justify-center w-8 h-8 rounded-md bg-[#F5F5F0] text-[#7B8F82] transition-colors hover:bg-[#E5E5D8] hover:text-[#4A6052]"
                  onClick={() => handleDismiss(req.uuid)}
                  title="Dismiss"
                  disabled={dismissMutation.isPending}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAddTenantModalOpen && selectedRequest && (
        <AddTenantModal
          isOpen={isAddTenantModalOpen}
          mode="join-request"
          onClose={() => {
            setIsAddTenantModalOpen(false);
            setSelectedRequest(null);
            queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] });
          }}
          initialData={{
            firstName: selectedRequest.tenantFirstName,
            lastName: selectedRequest.tenantLastName,
            email: selectedRequest.tenantEmail,
            phone: selectedRequest.tenantPhone || '',
            unitDetails: selectedRequest.unitDetails,
          }}
        />
      )}

      <ConfirmationModal
        isOpen={resolveDuplicateModal.isOpen}
        onClose={() => setResolveDuplicateModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmResolveDuplicate}
        title="Resolve Duplicate Request?"
        message={`Are you sure you want to resolve the request from ${resolveDuplicateModal.name}? Since they are already active and synced to ${resolveDuplicateModal.propertyName} - Unit ${resolveDuplicateModal.unitName}, this will approve this request and clean up any duplicate pending property connections on their profile.`}
        confirmText="Yes, Resolve"
        type="primary"
        isPending={resolveDuplicateMutation.isPending}
      />
    </>
  );
}
