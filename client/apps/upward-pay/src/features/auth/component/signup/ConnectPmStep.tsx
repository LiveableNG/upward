import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Building2, Search, CheckCircle2, UserPlus, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

interface ConnectPmStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ConnectPmStep({ onComplete, onSkip }: ConnectPmStepProps) {
  const [step, setStep] = useState<'LOOKUP' | 'FOUND' | 'NOT_FOUND'>('LOOKUP');
  const [email, setEmail] = useState('');
  const [pmName, setPmName] = useState('');
  const [pmInviteEmail, setPmInviteEmail] = useState('');
  const [pmType, setPmType] = useState('Property Manager');
  const [companyName, setCompanyName] = useState('');
  const [pmDetails, setPmDetails] = useState<{ id: number, name: string, businessName: string } | null>(null);

  const verifyMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const res = await api.post('/user/pm-connection/verify', { identifier });
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
      const targetEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? email : pmInviteEmail;
      await api.post('/user/pm-connection/invite', { 
        pmEmail: targetEmail, 
        pmName,
        pmType,
        companyName: pmType === 'Property Manager' ? companyName : undefined
      });
    },
    onSuccess: () => {
      onComplete();
    }
  });

  const { error: toastError } = useToast();

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const trimmed = email.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const isPhone = /^\+234\d{10}$/.test(trimmed);

    if (!isEmail && !isPhone) {
        toastError('Please enter a valid email or phone number in international format (+234...)');
        return;
    }

    verifyMutation.mutate(trimmed);
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
            No, try another detail
          </button>
        </div>
      </div>
    );
  }

  if (step === 'NOT_FOUND') {
    const isPhoneSearch = /^\+234\d{10}$/.test(email.trim());

    return (
      <div className="auth-step animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="auth-header text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-[var(--surface2)] rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-8 h-8 text-[var(--clay)]" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Invite your Landlord</h2>
          <p className="text-[var(--text-secondary)] mt-2">
            We couldn't find them on Upward yet. Let's send them an invite!
          </p>
        </div>

        <form onSubmit={handleInvite} className="auth-form flex flex-col gap-5">
          <div className="form-group">
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Manager's Category</label>
            <select 
              className="input w-full"
              value={pmType}
              onChange={(e) => setPmType(e.target.value)}
              required
            >
              <option value="Property Manager">Property Manager</option>
              <option value="Lawyer">Lawyer</option>
              <option value="Caretaker">Caretaker</option>
              <option value="Landlord">Landlord</option>
            </select>
          </div>

          <div className="form-group">
            <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
              {pmType === 'Landlord' ? 'Landlord Name' : 'Manager / Firm Name'}
            </label>
            <input 
              type="text" 
              className="input w-full" 
              placeholder="e.g. John Smith"
              value={pmName}
              onChange={(e) => setPmName(e.target.value)}
              required
            />
          </div>

          {pmType === 'Property Manager' && (
            <div className="form-group">
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Company Name (Optional)</label>
              <input 
                type="text" 
                className="input w-full" 
                placeholder="e.g. Skyline Realty"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
          )}

          {isPhoneSearch && (
            <div className="form-group">
              <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Their Email Address (to send invite)</label>
              <input 
                type="email" 
                className="input w-full" 
                placeholder="manager@example.com"
                value={pmInviteEmail}
                onChange={(e) => setPmInviteEmail(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="flex flex-col gap-3 mt-4">
            <button 
              type="submit"
              className="btn btn--primary w-full py-3"
              disabled={inviteMutation.isPending || !pmName || (isPhoneSearch && !pmInviteEmail)}
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
          <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">Manager's Email or Phone Number</label>
          <input 
            type="text" 
            className="input w-full" 
            placeholder="e.g. manager@email.com or +2348030000000"
            value={email}
            onChange={(e) => {
                const val = e.target.value;
                setEmail(val);
                // Simple inline validation check can go here if needed
            }}
            required
          />
          <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
            Phone numbers must be in international format starting with +234
          </p>
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
            I don't know their details, skip this
          </button>
        </div>
      </form>
    </div>
  );
}
