import React, { useEffect, useState } from 'react';
import { Clock, Mail, MessageCircle, CheckCircle2 } from 'lucide-react';
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#009b79]"></div>
      </div>
    );
  }

  const emails = queued.filter((q) => q.channel === 'EMAIL');
  const whatsapp = queued.filter((q) => q.channel === 'WHATSAPP');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Sequence Queue</h1>
          <p className="text-gray-500 mt-1">Review and dispatch sequences currently on hold.</p>
        </div>
        <button
          onClick={fetchQueued}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#009b79] shadow-sm transition-all duration-200"
        >
          <Clock className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Sequences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Email Sequences</h2>
            </div>
            <span className="bg-blue-100 text-blue-700 py-1 px-2.5 rounded-full text-xs font-medium">
              {emails.length} Pending
            </span>
          </div>
          
          <div className="divide-y divide-gray-100">
            {emails.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No email sequences on hold
              </div>
            ) : (
              emails.map((item) => (
                <div key={item.stage} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.stage}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.count} users waiting</p>
                  </div>
                  <button
                    onClick={() => handleTrigger('EMAIL', item.stage)}
                    disabled={triggering === `EMAIL-${item.stage}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {triggering === `EMAIL-${item.stage}` ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
              </div>
              <h2 className="font-semibold text-gray-900">WhatsApp Sequences</h2>
            </div>
            <span className="bg-green-100 text-green-700 py-1 px-2.5 rounded-full text-xs font-medium">
              {whatsapp.length} Pending
            </span>
          </div>
          
          <div className="divide-y divide-gray-100">
            {whatsapp.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No WhatsApp sequences on hold
              </div>
            ) : (
              whatsapp.map((item) => (
                <div key={item.stage} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.stage}</h3>
                    <p className="text-sm text-gray-500 mt-1">{item.count} users waiting</p>
                  </div>
                  <button
                    onClick={() => handleTrigger('WHATSAPP', item.stage)}
                    disabled={triggering === `WHATSAPP-${item.stage}`}
                    className="flex items-center gap-2 px-4 py-2 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#1ebd5a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25D366] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {triggering === `WHATSAPP-${item.stage}` ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
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
    </div>
  );
};
