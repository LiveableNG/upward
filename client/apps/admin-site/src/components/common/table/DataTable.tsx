import React, { useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { SortHeader, type SortDir } from './SortHeader'
import { TablePagination } from './TablePagination'
import { TableEmptyState } from './TableEmptyState'
import { TableSkeleton } from './TableSkeleton'
import { TableBulkBar } from './TableBulkBar'
import { Square, CheckSquare } from './Checkbox'

export interface ColumnDef<T> {
  key: string
  label: React.ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  render: (item: T) => React.ReactNode
}

export interface ActionItem<T> {
  label: React.ReactNode
  icon?: React.ReactNode
  onClick: (item: T) => void
  danger?: boolean
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  keyExtractor: (item: T) => string
  isLoading?: boolean

  // Pagination
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void

  // Sorting
  sortKey?: string
  sortDir?: SortDir
  onSort?: (key: string) => void

  // Selection
  selectedIds?: Set<string>
  onToggleSelectAll?: () => void
  onToggleSelect?: (id: string) => void
  bulkActions?: React.ReactNode

  // Row Actions
  rowActions?: ActionItem<T>[] | ((item: T) => ActionItem<T>[])

  // Empty State
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  currentPage,
  totalPages,
  onPageChange,
  sortKey,
  sortDir,
  onSort,
  selectedIds,
  onToggleSelectAll,
  onToggleSelect,
  bulkActions,
  rowActions,
  emptyIcon,
  emptyTitle = 'No records found',
  emptyDescription,
}: DataTableProps<T>) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const hasSelection = !!selectedIds && !!onToggleSelectAll && !!onToggleSelect
  const allSelected = data.length > 0 && data.every((item) => selectedIds?.has(keyExtractor(item)))
  const totalColSpan = columns.length + (hasSelection ? 1 : 0) + (rowActions ? 1 : 0)

  return (
    <>
      {hasSelection && selectedIds!.size > 0 && bulkActions && (
        <TableBulkBar selectedCount={selectedIds!.size} actions={bulkActions} />
      )}

      <div className="table-wrapper">
        <div className="table-container">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  borderBottom: '2px solid var(--border)',
                }}
              >
                {hasSelection && (
                  <th style={{ padding: '13px 8px 13px 20px', width: '44px' }}>
                    <button
                      onClick={onToggleSelectAll}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {allSelected ? (
                        <CheckSquare size={17} color="var(--accent)" />
                      ) : (
                        <Square size={17} />
                      )}
                    </button>
                  </th>
                )}
                {columns.map((col) => (
                  <SortHeader
                    key={col.key}
                    label={col.label}
                    sortKey={col.key}
                    currentSortKey={sortKey}
                    currentSortDir={sortDir}
                    onSort={col.sortable ? onSort : undefined}
                    align={col.align}
                    width={col.width}
                  />
                ))}
                {rowActions && (
                  <th style={{ padding: '13px 16px', width: '44px', cursor: 'default' }} />
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableSkeleton columns={totalColSpan} rows={5} />
              ) : data.length === 0 ? (
                <TableEmptyState
                  colSpan={totalColSpan}
                  icon={emptyIcon}
                  title={emptyTitle}
                  description={emptyDescription}
                />
              ) : (
                data.map((item) => {
                  const id = keyExtractor(item)
                  const isSelected = hasSelection && selectedIds?.has(id)

                  return (
                    <tr
                      key={id}
                      className="table-row-hover"
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isSelected ? 'rgba(217,119,87,0.04)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {hasSelection && (
                        <td
                          style={{ padding: '14px 8px 14px 20px', cursor: 'pointer' }}
                          onClick={() => onToggleSelect!(id)}
                        >
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare size={17} color="var(--accent)" />
                            ) : (
                              <Square size={17} />
                            )}
                          </button>
                        </td>
                      )}

                      {columns.map((col) => (
                        <td
                          key={col.key}
                          style={{
                            padding: '14px 16px',
                            textAlign: col.align || 'left',
                          }}
                        >
                          {col.render(item)}
                        </td>
                      ))}

                      {rowActions && (
                        <td style={{ padding: '14px 12px', position: 'relative' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuId(openMenuId === id ? null : id)
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-muted)',
                              padding: '4px',
                              display: 'flex',
                              borderRadius: '6px',
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openMenuId === id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                background: 'var(--white)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                boxShadow: 'var(--shadow-lg)',
                                zIndex: 100,
                                minWidth: '160px',
                                overflow: 'hidden',
                              }}
                            >
                              {(typeof rowActions === 'function'
                                ? rowActions(item)
                                : rowActions
                              ).map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setOpenMenuId(null)
                                    action.onClick(item)
                                  }}
                                  className="dropdown-item"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '10px 14px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: action.danger
                                      ? 'var(--danger)'
                                      : 'var(--text-secondary)',
                                  }}
                                >
                                  {action.icon} {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          {currentPage !== undefined && totalPages !== undefined && onPageChange && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}
        </div>
      </div>
      <style>{`
        .dropdown-item:hover { background: var(--surface-hover) !important; }
        .table-row-hover:hover { background: var(--surface-hover) !important; }
      `}</style>
    </>
  )
}
