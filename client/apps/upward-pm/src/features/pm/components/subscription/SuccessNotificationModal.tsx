import React, { useEffect } from 'react';
import { Modal } from '@/components/ui/Modal/Modal';

interface SuccessNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string | React.ReactNode;
  autoCloseMs?: number;
}

export function SuccessNotificationModal({
  isOpen,
  onClose,
  title,
  message,
  autoCloseMs = 3500,
}: SuccessNotificationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, autoCloseMs);
    return () => clearTimeout(timer);
  }, [isOpen, onClose, autoCloseMs]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth={400}>
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          0% { stroke-dashoffset: 48; }
          100% { stroke-dashoffset: 0; }
        }
        .animated-success-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #E8F5E9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 16px auto 24px;
          box-shadow: 0 0 20px rgba(76, 175, 80, 0.2);
          animation: scaleIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        .checkmark-svg {
          width: 48px;
          height: 48px;
          stroke: #2E7D32;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: drawCheck 0.6s cubic-bezier(0.65, 0, 0.45, 1) 0.3s forwards;
        }
      `}</style>
      <div style={{ textAlign: 'center', padding: '16px 8px' }}>
        <div className="animated-success-icon">
          <svg className="checkmark-svg" viewBox="0 0 24 24">
            <path d="M20 6L9 17L4 12" />
          </svg>
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, color: '#1B1A17', letterSpacing: '-0.02em' }}>
          {title}
        </h3>
        <p style={{ color: '#5D5954', fontSize: 13, lineHeight: 1.6, marginBottom: 16, padding: '0 12px' }}>
          {message}
        </p>
      </div>
    </Modal>
  );
}
