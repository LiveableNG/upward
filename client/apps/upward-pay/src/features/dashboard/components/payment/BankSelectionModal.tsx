'use client'

import React, { useState } from 'react'
import { X, Search, Landmark, AlertCircle } from 'lucide-react'

interface Bank {
  code: string
  name: string
}

interface BankSelectionModalProps {
  banks: Bank[]
  onSelect: (bank: Bank) => void
  onClose: () => void
  loading?: boolean
  error?: boolean
}

export function BankSelectionModal({
  banks,
  onSelect,
  onClose,
  loading,
  error,
}: BankSelectionModalProps) {
  const [search, setSearch] = useState('')

  const filteredBanks = banks.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 2000,
        padding: '20px 16px',
        alignItems: 'flex-end', // Style like a bottom sheet for mobile feel
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          animation: 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className="modal-card__header"
          style={{
            padding: '20px 20px 12px',
            background: 'var(--bg)',
            flexShrink: 0,
          }}
        >
          <div>
            <h3 className="modal-card__title" style={{ fontSize: 18, marginBottom: 4 }}>
              Select Bank
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Choose the destination bank
            </p>
          </div>
          <button className="modal-card__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '0 20px 16px', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '0 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border-solid)',
              borderRadius: 'var(--radius-md)',
              marginTop: 8,
            }}
          >
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search bank name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                padding: '14px 0',
                fontSize: 15,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div
          className="modal-card__body"
          style={{
            padding: '0 8px 24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Landmark
                size={32}
                className="animate-pulse"
                style={{ margin: '0 auto 12px', opacity: 0.5 }}
              />
              <p>Fetching bank list...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--warning)' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
              <p>Could not load banks. Please check your connection.</p>
              <button
                onClick={() => window.location.reload()}
                className="btn btn--secondary"
                style={{ marginTop: 16 }}
              >
                Retry
              </button>
            </div>
          ) : filteredBanks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p>No banks matching "{search}"</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredBanks.map((bank) => (
                <button
                  key={bank.code}
                  onClick={() => onSelect(bank)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '16px 12px',
                    width: '100%',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    borderRadius: 'var(--radius-md)',
                  }}
                  className="bank-option"
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--clay)',
                      border: '1px solid var(--border-solid)',
                    }}
                  >
                    <Landmark size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                      {bank.name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .bank-option:hover {
          background: var(--surface) !important;
        }
        .bank-option:active {
          background: var(--surface2) !important;
          transform: scale(0.98);
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
