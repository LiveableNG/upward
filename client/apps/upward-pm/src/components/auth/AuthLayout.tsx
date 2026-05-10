'use client';

import React from 'react';
import { UpwardLogo } from '../common/UpwardLogo';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  visualTitle?: React.ReactNode;
  visualDesc?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title, 
  subtitle,
  visualTitle,
  visualDesc 
}) => {
  return (
    <div className="auth-layout">
      {/* Visual Panel (Desktop) */}
      <div className="auth-layout__visual">
        <div className="auth-layout__visual-content">
          <header className="auth-layout__visual-header">
            <UpwardLogo color="white" size={42} />
          </header>

          <main className="auth-layout__visual-body">
            <h1 className="auth-layout__visual-title">
              {visualTitle || (
                <>
                  Manage your <br />
                  <span className="text-gradient">portfolio</span> like a pro.
                </>
              )}
            </h1>
            <p className="auth-layout__visual-desc">
              {visualDesc || "Onboard tenants, manage payment requests, and track property performance in one premium dashboard designed for modern property managers."}
            </p>
            
            <div className="auth-layout__visual-showcase">
              <div className="showcase-card showcase-card--1">
                <div className="showcase-card__icon">
                  <div className="pulse-dot"></div>
                </div>
                <div className="showcase-card__lines">
                  <div className="line line--long"></div>
                  <div className="line line--short"></div>
                </div>
              </div>
              
              <div className="showcase-card showcase-card--2">
                <div className="showcase-card__header">
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
                <div className="showcase-card__content">
                  <div className="amount-bar"></div>
                  <div className="label-bar"></div>
                </div>
              </div>

              <div className="showcase-card showcase-card--3">
                 <div className="check-icon"></div>
              </div>
            </div>
          </main>

        </div>

        <div className="auth-layout__ambient-blob blob--1"></div>
        <div className="auth-layout__ambient-blob blob--2"></div>
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
