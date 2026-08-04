'use client';

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  visualTitle?: React.ReactNode;
  visualDesc?: string;
  hideMobileLogo?: boolean;
  hideBackToWebsite?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  hideBackToWebsite = false
}) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F8F7F3', // Ivory Canvas
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '60px 16px',
      boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif',
      position: 'relative'
    }}>
      {/* Back Link */}
      {!hideBackToWebsite && (
        <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
          {Capacitor.isNativePlatform() ? (
            <Link
              href="/welcome"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-muted)',
                fontSize: '14px',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              <ChevronLeft size={16} /> Back
            </Link>
          ) : (
            <a
              href={`${process.env.NEXT_PUBLIC_WEB_URL || "https://upward.goodtenants.io"}/for-pm`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-muted)',
                fontSize: '14px',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              <ChevronLeft size={16} /> Back to Website
            </a>
          )}
        </div>
      )}

      <div style={{
        width: '100%',
        maxWidth: '700px', // Form Card width 700px
        background: '#FFFFFF', // White Card
        borderRadius: '24px', // 24px Radius
        border: '1px solid #E7E3DA', // Ivory Border accent
        padding: '48px 40px',
        boxShadow: '0 10px 30px rgba(231, 227, 218, 0.4)', // Faint dashboard-like shadow
        boxSizing: 'border-box',
        marginTop: 'auto',
        marginBottom: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
};
