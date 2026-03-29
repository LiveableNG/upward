'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, X, Target, TrendingUp, ChevronRight } from 'lucide-react'

export default function AiWidget() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [goalAmount, setGoalAmount] = useState('500000')

  return (
    <>
      {/* Floating Action Button */}
      <button 
        className="ai-widget-btn"
        onClick={() => setIsOpen(true)}
      >
        <Sparkles size={24} />
      </button>

      {/* Bottom Sheet Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 50,
            animation: 'fadeIn 0.2s ease-out'
          }}
        />
      )}

      {/* Bottom Sheet Content */}
      <div 
        className="ai-widget-sheet"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(120%)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--clay)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Upward AI Assistant</h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            style={{ background: 'var(--surface)', border: 'none', width: '32px', height: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--surface) 0%, rgba(217, 119, 87, 0.05) 100%)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="var(--clay)" /> Housing Path Planner
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Set your goals from 1-bed in Yaba to home ownership. Our AI predicts future property prices and analyzes your saving capacity.
            </p>
            
            <button 
              className="btn btn--primary btn--full" 
              style={{ padding: '14px', fontSize: '15px' }}
              onClick={() => {
                setIsOpen(false);
                router.push('/dashboard/ai-planner');
              }}
            >
              Start AI Planning <Sparkles size={16} style={{ marginLeft: 8 }} />
            </button>
          </div>

          <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
             <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Target size={16} color="var(--clay)" /> Simulation Modes
             </h4>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div style={{ fontSize: '10px', textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', color: 'rgba(255,255,255,0.5)' }}>Normal</div>
                <div style={{ fontSize: '10px', textAlign: 'center', padding: '8px', background: 'rgba(217,119,87,0.1)', borderRadius: '6px', color: 'var(--clay)', fontWeight: 600 }}>Aggressive</div>
                <div style={{ fontSize: '10px', textAlign: 'center', padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', color: 'rgba(255,255,255,0.5)' }}>No Time</div>
             </div>
          </div>

          <div style={{ marginTop: '24px' }}>
             <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Personalized Insights</h4>
             <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px' }}>Your spending habits analysis</span>
                <ChevronRight size={16} color="var(--text-muted)" />
             </div>
             <div style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px' }}>Rent optimization strategies</span>
                <ChevronRight size={16} color="var(--text-muted)" />
             </div>
          </div>
        </div>
      </div>
    </>
  )
}
