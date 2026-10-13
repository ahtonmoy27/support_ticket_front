import type { ApiPage, Page, Ticket, User } from '../types'
export function pageOf<T>(value: ApiPage<T>): Page<T> { const m = 'meta' in value ? value.meta : value; return { items: value.data, current: m.current_page, last: m.last_page, perPage: m.per_page, total: m.total } }
export function label(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase()) }
export function date(value?: string | null, short = false) { if (!value || !Number.isFinite(new Date(value).getTime())) return '—'; return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', ...(short ? {} : { timeStyle: 'short' as const }) }).format(new Date(value)) }
export function initials(name: string) { return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() }
export function permissions(user: User, ticket: Ticket) {
 const active = ['open', 'in_progress', 'waiting_for_customer'].includes(ticket.status)
 const admin = user.role === 'admin'; const assigned = user.role === 'agent' && ticket.assigned_agent_id === user.id; const owner = user.role === 'customer' && ticket.customer_id === user.id
 return { edit: user.is_active && active && (admin || assigned || owner), priority: active && (admin || assigned), reply: active && (admin || assigned || owner), note: active && (admin || assigned), resolve: active && (admin || assigned), close: ticket.status === 'resolved' && (admin || owner), assign: active && admin, claim: user.is_active && user.is_available && ticket.status === 'open' && ticket.assigned_agent_id === null && (admin || user.role === 'agent') }
}
export function validateFiles(files: File[]) { for (const file of files) { if (file.size > 10 * 1024 * 1024) return file.name + ' exceeds 10 MB.'; if (!/\.(pdf|png|jpe?g|txt|docx)$/i.test(file.name)) return file.name + ' has an unsupported file type.' } return null }
export function errorText(error: unknown) { return error instanceof Error ? ('status' in error && error.status === 419 ? 'Session token expired. Your input is preserved; please submit again.' : error.message) : 'Something went wrong. Please try again.' }

