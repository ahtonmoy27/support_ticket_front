import type { ApiPage, Page, Ticket, User } from '../types'

export function pageOf<T>(value: ApiPage<T>): Page<T> {
  const m = 'meta' in value ? value.meta : value
  return {
    items: value.data,
    current: m.current_page,
    last: m.last_page,
    perPage: m.per_page,
    total: m.total,
  }
}

/** Converts snake_case / underscore strings to Title Case */
export function label(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

/** Formats an ISO date string in Asia/Dhaka timezone.
 *  Returns '—' for null, undefined, or unparseable values. */
export function date(value?: string | null, short = false): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    ...(short ? {} : { timeStyle: 'short' as const }),
  }).format(new Date(value))
}

/** Returns up to two uppercase initials from a display name */
export function initials(name?: string | null): string {
  if (!name) return '—'
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '—'
  )
}

/** Derives the set of permitted actions for a given user acting on a ticket */
export function permissions(user: User, ticket: Ticket) {
  const active = ['open', 'in_progress', 'waiting_for_customer'].includes(ticket.status)
  const isAdmin = user.is_active && user.role === 'admin'
  const isAssignedAgent =
    user.is_active && user.role === 'agent' && ticket.assigned_agent_id === user.id
  const isOwner = user.is_active && user.role === 'customer' && ticket.customer_id === user.id
  return {
    edit: user.is_active && active && (isAdmin || isAssignedAgent || isOwner),
    priority: active && (isAdmin || isAssignedAgent),
    reply: active && (isAdmin || isAssignedAgent || isOwner),
    note: active && (isAdmin || isAssignedAgent),
    resolve: active && (isAdmin || isAssignedAgent),
    close: ticket.status === 'resolved' && (isAdmin || isOwner),
    assign: active && isAdmin,
    claim:
      user.is_active &&
      user.is_available &&
      ticket.status === 'open' &&
      ticket.assigned_agent_id === null &&
      (isAdmin || user.role === 'agent'),
  }
}

const ALLOWED_EXTENSIONS = /\.(pdf|png|jpe?g|txt|docx)$/i
const MAX_FILE_BYTES = 10 * 1024 * 1024

/** Returns an error message string or null when all files are valid */
export function validateFiles(files: File[]): string | null {
  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) return `${file.name} exceeds 10 MB.`
    if (!ALLOWED_EXTENSIONS.test(file.name)) return `${file.name} has an unsupported file type.`
  }
  return null
}

/** Extracts a user-friendly message from any thrown value */
export function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Something went wrong. Please try again.'
  if ('status' in error && (error as { status: number }).status === 419)
    return 'Session token expired. Your input is preserved; please submit again.'
  return error.message
}
