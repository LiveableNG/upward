import React, { useEffect, useState } from 'react';
import { Clock, Mail, MessageCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api.service';

interface SequenceLogEntry {
  channel: 'EMAIL' | 'WHATSAPP';
  stage: string;
  sent: number;
  failed: number;
  pending: number;
}

interface SequenceQueueProps {
  token: string;
}

const statusDot = (color: string, label: string, count: number) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '13px',
      color: 'var(--text-muted)',
    }}
  >
    <span
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
    {count.toLocaleString()} {label}
  </span>
);

export const SequenceQueue: React.FC<SequenceQueueProps> = ({ token }) => {
  const [logs, setLogs] = useState<SequenceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiService.get('/admin/sequences/queued', token);
      // Transform the raw ON_HOLD / status counts into our view model
      const raw: Array<{ channel: 'EMAIL' | 'WHATSAPP'; stage: string; count: number; status?: string }> =
        res.data || res;

      // The existing endpoint returns ON_HOLD counts per stage/channel.
      // Build a unified log view: group by channel+stage and show the count as pending.
      const mapped: SequenceLogEntry[] = raw.map((item) => ({
        channel: item.channel,
        stage: item.stage,
        sent: 0,
        failed: 0,
        pending: item.count,
      }));

      setLogs(mapped);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to fetch sequence logs', error);
    } finally {
      setLoading(false);
    }
  };

  const emailLogs    = logs.filter((l) => l.channel === 'EMAIL');
  const whatsappLogs = logs.filter((l) => l.channel === 'WHATSAPP');

  const renderTable = (
    items: SequenceLogEntry[],
    icon: React.ReactNode,
    title: string,
    accentColor: string,
    bgColor: string,
  ) => (
    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '8px',
              background: bgColor,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              {title}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Auto-dispatches at <strong>8:00 AM WAT</strong> daily
            </p>
          </div>
        </div>
        <span
          className="badge"
          style={{ backgroundColor: bgColor, color: accentColor, fontSize: '12px' }}
        >
          {items.length} stage{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Body */}
      <div>
        {items.length === 0 ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            <CheckCircle2
              size={28}
              color="var(--success)"
              style={{ marginBottom: '8px', display: 'block', margin: '0 auto 8px' }}
            />
            All caught up — no upcoming sequences
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.stage}
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                  {item.stage}
                </h4>
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {item.sent   > 0 && statusDot('var(--success)', 'sent',    item.sent)}
                {item.failed > 0 && statusDot('var(--danger)',  'failed',  item.failed)}
                {item.pending > 0 && statusDot(accentColor,    'queued',  item.pending)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="page-container fade-in">
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2 className="section-title" style={{ margin: 0 }}>
            Sequence Monitor
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Sequences auto-dispatch at <strong>8:00 AM WAT</strong> daily. No manual action required.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Updated {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            id="sequence-monitor-refresh"
            onClick={fetchLogs}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? (
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Clock size={16} />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div
        style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '13px',
          color: '#1d4ed8',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Automatic dispatch is active.</strong> Email sequences go to users with a real email &amp; no
          phone. WhatsApp sequences go to users with a verified phone number. Internal accounts are
          always excluded.
        </span>
      </div>

      {loading && logs.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            color: 'var(--text-muted)',
            gap: '10px',
          }}
        >
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading sequence data...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {renderTable(
            emailLogs,
            <Mail size={20} color="#2563eb" />,
            'Email Sequences',
            '#2563eb',
            '#eff6ff',
          )}
          {renderTable(
            whatsappLogs,
            <MessageCircle size={20} color="#16a34a" />,
            'WhatsApp Sequences',
            '#16a34a',
            '#f0fdf4',
          )}
        </div>
      )}
    </div>
  );
};
