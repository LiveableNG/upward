'use client'

import React, { useState } from 'react'
import { Search, Landmark, AlertCircle } from 'lucide-react'
import { BottomSheetModal } from '@/components/common/BottomSheetModal'

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

  const filteredBanks = banks.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase().trim())
  )

  return (
    <BottomSheetModal
      isOpen={true}
      onClose={onClose}
      title="Select Bank"
      subtitle="Choose the destination bank"
      maxWidth="md"
      className="bank-select-modal"
      bodyClassName="bank-select-modal__body"
    >
      <div className="bank-select__search-wrap">
        <div className="bank-select__search">
          <Search size={18} className="bank-select__search-icon" />
          <input
            type="text"
            placeholder="Search bank name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="bank-select__input"
          />
        </div>
      </div>

      <div className="bank-select__list">
        {loading ? (
          <div className="bank-select__status">
            <Landmark
              size={32}
              className="animate-pulse"
              style={{ margin: '0 auto 12px', opacity: 0.5 }}
            />
            <p>Fetching bank list...</p>
          </div>
        ) : error ? (
          <div className="bank-select__status bank-select__status--error">
            <AlertCircle size={32} style={{ margin: '0 auto 12px' }} />
            <p>Could not load banks. Please check your connection.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bank-select__retry-btn"
            >
              Retry
            </button>
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="bank-select__status">
            <p>No banks matching &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="bank-select__options">
            {filteredBanks.map((bank, index) => (
              <button
                key={`${bank.code}-${index}`}
                type="button"
                onClick={() => onSelect(bank)}
                className="bank-select__option"
              >
                <div className="bank-select__option-icon">
                  <Landmark size={18} />
                </div>
                <div className="bank-select__option-content">
                  <span className="bank-select__option-name">{bank.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.bank-select-modal__body) {
          padding: 0 !important;
          display: flex;
          flex-direction: column;
          max-height: calc(85vh - 70px);
          max-height: calc(85dvh - 70px);
          overflow: hidden !important;
        }

        .bank-select__search-wrap {
          padding: 12px 16px;
          background: var(--surface, #ffffff);
          border-bottom: 1px solid var(--border, #ece4d9);
          flex-shrink: 0;
        }

        .bank-select__search {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          background: var(--bg, #fdfbf7);
          border: 1.5px solid var(--border-solid, #ece4d9);
          border-radius: 12px;
          transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
        }

        .bank-select__search:focus-within {
          border-color: var(--clay, #c2501f);
          box-shadow: 0 0 0 3px rgba(194, 80, 31, 0.12);
          background: var(--surface, #ffffff);
        }

        :global(.bank-select__search-icon) {
          color: var(--text-muted, #7a7268);
          flex-shrink: 0;
        }

        .bank-select__input {
          flex: 1;
          background: transparent;
          border: none;
          padding: 13px 0;
          font-size: 14.5px;
          font-family: inherit;
          color: var(--text, #1a1714);
          outline: none;
        }

        .bank-select__input::placeholder {
          color: var(--text-muted, #7a7268);
        }

        .bank-select__list {
          padding: 6px 12px calc(var(--safe-bottom, 0px) + 24px);
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          flex: 1;
        }

        .bank-select__options {
          display: flex;
          flex-direction: column;
        }

        .bank-select__option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 10px;
          width: 100%;
          text-align: left;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border-subtle, #f3ece3);
          cursor: pointer;
          border-radius: 10px;
          transition: background-color 0.15s ease, transform 0.1s ease;
        }

        .bank-select__option:last-child {
          border-bottom: none;
        }

        .bank-select__option:hover {
          background: var(--bg, #fdfbf7);
        }

        .bank-select__option:active {
          background: var(--surface2, #f5efe6);
          transform: scale(0.99);
        }

        .bank-select__option-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: var(--bg, #fdfbf7);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay, #c2501f);
          border: 1px solid var(--border-solid, #ece4d9);
          flex-shrink: 0;
        }

        .bank-select__option-content {
          flex: 1;
          min-width: 0;
        }

        .bank-select__option-name {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--text, #1a1714);
          line-height: 1.35;
          display: block;
        }

        .bank-select__status {
          text-align: center;
          padding: 36px 16px;
          color: var(--text-muted, #7a7268);
          font-size: 14px;
        }

        .bank-select__status--error {
          color: var(--warning, #b45309);
        }

        .bank-select__retry-btn {
          margin-top: 14px;
          background: var(--surface, #fff);
          border: 1.5px solid var(--border-solid, #ece4d9);
          border-radius: 10px;
          padding: 8px 16px;
          font-size: 13.5px;
          font-weight: 600;
          color: var(--clay, #c2501f);
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .bank-select__retry-btn:hover {
          background: var(--bg, #fdfbf7);
        }
      `}</style>
    </BottomSheetModal>
  )
}
