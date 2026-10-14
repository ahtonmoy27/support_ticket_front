import type { CSSProperties, HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
  count?: number
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const customStyle: CSSProperties = {
    ...style,
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  }

  const items = Array.from({ length: count }, (_, i) => i)

  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`skeleton skeleton-${variant} ${className}`.trim()}
          style={customStyle}
          {...props}
        />
      ))}
    </>
  )
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-scroll" aria-busy="true" aria-label="Loading table data">
      <table className="ticket-table skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}>
                <Skeleton variant="text" width={i === 0 ? '60%' : '80%'} height={14} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}>
                  <Skeleton
                    variant="text"
                    width={c === 0 ? '75%' : '50%'}
                    height={16}
                    style={{ marginBottom: 4 }}
                  />
                  {c === 0 && <Skeleton variant="text" width="40%" height={12} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-cards-grid" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="panel skeleton-card">
          <Skeleton variant="text" width="40%" height={14} style={{ marginBottom: 12 }} />
          <Skeleton variant="text" width="70%" height={28} style={{ marginBottom: 8 }} />
          <Skeleton variant="text" width="55%" height={12} />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton({ title = 'Loading...' }: { title?: string }) {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label={title}>
      <div className="page-heading">
        <div>
          <Skeleton variant="text" width={140} height={12} style={{ marginBottom: 8 }} />
          <Skeleton variant="text" width={220} height={28} style={{ marginBottom: 8 }} />
          <Skeleton variant="text" width={300} height={14} />
        </div>
        <div className="heading-actions">
          <Skeleton variant="rect" width={110} height={36} style={{ borderRadius: 8 }} />
        </div>
      </div>
      <CardSkeleton count={3} />
      <div style={{ marginTop: 24 }}>
        <TableSkeleton rows={4} cols={5} />
      </div>
    </div>
  )
}
