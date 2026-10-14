import { useCallback, useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  RefreshCw,
  X,
} from 'lucide-react'
import { ApiError } from '../lib/api'
import { date, errorText, label } from '../lib/utils'
import type { Page, Ticket } from '../types'

// ─── Button ──────────────────────────────────────────────────────────────────

export function Button({
  children,
  variant = 'primary',
  busy,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`button ${variant} ${className}`.trim()}
    >
      {busy && <LoaderCircle className="spin" size={16} aria-hidden="true" />}
      {children}
    </button>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

const SLA_LABELS: Record<string, string> = {
  within: 'within_sla',
  warning: 'approaching_breach',
  met: 'sla_met',
}

export function Badge({ value, type = '' }: { value: string; type?: string }) {
  return (
    <span className={`badge ${type} ${value}`.trim()}>
      <span className="badge-dot" aria-hidden="true" />
      {label(SLA_LABELS[value] ?? value)}
    </span>
  )
}

// ─── Field ────────────────────────────────────────────────────────────────────

export function Field({
  label: text,
  children,
  hint,
  error,
}: {
  label: string
  children: ReactNode
  hint?: string
  error?: string[]
}) {
  return (
    <label className="field">
      <span className="field-label">{text}</span>
      {children}
      {hint && <small>{hint}</small>}
      {error?.map((e) => (
        <small className="field-error" key={e}>
          {e}
        </small>
      ))}
    </label>
  )
}

// ─── FormErrors ───────────────────────────────────────────────────────────────

export function FormErrors({ error }: { error: unknown }) {
  if (!error) return null
  return (
    <div className="error-banner" role="alert">
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        {errorText(error)}
        {error instanceof ApiError && Object.keys(error.errors).length > 0 && (
          <ul>
            {Object.entries(error.errors).map(([key, messages]) => (
              <li key={key}>
                <strong>{label(key)}:</strong> {messages.join(' ')}
              </li>
            ))}
          </ul>
        )}
        {error instanceof ApiError && error.retryAfter && (
          <small>Try again after {error.retryAfter} seconds.</small>
        )}
      </div>
    </div>
  )
}

// ─── Loading ──────────────────────────────────────────────────────────────────

export function Loading({ label: text = 'Loading your workspace…' }: { label?: string }) {
  return (
    <div className="loading" role="status" aria-label={text}>
      <LoaderCircle size={24} className="spin" aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const status = error instanceof ApiError ? error.status : 0
  const title =
    status === 403 ? 'Access is restricted' : status === 404 ? 'Not found' : 'We could not load this'
  return (
    <div className="empty-state" role="alert">
      <span className="empty-icon">
        <AlertCircle size={28} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{errorText(error)}</p>
      <div className="actions">
        {retry && (
          <Button variant="secondary" onClick={retry}>
            <RefreshCw size={16} />
            Try again
          </Button>
        )}
        <Link className="button secondary" to="/tickets">
          Back to tickets
        </Link>
      </div>
    </div>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────

export function Empty({
  title = 'Nothing here yet',
  text,
  action,
}: {
  title?: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={28} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  back,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  back?: string
}) {
  return (
    <div className="page-heading">
      <div>
        {back && (
          <Link className="back-link" to={back}>
            <ArrowLeft size={14} />
            Back
          </Link>
        )}
        <div className="eyebrow">{eyebrow ?? 'YOUR SUPPORT WORKSPACE'}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="heading-actions">{action}</div>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function Pagination<T>({ page, change }: { page: Page<T>; change: (page: number) => void }) {
  const from = page.total === 0 ? 0 : (page.current - 1) * page.perPage + 1
  const to = Math.min(page.current * page.perPage, page.total)
  const rangeLabel = page.total === 0 ? 'No records' : `${from}–${to} of ${page.total}`

  return (
    <div className="pagination">
      <span>{rangeLabel}</span>
      <div>
        <Button
          variant="ghost"
          aria-label="Previous page"
          disabled={page.current <= 1}
          onClick={() => change(page.current - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span aria-live="polite">
          Page {page.current} of {page.last}
        </span>
        <Button
          variant="ghost"
          aria-label="Next page"
          disabled={page.current >= page.last}
          onClick={() => change(page.current + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  // Stable ID derived from title so aria-labelledby is predictable without useId
  const id = useRef(`modal-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`).current

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Close when clicking the backdrop (outside the dialog box)
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === ref.current) onClose()
    },
    [onClose],
  )

  return (
    <dialog ref={ref} aria-labelledby={id} className="modal" onCancel={onClose} onClick={handleClick}>
      <div className="modal-heading">
        <h2 id={id}>{title}</h2>
        <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
          <X size={18} />
        </Button>
      </div>
      {children}
    </dialog>
  )
}

// ─── TicketTable ──────────────────────────────────────────────────────────────

export function TicketTable({
  tickets,
  compact = false,
}: {
  tickets: Ticket[]
  compact?: boolean
}) {
  return (
    <div className="table-scroll">
      <table className="ticket-table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Status</th>
            <th>Priority</th>
            {!compact && <th>Assigned to</th>}
            <th>SLA / Due time</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>
                <Link to={`/tickets/${t.id}`} className="ticket-title">
                  <span className="ticket-number">{t.ticket_number}</span>
                  <strong>{t.subject}</strong>
                  <small>
                    {t.category?.name ?? `Category #${t.category_id}`} · {date(t.created_at, true)}
                  </small>
                </Link>
              </td>
              <td>
                <Badge value={t.status} />
              </td>
              <td>
                <Badge type="priority" value={t.priority} />
              </td>
              {!compact && (
                <td>
                  <span className="assignee">
                    {t.assigned_agent?.name ??
                      (t.assigned_agent_id ? `Agent #${t.assigned_agent_id}` : 'Unassigned')}
                  </span>
                </td>
              )}
              <td>
                <Badge value={t.sla_state} />
                <small className="cell-subtext">{date(t.sla_due_at)}</small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
