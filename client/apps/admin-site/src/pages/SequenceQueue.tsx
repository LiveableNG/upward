import React, { useEffect, useState, useRef } from 'react';
import { Clock, Mail, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api.service';

interface QueuedSequence {
  channel: 'EMAIL' | 'WHATSAPP';
  stage: string;
  count: number;
}

interface SequenceQueueProps {
  token: string;
}

export const SequenceQueue: React.FC<SequenceQueueProps> = ({ token }) => {
  const [queued, setQueued] = useState<QueuedSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  // ── Confirm modal ──
  const confirmCallbackRef = useRef<(() => void) | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: '', message: '' });

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    confirmCallbackRef.current = onConfirm;
    setConfirmModal({ show: true, title, message });
  };

  const closeConfirm = () => setConfirmModal((p) => ({ ...p, show: false }));

  const handleConfirm = async () => {
    if (confirmCallbackRef.current) {
      await confirmCallbackRef.current();
    }
    closeConfirm();
  };

  useEffect(() => {
    fetchQueued();
  }, []);

  const fetchQueued = async () => {
    try {
      const res = await apiService.get('/admin/sequences/queued', token);
      setQueued(res.data || res);
    } catch (error) {
      console.error('Failed to fetch queued sequences', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async (channel: 'EMAIL' | 'WHATSAPP', stage: string) => {
    const key = `${channel}-${stage}`;
    setTriggering(key);
    try {
      await apiService.post('/admin/sequences/trigger', { channel, stage }, token);
      // Remove from list or refresh
      await fetchQueued();
    } catch (error) {
      console.error('Failed to trigger', error);
    } finally {
      setTriggering(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading sequence queue...</p>
      </div>
    );
  }

  const emails = queued.filter((q) => q.channel === 'EMAIL');
  const whatsapp = queued.filter((q) => q.channel === 'WHATSAPP');

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>Sequence Queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>Review and dispatch sequences currently on hold.</p>
        </div>
        <button
          onClick={fetchQueued}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Clock size={16} />
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Email Sequences */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={20} color="#2563eb" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>Email Sequences</h3>
            </div>
            <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '12px' }}>
              {emails.length} Pending
            </span>
          </div>
          
          <div>
            {emails.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No email sequences on hold
              </div>
            ) : (
              emails.map((item) => (
                <div key={item.stage} style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>{item.stage}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{item.count} users waiting</p>
                  </div>
                  <button
                    onClick={() => openConfirm('Dispatch Email Sequence', `Are you sure you want to approve and dispatch the ${item.stage} sequence for ${item.count} users?`, () => handleTrigger('EMAIL', item.stage))}
                    disabled={triggering === `EMAIL-${item.stage}`}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px' }}
                  >
                    {triggering === `EMAIL-${item.stage}` ? (
                      'Dispatching...'
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Approve & Dispatch
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* WhatsApp Sequences */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '8px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={20} color="#16a34a" />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>WhatsApp Sequences</h3>
            </div>
            <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '12px' }}>
              {whatsapp.length} Pending
            </span>
          </div>
          
          <div>
            {whatsapp.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                No WhatsApp sequences on hold
              </div>
            ) : (
              whatsapp.map((item) => (
                <div key={item.stage} style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>{item.stage}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{item.count} users waiting</p>
                  </div>
                  <button
                    onClick={() => openConfirm('Dispatch WhatsApp Sequence', `Are you sure you want to approve and dispatch the ${item.stage} sequence for ${item.count} users?`, () => handleTrigger('WHATSAPP', item.stage))}
                    disabled={triggering === `WHATSAPP-${item.stage}`}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '13px', backgroundColor: '#25D366', borderColor: '#25D366' }}
                  >
                    {triggering === `WHATSAPP-${item.stage}` ? (
                      'Dispatching...'
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Approve & Dispatch
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {confirmModal.show && (
        <div className="modal-overlay" style={{ alignItems: 'center' }} onClick={closeConfirm}>
          <div
            className="modal-content"
            style={{ maxWidth: '400px', backgroundColor: 'var(--white)', padding: '0', borderRadius: '20px', overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}
              >
                <AlertCircle size={32} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px', color: 'var(--text)' }}>
                {confirmModal.title}
              </h3>
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  marginBottom: '28px',
                  lineHeight: 1.6,
                }}
              >
                {confirmModal.message}
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={closeConfirm}
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '12px', fontSize: '14px' }}
                >
                  Approve & Dispatch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
