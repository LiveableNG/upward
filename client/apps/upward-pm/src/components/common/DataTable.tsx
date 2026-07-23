'use client'

import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export interface Column<T> {
  header: string | React.ReactNode;
  render: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  sortable?: boolean;
  sortKey?: string | ((item: T) => any);
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
  defaultSortConfig?: { key: string | ((item: T) => any), direction: 'asc' | 'desc' };
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
  renderMobileCard,
  defaultSortConfig
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(pageSize || 10);
  const observerTarget = React.useRef<HTMLDivElement>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string | ((item: T) => any), direction: 'asc' | 'desc' } | null>(defaultSortConfig || null);

  const handleSort = (key?: string | ((item: T) => any)) => {
    if (!key) return;
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null; // toggle off
      }
      return { key, direction: 'asc' };
    });
  };

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

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const key = sortConfig.key;
      let aVal = typeof key === 'function' ? key(a) : (a as any)[key as string];
      let bVal = typeof key === 'function' ? key(b) : (b as any)[key as string];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const paginatedData = useMemo(() => {
    if (!pageSize) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const mobileVisibleData = useMemo(() => {
    return sortedData.slice(0, mobileVisibleCount);
  }, [sortedData, mobileVisibleCount]);

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
                    width: col.width,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none'
                  }}
                  onClick={() => col.sortable && handleSort(col.sortKey)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.align === 'right' ? 'flex-end' : (col.align === 'center' ? 'center' : 'flex-start'), gap: '6px' }}>
                    {col.header}
                    {col.sortable && (
                      <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
                        {sortConfig?.key === col.sortKey ? (
                          sortConfig?.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                        ) : (
                          <ArrowUpDown size={14} />
                        )}
                      </span>
                    )}
                  </div>
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
                    if (typeof col.header === 'string' && col.header.toLowerCase() === 'actions') return null;
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
                  if (typeof col.header === 'string' && col.header.toLowerCase() === 'actions') {
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
