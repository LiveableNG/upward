'use client';

import React from 'react';
import { UpwardLogo } from '../common/UpwardLogo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="auth-layout">
      {/* Visual Panel (Desktop) */}
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <div style={{ marginBottom: '40px' }}>
            <UpwardLogo color="white" size={48} />
          </div>
          <h1>Build better tenant relationships.</h1>
          <p>
            Onboard tenants, manage payment requests, and track property performance in one premium dashboard.
          </p>
          
          <div className="auth-layout__graphic" style={{ marginTop: '60px' }}>
            <div className="auth-layout__card-mock">
               <div style={{ padding: '24px' }}>
                 <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', marginBottom: '16px' }}></div>
                 <div style={{ width: '60%', height: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', marginBottom: '12px' }}></div>
                 <div style={{ width: '40%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-layout__form">
        <header className="mobile-header">
          <UpwardLogo size={32} />
        </header>

        <main className="auth-shell">
          {children}
        </main>
      </div>
    </div>
  );
};
