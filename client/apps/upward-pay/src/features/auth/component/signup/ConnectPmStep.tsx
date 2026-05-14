import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Building2, Search, CheckCircle2, UserPlus, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface ConnectPmStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ConnectPmStep({ onComplete, onSkip }: ConnectPmStepProps) {
  const [step, setStep] = useState<'LOOKUP' | 'FOUND' | 'NOT_FOUND'>('LOOKUP');
  const [email, setEmail] = useState('');
  const [pmName, setPmName] = useState('');
  const [pmDetails, setPmDetails] = useState<{ id: number, name: string, businessName: string } | null>(null);

  const verifyMutation = useMutation({
    mutationFn: async (pmEmail: string) => {
      const res = await api.post('/user/pm-connection/verify', { email: pmEmail });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.found && data.pm) {
        setPmDetails({
          id: data.pm.id,
          name: `${data.pm.firstName} ${data.pm.lastName}`,
          businessName: data.pm.businessName || `${data.pm.firstName} ${data.pm.lastName}`,
        });
        setStep('FOUND');
      } else {
        setStep('NOT_FOUND');
      }
    }
  });

  const confirmMutation = useMutation({
    mutationFn: async (pmId: number) => {
      await api.post('/user/pm-connection/confirm', { pmId });
    },
    onSuccess: () => {
      onComplete();
    }
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      await api.post('/user/pm-connection/invite', { pmEmail: email, pmName });
    },
    onSuccess: () => {
      onComplete();
    }
  });

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) verifyMutation.mutate(email);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (pmName) inviteMutation.mutate();
  };

  if (step === 'FOUND' && pmDetails) {
    return (
      <div className="auth-step animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="auth-header text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[var(--surface2)] rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-[var(--clay)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Is this your Property Manager?</h2>
          <p className="text-[var(--text-secondary)] mt-2">We found a match for {email}</p>
        </div>

        <div className="bg-[var(--surface2)] rounded-xl p-6 mb-8 border border-[var(--border)]">
          <h3 className="font-semibold text-lg text-[var(--text-primary)]">{pmDetails.businessName}</h3>
          <p className="text-[var(--text-secondary)] mt-1">{pmDetails.name}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            className="btn btn--primary w-full py-3"
            onClick={() => confirmMutation.mutate(pmDetails.id)}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? 'Connecting...' : 'Yes, Connect Me'}
          </button>
          <button 
            className="btn btn--ghost w-full py-3"
            onClick={() => setStep('LOOKUP')}
            disabled={confirmMutation.isPending}
          >
            No, try another email
          </button>
        </div>
      </div>
    );
  }

  if (step === 'NOT_FOUND') {
    return (
      <div className="auth-step animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="auth-header text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[var(--surface2)] rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-[var(--clay)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Invite your Landlord</h2>
          <p className="text-[var(--text-secondary)] mt-2">We couldn't find them on Upward yet. What's their name?</p>
        </div>

        <form onSubmit={handleInvite} className="auth-form flex flex-col gap-5">
          <div className="form-group">
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Property Manager / Landlord Name</label>
            <input 
              type="text" 
              className="input w-full" 
              placeholder="e.g. John Smith"
              value={pmName}
              onChange={(e) => setPmName(e.target.value)}
              required
            />
          </div>
          
          <div className="flex flex-col gap-3 mt-4">
            <button 
              type="submit"
              className="btn btn--primary w-full py-3"
              disabled={inviteMutation.isPending || !pmName}
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </button>
            <button 
              type="button"
              className="btn btn--ghost w-full py-3"
              onClick={onSkip}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Initial LOOKUP step
  return (
    <div className="auth-step animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="auth-header text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-[var(--surface2)] rounded-full flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-[var(--clay)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Find your Property Manager</h2>
        <p className="text-[var(--text-secondary)] mt-2">Connect with your landlord to easily pay rent and view your property details.</p>
      </div>

      <form onSubmit={handleLookup} className="auth-form flex flex-col gap-5">
        <div className="form-group">
          <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Property Manager's Email</label>
          <input 
            type="email" 
            className="input w-full" 
            placeholder="manager@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        {verifyMutation.isError && (
          <p className="text-sm text-red-500 mt-1">Unable to search at the moment. Please try again.</p>
        )}

        <div className="flex flex-col gap-3 mt-4">
          <button 
            type="submit"
            className="btn btn--primary w-full py-3"
            disabled={verifyMutation.isPending || !email}
          >
            {verifyMutation.isPending ? 'Searching...' : 'Search'}
          </button>
          <button 
            type="button"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-center py-2 transition-colors"
            onClick={onSkip}
          >
            I don't know their email, skip this
          </button>
        </div>
      </form>
    </div>
  );
}
