import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building2, Search, CheckCircle2, Mail, Phone, User, Landmark, ArrowRight, Sparkles, Home, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/common/Toast';

interface DiscoveredProperty {
  address: string;
  unitName: string;
  pmName: string;
  rentAmount: number;
  currency: string;
  alreadySynced?: boolean;
}

interface ConnectPmStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ConnectPmStep({ onComplete, onSkip }: ConnectPmStepProps) {
  const [step, setStep] = useState<'DISCOVERING' | 'DISCOVERED' | 'LOOKUP' | 'FOUND' | 'NOT_FOUND'>('DISCOVERING');
  const [email, setEmail] = useState('');
  const [pmName, setPmName] = useState('');
  const [pmInviteEmail, setPmInviteEmail] = useState('');
  const [pmType, setPmType] = useState('Property Manager');
  const [companyName, setCompanyName] = useState('');
  const [pmDetails, setPmDetails] = useState<{ id: number, name: string, businessName: string } | null>(null);
  const [discoveredProps, setDiscoveredProps] = useState<DiscoveredProperty[]>([]);

  const { refetch: discover } = useQuery({
    queryKey: ['discover-properties'],
    queryFn: async () => {
      const res = await api.get('/user/pm-connection/discover');
      return res.data;
    },
    enabled: false,
  });

  useEffect(() => {
    const runDiscovery = async () => {
      try {
        const res = await discover();
        if (res.data?.success && res.data.data?.found) {
          setDiscoveredProps(res.data.data.properties);
          setStep('DISCOVERED');
        } else {
          setStep('LOOKUP');
        }
      } catch (e) {
        setStep('LOOKUP');
      }
    };
    runDiscovery();
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const res = await api.post('/user/pm-connection/verify', { identifier });
      return res.data;
    },
    onSuccess: (data) => {
      const result = data.data;
      if (result && result.found && result.pm) {
        setPmDetails({
          id: result.pm.id,
          name: `${result.pm.firstName} ${result.pm.lastName}`,
          businessName: result.pm.businessName || `${result.pm.firstName} ${result.pm.lastName}`,
        });
        setStep('FOUND');
      } else {
        setStep('NOT_FOUND');
      }
    },
    onError: () => {
      toastError('Unable to search for Property Manager. Please check your connection.');
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

  if (step === 'DISCOVERING') {
    return (
      <div className="auth-stage text-center py-12">
        <div className="discovery-loader mx-auto mb-6">
          <Sparkles className="icon-main animate-pulse" />
        </div>
        <h2 className="auth-stage__title">Setting up your profile...</h2>
        <p className="auth-stage__subtitle">We're checking for properties already linked to your email.</p>
        <style jsx>{`
          .discovery-loader {
            width: 80px;
            height: 80px;
            background: var(--clay-faint);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon-main { width: 40px; height: 40px; color: var(--clay); }
          .text-center { text-align: center; }
          .py-12 { padding-top: 48px; padding-bottom: 48px; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .mb-6 { margin-bottom: 24px; }
        `}</style>
      </div>
    );
  }

  if (step === 'DISCOVERED') {
    return (
      <div className="auth-stage animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="auth-stage__header text-center">
          <div className="icon-circle mx-auto mb-6">
            <ShieldCheck className="icon-main" />
          </div>
          <h2 className="auth-stage__title">Good News!</h2>
          <p className="auth-stage__subtitle">We found <strong>{discoveredProps.length} property</strong> linked to your account.</p>
        </div>

        <div className="discovered-list mb-8">
          {discoveredProps.map((prop, idx) => (
            <div key={idx} className="discovered-item">
              <div className="discovered-item__icon">
                <Home size={20} />
              </div>
              <div className="discovered-item__content">
                <h4 className="discovered-item__address">{prop.address}</h4>
                <p className="discovered-item__meta">{prop.unitName} • {prop.pmName}</p>
              </div>
              <div className="discovered-item__badge">
                <CheckCircle2 size={16} />
                <span>Synced</span>
              </div>
            </div>
          ))}
        </div>

        <div className="auth-stage__ctas">
          <button 
            className="btn btn--primary btn--full btn--pay"
            onClick={onComplete}
          >
            Go to Dashboard
            <ArrowRight size={18} className="ml-2" />
          </button>
          
          <button 
            className="btn btn--secondary btn--full btn--pay mt-4"
            onClick={() => setStep('LOOKUP')}
          >
            Link Another Property
          </button>
        </div>

        <style jsx>{`
          .icon-circle {
            width: 64px;
            height: 64px;
            background: var(--success-bg);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
          }
          .icon-main { width: 32px; height: 32px; color: var(--success); }
          .text-center { text-align: center; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .mb-6 { margin-bottom: 24px; }
          .mb-8 { margin-bottom: 32px; }
          .mt-4 { margin-top: 16px; }
          .ml-2 { margin-left: 8px; }

          .discovered-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .discovered-item {
            display: flex;
            align-items: center;
            padding: 16px;
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: 16px;
            gap: 12px;
          }
          .discovered-item__icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            background: var(--bg);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--clay);
            flex-shrink: 0;
          }
          .discovered-item__content { flex: 1; min-width: 0; }
          .discovered-item__address {
            font-size: 14px;
            font-weight: 700;
            color: var(--text);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .discovered-item__meta {
            font-size: 12px;
            color: var(--text-secondary);
          }
          .discovered-item__badge {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 10px;
            background: var(--success-bg);
            color: var(--success);
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
          }
        `}</style>
      </div>
    );
  }

  if (step === 'FOUND' && pmDetails) {
    return (
      <div className="auth-stage animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="auth-stage__header text-center">
          <div className="icon-circle mx-auto mb-6">
            <Building2 className="icon-main" />
          </div>
          <h2 className="auth-stage__title">Is this your Property Manager?</h2>
          <p className="auth-stage__subtitle">We found a match for <strong>{email}</strong></p>
        </div>

        <div className="pm-match-card mb-8">
          <h3 className="pm-match-card__name">{pmDetails.businessName}</h3>
          <p className="pm-match-card__person">{pmDetails.name}</p>
        </div>

        <div className="auth-stage__ctas">
          <button 
            className="btn btn--primary btn--full btn--pay"
            onClick={() => confirmMutation.mutate(pmDetails.id)}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? 'Connecting...' : 'Yes, Connect Me'}
            <CheckCircle2 size={18} className="ml-2" />
          </button>
          <button 
            className="btn btn--secondary btn--full btn--pay mt-4"
            onClick={() => setStep('LOOKUP')}
            disabled={confirmMutation.isPending}
          >
            No, try another detail
          </button>
        </div>

        <style jsx>{`
          .icon-circle {
            width: 64px;
            height: 64px;
            background: var(--clay-faint);
            border: 1px solid rgba(217, 119, 87, 0.1);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px auto;
          }
          .icon-main {
            width: 32px;
            height: 32px;
            color: var(--clay);
          }
          .text-center { text-align: center; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .mb-6 { margin-bottom: 24px; }
          .mb-8 { margin-bottom: 32px; }
          .mt-4 { margin-top: 16px; }
          .ml-2 { margin-left: 8px; }
          
          .pm-match-card {
            background: var(--surface2);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
          }
          .pm-match-card__name {
            font-size: 18px;
            font-weight: 700;
            color: var(--text);
            margin-bottom: 4px;
          }
          .pm-match-card__person {
            font-size: 14px;
            color: var(--text-secondary);
          }
        `}</style>
      </div>
    );
  }

  if (step === 'NOT_FOUND') {
    const isPhoneSearch = /^\+234\d{10}$/.test(email.trim());

    return (
      <div className="auth-stage animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="auth-stage__header">
          <div className="icon-circle mb-6">
            <Landmark className="icon-main" />
          </div>
          <h2 className="auth-stage__title">Invite your Landlord</h2>
          <p className="auth-stage__subtitle">
            We couldn't find them on Upward yet. Let's send them an invite to join the platform!
          </p>
        </div>

        <form onSubmit={handleInvite} className="auth-form">
          <div className="auth-form__field">
            <label>Manager's Category</label>
            <div className="input-with-icon">
              <Landmark size={18} />
              <select 
                className="input-reset flex-1 bg-transparent py-4 px-3 outline-none border-none text-[15px]"
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
          </div>

          <div className="auth-form__field mt-2">
            <label>
              {pmType === 'Landlord' ? 'Landlord Name' : 'Manager / Firm Name'}
            </label>
            <div className="input-with-icon">
              <User size={18} />
              <input 
                type="text" 
                placeholder="e.g. John Smith"
                value={pmName}
                onChange={(e) => setPmName(e.target.value)}
                required
              />
            </div>
          </div>

          {pmType === 'Property Manager' && (
            <div className="auth-form__field mt-2">
              <label>Company Name (Optional)</label>
              <div className="input-with-icon">
                <Building2 size={18} />
                <input 
                  type="text" 
                  placeholder="e.g. Skyline Realty"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>
          )}

          {isPhoneSearch && (
            <div className="auth-form__field mt-2">
              <label>Their Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input 
                  type="email" 
                  placeholder="manager@example.com"
                  value={pmInviteEmail}
                  onChange={(e) => setPmInviteEmail(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          
          <div className="auth-stage__ctas mt-8">
            <button 
              type="submit"
              className="btn btn--primary btn--full btn--pay"
              disabled={inviteMutation.isPending || !pmName || (isPhoneSearch && !pmInviteEmail)}
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              <ArrowRight size={18} className="ml-2" />
            </button>
            <button 
              type="button"
              className="btn btn--secondary btn--full btn--pay mt-4"
              onClick={onSkip}
            >
              Skip for now
            </button>
          </div>
        </form>

        <style jsx>{`
          .icon-circle {
            width: 56px;
            height: 56px;
            background: var(--clay-faint);
            border: 1px solid rgba(217, 119, 87, 0.1);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
          }
          .icon-main {
            width: 28px;
            height: 28px;
            color: var(--clay);
          }
          .input-reset { background: none; border: none; font-family: inherit; }
          .mt-2 { margin-top: 12px; }
          .mt-8 { margin-top: 32px; }
          .mt-4 { margin-top: 16px; }
          .mb-6 { margin-bottom: 24px; }
          .ml-2 { margin-left: 8px; }
        `}</style>
      </div>
    );
  }

  // Initial LOOKUP step
  return (
    <div className="auth-stage animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="auth-stage__header">
        <div className="icon-circle mb-6">
          <Search className="icon-main" />
        </div>
        <h2 className="auth-stage__title">Find your Property Manager</h2>
        <p className="auth-stage__subtitle">Connect with your landlord to easily pay rent and view your property details.</p>
      </div>

      <form onSubmit={handleLookup} className="auth-form">
        <div className="auth-form__field">
          <label>Manager's Email or Phone Number</label>
          <div className="input-with-icon">
            {email.includes('@') ? <Mail size={18} /> : <Phone size={18} />}
            <input 
              type="text" 
              placeholder="e.g. manager@email.com or +2348030000000"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <p className="helper-text mt-2">
            Phone numbers must be in international format starting with +234
          </p>
        </div>
        
        {verifyMutation.isError && (
          <p className="error-text mt-1">Unable to search at the moment. Please try again.</p>
        )}

        <div className="auth-stage__ctas mt-8">
          <button 
            type="submit"
            className="btn btn--primary btn--full btn--pay"
            disabled={verifyMutation.isPending || !email}
          >
            {verifyMutation.isPending ? 'Searching...' : 'Search'}
            <Search size={18} className="ml-2" />
          </button>
          
          <button 
            type="button"
            className="auth-form__link"
            onClick={onSkip}
          >
            I don't know their details, skip this
          </button>
        </div>
      </form>

      <style jsx>{`
        .icon-circle {
          width: 56px;
          height: 56px;
          background: var(--clay-faint);
          border: 1px solid rgba(217, 119, 87, 0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }
        .icon-main {
          width: 28px;
          height: 28px;
          color: var(--clay);
        }
        .helper-text {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.4;
        }
        .error-text {
          font-size: 13px;
          color: var(--error);
          font-weight: 500;
        }
        .mt-1 { margin-top: 4px; }
        .mt-2 { margin-top: 8px; }
        .mt-8 { margin-top: 32px; }
        .mb-6 { margin-bottom: 24px; }
        .ml-2 { margin-left: 8px; }
      `}</style>
    </div>
  );
}
