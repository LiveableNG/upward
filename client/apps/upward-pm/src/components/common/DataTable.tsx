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
  emptyMessage?: React.ReactNode;
  isLoading?: boolean;
  keyExtractor?: (item: T) => string | number;
  rowClassName?: (item: T) => string;
  pageSize?: number;
  renderMobileCard?: (item: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data available",
  isLoading = false,
  keyExtractor,
  rowClassName,
  pageSize,
  renderMobileCard
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(pageSize || 10);
  const observerTarget = React.useRef<HTMLDivElement>(null);

  // Reset desktop page if data or pageSize changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length, pageSize]);

  // Reset mobile visible count if data resets
  React.useEffect(() => {
    setMobileVisibleCount(pageSize || 10);
  }, [data.length, pageSize]);

  // Mobile infinite scroll observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setMobileVisibleCount((prev) => Math.min(prev + (pageSize || 10), data.length));
        }
      },
      { rootMargin: '100px' }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [data.length, pageSize]);

  const paginatedData = useMemo(() => {
    if (!pageSize) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize]);

  const mobileVisibleData = useMemo(() => {
    return data.slice(0, mobileVisibleCount);
  }, [data, mobileVisibleCount]);

  const totalPages = pageSize ? Math.ceil(data.length / pageSize) : 0;

  if (isLoading) {
    return (
      <div className="upward-table-container animate-pulse">
        <table className="upward-table desktop-table-view">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} style={{ textAlign: col.align || 'left', width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, idx) => (
              <tr key={idx}>
                {columns.map((col, colIdx) => (
                  <td key={colIdx}>
                    <div style={{ height: '20px', backgroundColor: 'var(--surface2)', borderRadius: '4px', width: colIdx === 0 ? '60%' : '80%' }}></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mobile-cards-view">
           {Array.from({ length: 5 }).map((_, idx) => (
             <div key={idx} className="upward-mobile-card skeleton-card">
                <div style={{ height: '20px', backgroundColor: 'var(--surface2)', borderRadius: '4px', width: '80%', marginBottom: '16px' }}></div>
                <div style={{ height: '16px', backgroundColor: 'var(--surface2)', borderRadius: '4px', width: '50%' }}></div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="upward-table-wrapper">
      {/* Desktop Table View */}
      <div className="upward-table-container desktop-table-view">
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

      {/* Mobile Cards View with Infinite Scroll */}
      <div className="mobile-cards-view">
        {data.length === 0 && (
          <div className="mobile-cards-empty">
            {emptyMessage}
          </div>
        )}
        
        {mobileVisibleData.map((item, idx) => (
          <div 
            key={keyExtractor ? keyExtractor(item) : idx}
            className={`upward-mobile-card ${onRowClick ? 'clickable' : ''} ${rowClassName ? rowClassName(item) : ''}`}
            onClick={() => onRowClick?.(item)}
          >
            {renderMobileCard ? (
              renderMobileCard(item)
            ) : (
              <div className="upward-mobile-card__generic">
                {/* Primary Info (First Column) */}
                {columns.length > 0 && (
                  <div className="upward-mobile-card__primary">
                    <div className="upward-mobile-card__label">{columns[0].header}</div>
                    <div className="upward-mobile-card__value">{columns[0].render(item, idx)}</div>
                  </div>
                )}

                {/* Details Grid */}
                <div className="upward-mobile-card__details">
                  {columns.slice(1).map((col, colIdx) => {
                    if (col.header.toLowerCase() === 'actions') return null;
                    const rendered = col.render(item, idx);
                    if (!rendered) return null;
                    return (
                      <div key={colIdx} className="upward-mobile-card__detail-item">
                        <div className="upward-mobile-card__label">{col.header}</div>
                        <div className="upward-mobile-card__value">{rendered}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions Footer */}
                {columns.map((col, colIdx) => {
                  if (col.header.toLowerCase() === 'actions') {
                    const rendered = col.render(item, idx);
                    if (!rendered) return null;
                    return (
                      <div 
                        key={colIdx} 
                        className="upward-mobile-card__actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {rendered}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        ))}
        
        {/* Infinite Scroll trigger element */}
        {mobileVisibleCount < data.length && (
          <div ref={observerTarget} className="mobile-infinite-loader">
             <div className="loader-dot"></div>
             <div className="loader-dot"></div>
             <div className="loader-dot"></div>
          </div>
        )}
      </div>
    </div>
  );
}
