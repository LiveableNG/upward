import React from 'react';
import { Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface TransactionListProps {
  transactions: any[];
}

export function TransactionList({
  transactions = [],
}: TransactionListProps) {
  const [showAll, setShowAll] = React.useState(false);
  const displayedTransactions = showAll ? transactions : transactions.slice(0, 5);

  return (
    <div className="checkout-card">
      <div className="checkout-card__title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Recent Transactions</span>
          <span style={{
            background: '#F2F1EB',
            color: '#5D5954',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '100px',
            fontWeight: 700
          }}>
            {transactions.length}
          </span>
        </div>

        {transactions.length > 5 ? (
          <button
            onClick={() => setShowAll(!showAll)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--forest, #166534)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0
            }}
          >
            {showAll ? 'Show Less' : 'See All'}
          </button>
        ) : (
          <Clock size={20} color="#8A857F" />
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="transaction-empty-state">
          <Clock size={32} />
          <p>No recent activity recorded yet.</p>
        </div>
      ) : (
        <div className="transaction-list-container">
          {displayedTransactions.map((tx: any) => {
            const isDeposit = tx.type === 'DEPOSIT';
            return (
              <div className="transaction-item" key={tx.id}>
                <div className="transaction-item-left">
                  <div className={`transaction-icon ${isDeposit ? 'transaction-icon--deposit' : 'transaction-icon--deduction'}`}>
                    {isDeposit ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                  </div>
                  <div className="transaction-info">
                    <span className="transaction-name">{tx.narration || (isDeposit ? 'Wallet Top-up' : 'Subscription Charge')}</span>
                    <span className="transaction-meta">
                      {new Date(tx.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <div className="transaction-item-right">
                  <span className={`transaction-amount ${isDeposit ? 'transaction-amount--plus' : 'transaction-amount--minus'}`}>
                    {isDeposit ? '+' : '-'} ₦{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="transaction-reference">{tx.reference}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
