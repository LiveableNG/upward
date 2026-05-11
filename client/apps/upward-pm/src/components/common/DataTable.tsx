'use client'

import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  header: string;
  render: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  keyExtractor?: (item: T) => string | number;
  rowClassName?: (item: T) => string;
  pageSize?: number;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data available",
  isLoading = false,
  keyExtractor,
  rowClassName,
  pageSize
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 if data or pageSize changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length, pageSize]);

  const paginatedData = useMemo(() => {
    if (!pageSize) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  const totalPages = pageSize ? Math.ceil(data.length / pageSize) : 0;

  if (isLoading) {
    return (
      <div className="upward-table-container animate-pulse">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading data...
        </div>
      </div>
    );
  }

  return (
    <div className="upward-table-container">
      <table className="upward-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                style={{ 
                  textAlign: col.align || 'left',
                  width: col.width 
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((item, idx) => (
            <tr 
              key={keyExtractor ? keyExtractor(item) : idx}
              onClick={() => onRowClick?.(item)}
              className={`${onRowClick ? 'upward-table__row--clickable' : ''} ${rowClassName ? rowClassName(item) : ''}`}
            >
              {columns.map((col, colIdx) => (
                <td 
                  key={colIdx}
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.render(item, (currentPage - 1) * (pageSize || 0) + idx)}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pageSize && totalPages > 1 && (
        <div className="upward-pagination">
          <div className="upward-pagination__info">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length} entries
          </div>
          
          <button 
            className="upward-pagination__btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              // Show a limited range of pages if there are many
              if (
                page === 1 || 
                page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`upward-pagination__page ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                );
              }
              if (page === currentPage - 2 || page === currentPage + 2) {
                return <span key={page} style={{ color: 'var(--text-muted)', alignSelf: 'center', padding: '0 4px' }}>...</span>;
              }
              return null;
            })}
          </div>

          <button 
            className="upward-pagination__btn"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
